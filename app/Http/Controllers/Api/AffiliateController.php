<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AffiliatePayout;
use App\Models\User;
use App\Services\AffiliatePayoutReceipt;
use Illuminate\Http\Request;

class AffiliateController extends Controller
{
    /** The signed-in affiliate's own commission payouts (recorded releases). */
    public function payouts(Request $request)
    {
        return AffiliatePayout::where('affiliate_id', $request->user()->id)->latest()->limit(200)->get();
    }

    /** Download the affiliate's own commission-payout receipt (shows their code). */
    public function payoutReceipt(Request $request, AffiliatePayout $payout)
    {
        abort_unless($payout->affiliate_id === $request->user()->id, 403);

        return AffiliatePayoutReceipt::download($payout);
    }

    /** The signed-in affiliate's own referral link + the sales they've driven. */
    public function mine(Request $request)
    {
        $user = $request->user();
        $code = $user->isAffiliate() ? $user->ensureReferralCode() : ($user->referral_code ?? '');
        $url = $code ? rtrim(config('app.url'), '/').'/register-new-user?ref='.$code : '';

        return response()->json(array_merge(
            ['referral_code' => $code, 'referral_url' => $url],
            $user->affiliateStats(),
        ));
    }

    /** ADMIN — every affiliate with the sales their referrals generated. */
    public function adminIndex()
    {
        return User::where('role', 'affiliate')
            ->orderBy('name')
            ->get()
            ->map(fn (User $a) => array_merge([
                'id' => $a->id,
                'name' => $a->name,
                'email' => $a->email,
                'status' => $a->status,
                'referral_code' => $a->referral_code,
            ], $a->affiliateStats()))
            ->values();
    }
}
