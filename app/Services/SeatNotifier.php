<?php

namespace App\Services;

use App\Mail\SeatAssigned;
use App\Models\Invitation;
use App\Models\RsvpGuest;
use App\Models\Seat;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Owns everything about telling a guest where they are sitting: how their seat
 * reads, the link to their table, and whether that news is worth an email yet.
 *
 * Hosts seat people long after the RSVPs land, and they redraw the floorplan
 * repeatedly while doing it. So a guest is emailed only when they land at a
 * table they have not already been told about — dragging someone between chairs
 * at the same table stays silent.
 */
class SeatNotifier
{
    /** The table a guest currently occupies (their lowest-indexed seat), or null. */
    public function primaryTableId(Invitation $inv, RsvpGuest $guest): ?string
    {
        return Seat::whereHas('table', fn ($q) => $q->where('invitation_id', $inv->id))
            ->where('rsvp_guest_id', $guest->id)
            ->orderBy('seat_index')
            ->value('seating_table_id');
    }

    /** Human-readable seat location, e.g. "Meja 2 (kerusi 3, 4)" — null if unseated. */
    public function seatLabel(Invitation $inv, RsvpGuest $guest): ?string
    {
        $seats = Seat::with('table:id,label')
            ->whereHas('table', fn ($q) => $q->where('invitation_id', $inv->id))
            ->where('rsvp_guest_id', $guest->id)
            ->orderBy('seat_index')
            ->get();

        if ($seats->isEmpty()) {
            return null;
        }

        $label = optional($seats->first()->table)->label ?? 'Meja';
        $nums = $seats->map(fn ($s) => $s->seat_index + 1)->implode(', ');

        return "{$label} (kerusi {$nums})";
    }

    /**
     * Link to the guest's own table view — only for hosts on a paid plan, since
     * seating is a paid feature. Issued even when the guest has no seat yet: the
     * page handles that state, so one link stays valid until the big day.
     */
    public function seatUrl(Invitation $inv, RsvpGuest $guest): ?string
    {
        // No seating capability => no table, so never advertise one. This is what
        // keeps table talk out of a normal user's RSVP confirmation entirely.
        if (! $inv->user?->hasFeature('seating')) {
            return null;
        }

        return rtrim(config('app.url'), '/')."/e/{$inv->slug}/meja/{$guest->id}";
    }

    /** Record the guest's current table as already communicated. */
    public function markNotified(RsvpGuest $guest, ?string $tableId): void
    {
        $guest->forceFill([
            'seat_notified_table_id' => $tableId,
            'seat_notified_at' => $tableId ? now() : null,
        ])->save();
    }

    /** Forget what a guest was told, so re-seating them notifies again. */
    public function forget(RsvpGuest $guest): void
    {
        $this->markNotified($guest, null);
    }

    /**
     * Email one guest that their table is ready, if that is genuinely new to them.
     * Returns whether a message was actually sent.
     */
    public function notify(Invitation $inv, RsvpGuest $guest): bool
    {
        if (blank($guest->email) || $guest->status !== 'attending') {
            return false;
        }

        if (! $inv->user?->hasFeature('seating')) {
            return false;
        }

        $url = $this->seatUrl($inv, $guest);
        if (! $url) {
            return false; // free host — seating isn't part of their plan
        }

        $tableId = $this->primaryTableId($inv, $guest);
        if (! $tableId || $tableId === $guest->seat_notified_table_id) {
            return false;
        }

        try {
            Mail::to($guest->email)->send(
                new SeatAssigned($guest, $inv, $this->seatLabel($inv, $guest) ?? '', $url)
            );
        } catch (\Throwable $e) {
            // Never let a bad address abort the host's seating action.
            report($e);

            return false;
        }

        $this->markNotified($guest, $tableId);

        Log::info('Seat assignment emailed', [
            'guest_id' => $guest->id,
            'email' => $guest->email,
            'invitation' => $inv->slug,
            'table_id' => $tableId,
        ]);

        return true;
    }

    /** Notify every attending guest whose table changed. Returns how many were sent. */
    public function notifyAll(Invitation $inv): int
    {
        $guests = $inv->guests()
            ->where('status', 'attending')
            ->whereNotNull('email')
            ->where('email', '!=', '')
            ->get();

        return $guests->reduce(fn (int $sent, RsvpGuest $g) => $sent + (int) $this->notify($inv, $g), 0);
    }
}
