<?php

namespace App\Services;

use App\Models\Invitation;
use App\Models\RsvpGuest;
use App\Models\Seat;

class SeatingService
{
    /** Assign a guest's party (pax seats) to free seats, preferring a single table. */
    public function assignGuestToFreeSeats(Invitation $inv, RsvpGuest $guest): int
    {
        $need = max(1, (int) $guest->pax);
        $tables = $inv->tables()->with('seats')->get();

        $freeByTable = $tables->mapWithKeys(
            fn ($t) => [$t->id => $t->seats->whereNull('rsvp_guest_id')->values()]
        );

        // Prefer a single table that fits the whole party; else fall back to most-free first.
        $chosen = $tables->first(fn ($t) => $freeByTable[$t->id]->count() >= $need);
        $order = $chosen
            ? collect([$chosen->id])->merge($tables->pluck('id')->reject(fn ($id) => $id === $chosen->id))
            : $tables->sortByDesc(fn ($t) => $freeByTable[$t->id]->count())->pluck('id');

        $assigned = 0;
        foreach ($order as $tid) {
            foreach ($freeByTable[$tid] as $seat) {
                if ($assigned >= $need) {
                    break;
                }
                $seat->update(['rsvp_guest_id' => $guest->id]);
                $assigned++;
            }
            if ($assigned >= $need) {
                break;
            }
        }

        return $assigned;
    }

    /** Auto-assign every attending, not-yet-seated guest (largest parties first). */
    public function autoAssignAll(Invitation $inv): int
    {
        $seatedIds = Seat::whereHas('table', fn ($q) => $q->where('invitation_id', $inv->id))
            ->whereNotNull('rsvp_guest_id')->pluck('rsvp_guest_id')->unique();

        $guests = $inv->guests()
            ->where('status', 'attending')
            ->whereNotIn('id', $seatedIds)
            ->orderByDesc('pax')->get();

        $total = 0;
        foreach ($guests as $g) {
            $total += $this->assignGuestToFreeSeats($inv, $g);
        }

        return $total;
    }
}
