<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invitation;
use App\Models\Seat;
use App\Models\SeatingTable;
use App\Services\SeatingService;
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

    /** Assign a guest to a seat (moves them off any previous seat first). */
    public function assignSeat(Request $request, Seat $seat)
    {
        $invitation = $seat->table->invitation;
        $this->guard($request, $invitation);

        $data = $request->validate([
            'rsvp_guest_id' => ['required', 'uuid', 'exists:rsvp_guests,id'],
        ]);

        // Ensure the guest belongs to this invitation.
        abort_unless(
            $invitation->guests()->whereKey($data['rsvp_guest_id'])->exists(),
            422, 'Tetamu bukan milik kad ini.'
        );

        Seat::whereHas('table', fn ($q) => $q->where('invitation_id', $invitation->id))
            ->where('rsvp_guest_id', $data['rsvp_guest_id'])
            ->update(['rsvp_guest_id' => null]);

        $seat->update(['rsvp_guest_id' => $data['rsvp_guest_id']]);

        return response()->json(['ok' => true]);
    }

    public function unassignSeat(Request $request, Seat $seat)
    {
        $this->guard($request, $seat->table->invitation);
        $seat->update(['rsvp_guest_id' => null]);

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
        abort_unless(
            $invitation->user_id === $request->user()->id || $request->user()->isAdmin(),
            403, 'Bukan kad anda.'
        );
    }
}
