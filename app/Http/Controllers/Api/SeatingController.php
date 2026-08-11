<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invitation;
use App\Models\Seat;
use App\Models\SeatingTable;
use App\Services\SeatingService;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Request;

class SeatingController extends Controller
{
    public function __construct(private SeatingService $seating) {}

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
            'tables' => $tables,
            'unassigned' => $unassigned,
        ]);
    }

    public function storeTable(Request $request, Invitation $invitation)
    {
        $this->guard($request, $invitation);
        $data = $request->validate([
            'label' => ['required', 'string', 'max:60'],
            'shape' => ['nullable', 'in:round,rect'],
            'capacity' => ['nullable', 'integer', 'min:1', 'max:20'],
            'pos_x' => ['nullable', 'numeric'],
            'pos_y' => ['nullable', 'numeric'],
        ]);

        $count = $invitation->tables()->count();

        $table = $invitation->tables()->create([
            'label' => $data['label'],
            'shape' => $data['shape'] ?? 'round',
            'capacity' => $data['capacity'] ?? 8,
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
            'capacity' => ['sometimes', 'integer', 'min:1', 'max:20'],
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

        return response()->json(['ok' => true, 'seated' => $seatIds->count(), 'pax' => $pax]);
    }

    /** Unassign frees the WHOLE party of the guest occupying the clicked seat. */
    public function unassignSeat(Request $request, Seat $seat)
    {
        $invitation = $seat->table->invitation;
        $this->guard($request, $invitation);

        if ($seat->rsvp_guest_id) {
            Seat::whereHas('table', fn ($q) => $q->where('invitation_id', $invitation->id))
                ->where('rsvp_guest_id', $seat->rsvp_guest_id)
                ->update(['rsvp_guest_id' => null]);
        } else {
            $seat->update(['rsvp_guest_id' => null]);
        }

        return response()->json(['ok' => true]);
    }

    public function autoAssign(Request $request, Invitation $invitation)
    {
        $this->guard($request, $invitation);
        $count = $this->seating->autoAssignAll($invitation);

        return response()->json(['ok' => true, 'assigned' => $count]);
    }

    public function clear(Request $request, Invitation $invitation)
    {
        $this->guard($request, $invitation);
        Seat::whereHas('table', fn ($q) => $q->where('invitation_id', $invitation->id))
            ->update(['rsvp_guest_id' => null]);

        return response()->json(['ok' => true]);
    }

    private function guard(Request $request, Invitation $invitation): void
    {
        $user = $request->user();

        abort_unless(
            $invitation->user_id === $user->id || $user->isAdmin(),
            403, 'Bukan kad anda.'
        );

        // Table management (susun atur meja) is a Premium feature. Free plans keep
        // full RSVP + guest list, but seating requires an upgrade.
        if (! $user->isPremium() && ! $user->isAdmin()) {
            throw new HttpResponseException(response()->json([
                'message' => 'Pengurusan susun atur meja tersedia untuk pelan Premium. Sila naik taraf untuk menggunakannya.',
                'requires_upgrade' => true,
            ], 403));
        }
    }
}
