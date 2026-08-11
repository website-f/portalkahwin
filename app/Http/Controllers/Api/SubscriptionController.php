<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RsvpGuest;
use App\Models\Setting;
use Illuminate\Http\Request;

class SubscriptionController extends Controller
{
    /** The signed-in user's plan, usage and limits (for the My Subscription page). */
    public function show(Request $request)
    {
        $user = $request->user();
        $premium = $user->isPremium();

        $cards = $user->invitations()->count();
        $published = $user->invitations()->where('status', 'published')->count();
        $rsvps = RsvpGuest::whereIn('invitation_id', $user->invitations()->pluck('id'))->count();

        $cardLimit = $premium ? 0 : (int) Setting::get('free_card_limit', 1);        // 0 = unlimited
        $guestLimit = $premium ? (int) Setting::get('premium_guest_limit', 0) : (int) Setting::get('free_guest_limit', 30);

        return response()->json([
            'plan' => $premium ? 'premium' : 'free',
            'plan_expires_at' => $user->plan_expires_at,
            'premium_price_myr' => (float) Setting::get('premium_price_myr', 59),
            'usage' => [
                'cards' => $cards,
                'published' => $published,
                'rsvps' => $rsvps,
            ],
            'limits' => [
                'cards' => $cardLimit,       // 0 = unlimited
                'guests' => $guestLimit,     // 0 = unlimited
            ],
            'features' => [
                ['key' => 'templates_premium', 'label' => 'Rekaan premium (Grand Reveal, Khat, Songket)', 'enabled' => $premium],
                ['key' => 'seating', 'label' => 'Susunan meja dengan agihan automatik', 'enabled' => $premium],
                ['key' => 'qr_checkin', 'label' => 'Daftar masuk QR', 'enabled' => $premium],
                ['key' => 'salam_kaut', 'label' => 'Salam Kasih tanpa had', 'enabled' => $premium],
                ['key' => 'no_watermark', 'label' => 'Tanpa tanda air', 'enabled' => $premium],
                ['key' => 'rsvp', 'label' => 'RSVP & buku doa', 'enabled' => true],
            ],
        ]);
    }
}
