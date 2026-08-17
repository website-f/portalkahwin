<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invitation;
use App\Models\Seat;
use App\Models\SeatingTable;
use App\Models\VenueProp;
use App\Services\SeatingService;
use App\Services\SeatNotifier;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SeatingController extends Controller
{
    public function __construct(
        private SeatingService $seating,
        private SeatNotifier $notifier,
    ) {}

    /**
     * PUBLIC — the whole floorplan, read-only, opened from the link in a guest's
     * RSVP email. The guest id is an unguessable UUID that must belong to the
     * slug's card, so a link only ever works for the guest it was issued to.
     *
     * We return ALL tables (so the guest can see the full layout and where their
     * table sits) but highlight only their own table via `my_table_id`. Whether
     * OTHER guests' names are shown is the HOST's choice, per card: when private,
     * occupied seats come back as `occupied` with a null name (only the guest's
     * own name is ever revealed).
     */
    public function guestView(string $slug, string $guestId)
    {
        $invitation = Invitation::with('user')
            ->where('slug', $slug)
            ->where('status', 'published')
            ->firstOrFail();

        $guest = $invitation->guests()->whereKey($guestId)->firstOrFail();

        // Host privacy toggle: ON (true) → hide other guests' names in the view.
        $namesVisible = ! $invitation->seat_names_private;

        $payload = [
            // Seating is admin-gated per role — a host without the feature has no floorplan to show.
            'enabled' => (bool) $invitation->user?->hasFeature('seating'),
            'names_visible' => $namesVisible,
            'guest' => [
                'name' => $guest->name,
                'pax' => (int) $guest->pax,
                'status' => $guest->status,
            ],
            'invitation' => [
                'slug' => $invitation->slug,
                'bride_name' => $invitation->bride_name,
                'groom_name' => $invitation->groom_name,
                'date_label' => $invitation->date_label,
                'time_label' => $invitation->time_label,
                'venue_name' => $invitation->venue_name,
            ],
            // Vendor branding on the seating page a guest is handed at the door.
            // Gated on the same capability as the card, so a normal user's plan
            // never surfaces a company block they are not entitled to.
            'host' => $invitation->user?->canUseCompanyBranding() ? [
                'company_name' => $invitation->user->company_name,
                'company_logo' => $invitation->user->company_logo,
            ] : null,
            'my_table_id' => null,
            'tables' => [],
            'props' => [],
        ];

        if (! $payload['enabled']) {
            return response()->json($payload);
        }

        $own = Seat::whereHas('table', fn ($q) => $q->where('invitation_id', $invitation->id))
            ->where('rsvp_guest_id', $guest->id)
            ->orderBy('seat_index')
            ->first();

        // Not seated yet — the host may still be arranging. The page says so and polls.
        if (! $own) {
            return response()->json($payload);
        }

        $payload['my_table_id'] = $own->seating_table_id;

        // The room, not just the tables: without the pelamin and the entrance a
        // guest has no way to orient themselves in the plan.
        $payload['props'] = $invitation->props()->get(['id', 'kind', 'label', 'pos_x', 'pos_y', 'width', 'height', 'rotation']);

        $payload['tables'] = $invitation->tables()
            ->with(['seats.guest:id,name'])
            ->orderBy('sort')
            ->get()
            ->map(fn ($t) => [
                'id' => $t->id,
                'label' => $t->label,
                'shape' => $t->shape,
                'capacity' => (int) $t->capacity,
                'pos_x' => $t->pos_x,
                'pos_y' => $t->pos_y,
                'seats' => $t->seats->sortBy('seat_index')->map(function ($s) use ($guest, $namesVisible) {
                    $isYou = $s->rsvp_guest_id === $guest->id;
                    $occupied = $s->rsvp_guest_id !== null;

                    return [
                        'seat_index' => (int) $s->seat_index,
                        // Only ever reveal a name for the guest themselves, or for
                        // everyone when the host hasn't switched on name privacy.
                        'name' => $occupied && ($isYou || $namesVisible) ? $s->guest?->name : null,
                        'is_you' => $isYou,
                        'occupied' => $occupied,
                    ];
                })->values(),
            ]);

        return response()->json($payload);
    }

    /**
     * CSV of the seating plan, one row per occupied seat, table order preserved.
     *
     * The board itself is a canvas — fine on screen, useless to a banquet manager
     * who wants a list to work from on the day. Empty seats are included so the
     * printed sheet shows the gaps rather than silently renumbering around them.
     */
    public function export(Request $request, Invitation $invitation): StreamedResponse
    {
        $this->guard($request, $invitation);

        $tables = $invitation->tables()->with(['seats.guest:id,name,phone,pax'])->orderBy('sort')->get();
        $couple = trim(($invitation->bride_name ?? '').' & '.($invitation->groom_name ?? ''), ' &');
        $filename = 'susun-meja-'.$invitation->slug.'.csv';

        return response()->streamDownload(function () use ($tables, $couple) {
            $out = fopen('php://output', 'w');
            // UTF-8 BOM so Excel renders Malay/Chinese names correctly.
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, [$couple]);
            fputcsv($out, []);
            fputcsv($out, ['Meja', 'Bentuk', 'Kerusi', 'Nama Tetamu', 'Telefon', 'Bilangan']);

            foreach ($tables as $table) {
                foreach ($table->seats->sortBy('seat_index') as $seat) {
                    fputcsv($out, [
                        $table->label,
                        $table->shape === 'round' ? 'Bulat' : 'Segi empat',
                        $seat->seat_index + 1,
                        $seat->guest?->name ?? '(kosong)',
                        $seat->guest?->phone ?? '',
                        $seat->guest?->pax ?? '',
                    ]);
                }
            }
            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv']);
    }

    /** Full floorplan state for the seating board. */
    public function show(Request $request, Invitation $invitation)
    {
        $this->guard($request, $invitation);

        $tables = $invitation->tables()->with(['seats.guest:id,name,pax'])->get()->map(fn ($t) => [
            'id' => $t->id,
            'label' => $t->label,
            'shape' => $t->shape,
            'capacity' => $t->capacity,
            'pos_x' => $t->pos_x,
            'pos_y' => $t->pos_y,
            'seats' => $t->seats->map(fn ($s) => [
                'id' => $s->id,
                'seat_index' => $s->seat_index,
                'guest' => $s->guest ? ['id' => $s->guest->id, 'name' => $s->guest->name, 'pax' => $s->guest->pax] : null,
            ]),
        ]);

        $seatedIds = Seat::whereHas('table', fn ($q) => $q->where('invitation_id', $invitation->id))
            ->whereNotNull('rsvp_guest_id')->pluck('rsvp_guest_id')->unique();

        $unassigned = $invitation->guests()
            ->where('status', 'attending')
            ->whereNotIn('id', $seatedIds)
            ->orderBy('name')
            ->get(['id', 'name', 'pax']);

        return response()->json([
            'auto_seat' => (bool) $invitation->auto_seat,
            'seat_names_private' => (bool) $invitation->seat_names_private,
            // Flexible headcount cap for hosts who don't lay out tables, plus the
            // live capacity/taken so the board can show "12 of 40 seats taken".
            'seat_limit' => $invitation->seat_limit,
            'capacity' => $invitation->seatCapacity(),
            'taken' => $invitation->seatsTaken(),
            'has_tables' => $tables->isNotEmpty(),
            'tables' => $tables,
            'props' => $invitation->props()->get(['id', 'kind', 'label', 'pos_x', 'pos_y', 'width', 'height', 'rotation']),
            'unassigned' => $unassigned,
        ]);
    }

    public function storeTable(Request $request, Invitation $invitation)
    {
        $this->guard($request, $invitation);
        $data = $request->validate([
            'label' => ['required', 'string', 'max:60'],
            'shape' => ['nullable', 'in:round,rect'],
            'capacity' => ['nullable', 'integer', 'min:1', 'max:'.\App\Models\Setting::maxTableCapacity()],
            'pos_x' => ['nullable', 'numeric'],
            'pos_y' => ['nullable', 'numeric'],
        ]);

        $count = $invitation->tables()->count();

        $table = $invitation->tables()->create([
            'label' => $data['label'],
            'shape' => $data['shape'] ?? 'round',
            'capacity' => $data['capacity'] ?? \App\Models\Setting::defaultTableCapacity(),
            // Stagger new tables in a grid so they don't stack on top of each other.
            'pos_x' => $data['pos_x'] ?? (70 + ($count % 4) * 220),
            'pos_y' => $data['pos_y'] ?? (70 + intdiv($count, 4) * 230),
            'sort' => $count,
        ]);
        $table->syncSeats();

        return response()->json($table->load('seats'), 201);
    }

    public function updateTable(Request $request, SeatingTable $table)
    {
        $this->guard($request, $table->invitation);
        $data = $request->validate([
            'label' => ['sometimes', 'string', 'max:60'],
            'shape' => ['sometimes', 'in:round,rect'],
            'capacity' => ['sometimes', 'integer', 'min:1', 'max:'.\App\Models\Setting::maxTableCapacity()],
            'pos_x' => ['sometimes', 'numeric'],
            'pos_y' => ['sometimes', 'numeric'],
        ]);

        $table->update($data);
        if (array_key_exists('capacity', $data)) {
            $table->syncSeats();
        }

        return response()->json($table->load('seats'));
    }

    public function destroyTable(Request $request, SeatingTable $table)
    {
        $this->guard($request, $table->invitation);
        $table->delete();

        return response()->json(['ok' => true]);
    }

    /**
     * Assign a guest's WHOLE party to the clicked seat's table.
     * A guest with pax N occupies N seats (the clicked seat first, then the next
     * free seats at that table). Any previous seats of the guest are freed first,
     * so a guest is always either fully placed or fully unplaced.
     */
    public function assignSeat(Request $request, Seat $seat)
    {
        $invitation = $seat->table->invitation;
        $this->guard($request, $invitation);

        $data = $request->validate([
            'rsvp_guest_id' => ['required', 'uuid', 'exists:rsvp_guests,id'],
        ]);

        $guest = $invitation->guests()->whereKey($data['rsvp_guest_id'])->first();
        abort_unless($guest, 422, 'Tetamu bukan milik kad ini.');

        $pax = max(1, (int) $guest->pax);
        $tableId = $seat->seating_table_id;

        // Move the whole party: release all of the guest's current seats first.
        Seat::whereHas('table', fn ($q) => $q->where('invitation_id', $invitation->id))
            ->where('rsvp_guest_id', $guest->id)
            ->update(['rsvp_guest_id' => null]);

        // Fill `pax` free seats at the clicked table first (clicked seat first). If the
        // clicked table is too small for the whole party, overflow to the other tables
        // (most-free first) so the guest is always FULLY seated, never partially.
        $seatIds = Seat::where('seating_table_id', $tableId)
            ->whereNull('rsvp_guest_id')
            ->orderByRaw('CASE WHEN id = ? THEN 0 ELSE 1 END', [$seat->id])
            ->orderBy('seat_index')
            ->limit($pax)
            ->pluck('id');

        if ($seatIds->count() < $pax) {
            $remaining = $pax - $seatIds->count();
            // Rank other tables by how many free seats they have (most first).
            $freeByTable = Seat::whereHas('table', fn ($q) => $q->where('invitation_id', $invitation->id))
                ->whereNull('rsvp_guest_id')
                ->where('seating_table_id', '!=', $tableId)
                ->get(['id', 'seating_table_id', 'seat_index'])
                ->groupBy('seating_table_id')
                ->sortByDesc(fn ($seats) => $seats->count());

            foreach ($freeByTable as $seats) {
                foreach ($seats->sortBy('seat_index') as $s) {
                    if ($remaining <= 0) {
                        break 2;
                    }
                    $seatIds->push($s->id);
                    $remaining--;
                }
            }
        }

        Seat::whereIn('id', $seatIds)->update(['rsvp_guest_id' => $guest->id]);

        // Tell them where they are sitting — no-ops unless this table is news to them.
        $notified = $this->notifier->notify($invitation, $guest->fresh());

        return response()->json([
            'ok' => true,
            'seated' => $seatIds->count(),
            'pax' => $pax,
            'notified' => $notified,
        ]);
    }

    /** Unassign frees the WHOLE party of the guest occupying the clicked seat. */
    public function unassignSeat(Request $request, Seat $seat)
    {
        $invitation = $seat->table->invitation;
        $this->guard($request, $invitation);

        if ($seat->rsvp_guest_id) {
            $guest = $invitation->guests()->find($seat->rsvp_guest_id);
            Seat::whereHas('table', fn ($q) => $q->where('invitation_id', $invitation->id))
                ->where('rsvp_guest_id', $seat->rsvp_guest_id)
                ->update(['rsvp_guest_id' => null]);
            // Unseating resets the record of what they were told, so putting them back
            // at the same table later still counts as news worth emailing.
            if ($guest) {
                $this->notifier->forget($guest);
            }
        } else {
            $seat->update(['rsvp_guest_id' => null]);
        }

        return response()->json(['ok' => true]);
    }

    public function autoAssign(Request $request, Invitation $invitation)
    {
        $this->guard($request, $invitation);
        $count = $this->seating->autoAssignAll($invitation);
        $notified = $this->notifier->notifyAll($invitation);

        return response()->json(['ok' => true, 'assigned' => $count, 'notified' => $notified]);
    }

    public function clear(Request $request, Invitation $invitation)
    {
        $this->guard($request, $invitation);
        Seat::whereHas('table', fn ($q) => $q->where('invitation_id', $invitation->id))
            ->update(['rsvp_guest_id' => null]);
        $invitation->guests()->update(['seat_notified_table_id' => null, 'seat_notified_at' => null]);

        return response()->json(['ok' => true]);
    }

    private function guard(Request $request, Invitation $invitation): void
    {
        $user = $request->user();

        abort_unless(
            $invitation->user_id === $user->id || $user->isAdmin(),
            403, 'Bukan kad anda.'
        );

        // Table management is a subscription capability. Which roles get it is an
        // admin setting, not a constant — see Setting::featureDefaults().
        if (! $user->hasFeature('seating')) {
            throw new HttpResponseException(response()->json([
                'message' => 'Pengurusan susun atur meja tersedia untuk akaun Vendor dan Affiliate.',
                'requires_upgrade' => true,
                'feature' => 'seating',
            ], 403));
        }
    }

    /* ---------------------------------------------------------------- *
     * Venue props — the room around the tables
     * ---------------------------------------------------------------- */

    public function storeProp(Request $request, Invitation $invitation)
    {
        $this->guard($request, $invitation);

        $data = $request->validate([
            'kind' => ['required', 'string', Rule::in(array_keys(VenueProp::KINDS))],
            'label' => ['nullable', 'string', 'max:60'],
            'pos_x' => ['nullable', 'numeric'],
            'pos_y' => ['nullable', 'numeric'],
        ]);

        [$label, $w, $h] = VenueProp::KINDS[$data['kind']];
        $count = $invitation->props()->count();

        $prop = $invitation->props()->create([
            'kind' => $data['kind'],
            // `label` is optional, so it may be absent entirely — not just empty.
            'label' => ($data['label'] ?? null) ?: $label,
            // Stagger new props so they never land exactly on top of each other.
            'pos_x' => $data['pos_x'] ?? (60 + ($count % 3) * 260),
            'pos_y' => $data['pos_y'] ?? (60 + intdiv($count, 3) * 170),
            'width' => $w,
            'height' => $h,
            'sort' => $count,
        ]);

        return response()->json($prop, 201);
    }

    public function updateProp(Request $request, VenueProp $prop)
    {
        $this->guard($request, $prop->invitation);

        $data = $request->validate([
            'label' => ['sometimes', 'string', 'max:60'],
            'pos_x' => ['sometimes', 'numeric'],
            'pos_y' => ['sometimes', 'numeric'],
            'width' => ['sometimes', 'integer', 'min:40', 'max:900'],
            'height' => ['sometimes', 'integer', 'min:40', 'max:900'],
            'rotation' => ['sometimes', 'integer', 'min:0', 'max:359'],
        ]);

        $prop->update($data);

        return response()->json($prop->fresh());
    }

    public function destroyProp(Request $request, VenueProp $prop)
    {
        $this->guard($request, $prop->invitation);
        $prop->delete();

        return response()->json(['ok' => true]);
    }

    /**
     * Host-level privacy switch: hide other guests' names in the guest-facing
     * seating view. It lives with the host, not the platform — whose names a
     * couple is comfortable showing is their call, not an admin's.
     */
    public function setPrivacy(Request $request, Invitation $invitation)
    {
        $this->guard($request, $invitation);

        $data = $request->validate(['seat_names_private' => ['required', 'boolean']]);
        $invitation->update($data);

        return response()->json(['seat_names_private' => (bool) $invitation->seat_names_private]);
    }
}
