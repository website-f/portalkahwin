<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AffiliatePayout;
use App\Models\Payment;
use App\Models\Template;
use App\Models\User;
use App\Services\AffiliatePayoutReceipt;
use App\Services\AffiliateTransactionReceipt;
use Illuminate\Http\Request;

class AffiliateController extends Controller
{
    /** Only an affiliate account may use the affiliate surface. */
    private function affiliate(Request $request): User
    {
        $user = $request->user();
        abort_unless($user->isAffiliate(), 403, 'Akaun ini bukan afiliat.');

        return $user;
    }

    /** The signed-in affiliate's own commission payouts (recorded releases). */
    public function payouts(Request $request)
    {
        return AffiliatePayout::where('affiliate_id', $this->affiliate($request)->id)->latest()->limit(200)->get();
    }

    /** Download the affiliate's own commission-payout receipt (shows their code). */
    public function payoutReceipt(Request $request, AffiliatePayout $payout)
    {
        abort_unless($payout->affiliate_id === $this->affiliate($request)->id, 403);

        return AffiliatePayoutReceipt::download($payout);
    }

    /**
     * Every sale attributed to this affiliate (referred customers' template buys +
     * their own reseller buys), newest first, each with the commission it earns and a
     * receipt that carries the affiliate's code. This is the affiliate's cashflow book.
     */
    public function transactions(Request $request)
    {
        $affiliate = $this->affiliate($request);

        return response()->json(self::mapTransactions($affiliate));
    }

    /** Download the coded receipt for one attributed transaction (affiliate's own). */
    public function transactionReceipt(Request $request, Payment $payment)
    {
        $affiliate = $this->affiliate($request);
        abort_unless(self::isAttributed($affiliate, $payment), 403);

        return AffiliateTransactionReceipt::download($payment, $affiliate);
    }

    /** The signed-in affiliate's own referral link + the sales they've driven. */
    public function mine(Request $request)
    {
        $user = $this->affiliate($request);
        $code = $user->ensureReferralCode();
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

    /* --------------------------------------------------------------------- *
     * Shared attribution helpers (also used by the admin payout controller).
     * --------------------------------------------------------------------- */

    /** Is this paid template payment attributed to the given affiliate? */
    public static function isAttributed(User $affiliate, Payment $payment): bool
    {
        if ($payment->status !== 'paid' || $payment->purpose !== 'template') {
            return false;
        }
        $ids = $affiliate->referredUsers()->pluck('id')->push($affiliate->id)->unique();

        return $ids->contains($payment->user_id);
    }

    /**
     * Map an affiliate's attributed payments into transaction rows for the UI.
     *
     * @return array<int,array<string,mixed>>
     */
    public static function mapTransactions(User $affiliate): array
    {
        $payments = $affiliate->attributedCommissionPayments(false)->sortByDesc('created_at')->values();
        $rate = $affiliate->affiliateCommissionRate();

        // Resolve buyer names + design names in bulk (no N+1).
        $buyers = User::whereIn('id', $payments->pluck('user_id')->unique()->all())->pluck('name', 'id');
        $keys = $payments->pluck('template_key')
            ->merge($payments->flatMap(fn (Payment $p) => is_array($p->meta['template_keys'] ?? null) ? $p->meta['template_keys'] : []))
            ->filter()->unique()->values();
        $tplNames = $keys->isEmpty() ? collect() : Template::whereIn('key', $keys->all())->pluck('name', 'key');

        return $payments->map(function (Payment $p) use ($rate, $buyers, $tplNames, $affiliate) {
            $meta = $p->meta ?? [];
            $names = [];
            if (! empty($meta['template_names']) && is_array($meta['template_names'])) {
                $names = array_map('strval', $meta['template_names']);
            } elseif (! empty($meta['template_keys']) && is_array($meta['template_keys'])) {
                $names = array_map(fn ($k) => (string) ($tplNames[$k] ?? $k), $meta['template_keys']);
            } elseif ($p->template_key) {
                $names = [(string) ($tplNames[$p->template_key] ?? $p->template_key)];
            }
            $amount = round((float) $p->amount_myr, 2);

            return [
                'id' => (string) $p->id,
                'reference' => (string) ($p->reference ?? ''),
                'date' => optional($p->paid_at ?? $p->created_at)->toISOString(),
                'buyer' => $p->user_id === $affiliate->id ? '— (own)' : (string) ($buyers[$p->user_id] ?? '—'),
                'items' => $names ?: ['Template'],
                'amount' => $amount,
                'commission' => round($amount * $rate, 2),
                'paid_out' => ! is_null($p->affiliate_payout_id),
            ];
        })->all();
    }
}
