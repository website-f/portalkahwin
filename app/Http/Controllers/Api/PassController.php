<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EntryPayment;
use App\Models\RsvpGuest;

/**
 * PUBLIC — a paid guest's own expiring QR entry pass, opened from the link in
 * their confirmation email at /pass/{token}. The token is the credential; once
 * past its expiry (event date + grace) the scheduled cleanup nulls it and this
 * returns "expired".
 */
class PassController extends Controller
{
    public function show(string $token)
    {
        $guest = RsvpGuest::where('pass_token', $token)->with('invitation.user')->first();
        if (! $guest || ! $guest->invitation) {
            return response()->json(['found' => false], 404);
        }

        $invitation = $guest->invitation;
        $expired = $guest->pass_expires_at !== null && $guest->pass_expires_at->isPast();
        $payment = EntryPayment::where('guest_id', $guest->id)->where('status', 'paid')->latest()->first();

        $a = $invitation->groom_short ?: $invitation->groom_name;
        $b = $invitation->bride_short ?: $invitation->bride_name;

        return response()->json([
            'found' => true,
            'expired' => $expired,
            'guest' => [
                'name' => $guest->name,
                'pax' => (int) $guest->pax,
                'attended' => (bool) $guest->attended,
            ],
            // Same payload the owner's check-in scanner reads, so a vendor can scan
            // this pass at the door with the existing scanner.
            'qr' => 'PKG:'.$guest->id,
            'event' => [
                'slug' => $invitation->slug,
                'coupleName' => trim(trim((string) $a).' & '.trim((string) $b), ' &'),
                'dateLabel' => $invitation->date_label,
                'timeLabel' => $invitation->time_label,
                'venueName' => $invitation->venue_name,
                'venueAddress' => $invitation->venue_address,
                'mapsUrl' => $invitation->maps_url,
                'receptionAt' => optional($invitation->reception_at)->toIso8601String(),
                'companyName' => $invitation->user?->company_name,
            ],
            'amountPaid' => $payment ? (float) $payment->amount : null,
            'reference' => $payment?->reference,
            'expiresAt' => optional($guest->pass_expires_at)->toIso8601String(),
        ]);
    }
}
