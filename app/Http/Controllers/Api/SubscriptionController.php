<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Package;
use App\Models\RsvpGuest;
use App\Models\Setting;
use Illuminate\Http\Request;

class SubscriptionController extends Controller
{
    /** Plain-language fallback names for the gating keys (frontend supplies trilingual). */
    private const FEATURE_LABELS = [
        'seating' => 'Susunan meja + agihan automatik',
        'checkin' => 'Daftar masuk QR',
        'qr_passes' => 'Pas QR tetamu',
        'company_branding' => 'Penjenamaan syarikat (logo & profil)',
        'designer' => 'Reka bentuk kad sendiri',
    ];

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
            'features' => $this->featureState($user),
        ]);
    }

    /**
     * The REAL capability set for this account — mirrors User::hasFeature() (the
     * admin role matrix + any active plan/add-on entitlements), so this panel says
     * exactly what the app actually unlocks. `enabled` is the live gate; for a
     * locked feature, `purchasable` is true when an admin actually sells a
     * package to this role that would unlock it (so the UI can point there
     * instead of showing a dead "Premium" badge for something never on offer).
     */
    private function featureState($user): array
    {
        $role = $user->role ?? 'user';

        // Feature keys any active, role-eligible package would grant.
        $sellable = Package::where('is_active', true)->get()
            ->filter(fn (Package $p) => $p->allowsRole($role))
            ->flatMap(fn (Package $p) => (array) ($p->feature_keys ?? []))
            ->unique()->all();

        return array_map(function (string $f) use ($user, $sellable) {
            $enabled = $user->hasFeature($f);

            return [
                'key' => $f,
                'label' => self::FEATURE_LABELS[$f] ?? $f,
                'enabled' => $enabled,
                'purchasable' => ! $enabled && in_array($f, $sellable, true),
            ];
        }, Setting::FEATURES);
    }
}
