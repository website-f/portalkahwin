<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invitation;
use App\Models\Payment;
use App\Models\Setting;
use App\Models\Template;
use App\Models\User;
use App\Models\Voucher;
use App\Services\Toyyibpay\ToyyibpayService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PaymentController extends Controller
{
    public function __construct(private ToyyibpayService $toyyibpay) {}

    /**
     * Is paid checkout switched on for this user's role?
     *
     * Superadmin can close payments per role from Settings -> Features (e.g. while
     * a gateway is misbehaving, or when a role is meant to settle by bank transfer
     * and voucher only). Enforced here rather than in the UI so hiding a button is
     * never the only thing standing between a user and a charge.
     */
    private function paymentsOpenFor(?User $user): bool
    {
        $role = $user?->role ?? 'user';
        $key = match ($role) {
            'vendor' => 'payment_enabled_vendor',
            'affiliate' => 'payment_enabled_affiliate',
            default => 'payment_enabled_user',
        };

        // Absent setting means "on" — payments should not silently stop working
        // just because an admin has never opened the toggles page.
        return Setting::get($key, 'true') !== 'false';
    }

    private function paymentsClosedResponse()
    {
        return response()->json([
            'message' => 'Pembayaran dalam talian ditutup buat sementara waktu untuk akaun anda. Sila hubungi kami untuk pembayaran melalui pindahan bank atau kod baucar.',
            'payments_disabled' => true,
        ], 403);
    }

    /** Start a premium subscription purchase — returns the ToyyibPay payment URL. */
    public function subscribe(Request $request)
    {
        $user = $request->user();

        if (! $this->paymentsOpenFor($user)) {
            return $this->paymentsClosedResponse();
        }

        if (! $this->toyyibpay->isConfigured()) {
            return response()->json([
                'message' => 'Gerbang pembayaran ToyyibPay belum dikonfigurasi. Sila tetapkan TOYYIBPAY_SECRET_KEY dan TOYYIBPAY_CATEGORY_CODE dalam .env.',
                'configured' => false,
            ], 422);
        }

        $amount = (float) Setting::get('premium_price_myr', config('services.toyyibpay.premium_price_myr', 59));
        $ref = 'SUB-'.Str::upper(Str::random(10));

        $payment = Payment::create([
            'user_id' => $user->id,
            'purpose' => 'subscription',
            'reference' => $ref,
            'amount_myr' => $amount,
            'status' => 'pending',
        ]);

        try {
            $bill = $this->toyyibpay->createBill([
                'name' => 'PortalKahwin Premium',
                'description' => 'Langganan Premium PortalKahwin',
                'amountMyr' => $amount,
                'ref' => $ref,
                'returnUrl' => config('app.url').'/panel/checkout/return',
                'callbackUrl' => config('app.url').'/api/billing/callback',
                'payerName' => $user->name,
                'payerEmail' => $user->email,
                'payerPhone' => $user->phone ?? '',
            ]);
        } catch (\Throwable $e) {
            $payment->update(['status' => 'failed', 'meta' => ['error' => $e->getMessage()]]);

            return response()->json(['message' => 'Bil pembayaran belum berjaya dicipta.'], 502);
        }

        $payment->update(['bill_code' => $bill['billCode']]);

        return response()->json(['url' => $bill['url'], 'billCode' => $bill['billCode']]);
    }

    /**
     * Checkout for one or more templates chosen in the cart. Bills the SUM of the
     * premium designs' prices in a single ToyyibPay bill; on payment the user owns
     * every design in the order (ownership is derived from the paid payment's
     * `meta.template_keys`) plus premium features. Frozen from a confirmed cart.
     */
    public function checkout(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'template_keys' => ['required', 'array', 'min:1'],
            'template_keys.*' => ['string', 'exists:templates,key'],
            'voucher_code' => ['nullable', 'string'],
        ]);

        if (! $this->paymentsOpenFor($user)) {
            return $this->paymentsClosedResponse();
        }

        // Only premium designs need paying for; free ones are already usable.
        $templates = Template::whereIn('key', $data['template_keys'])->where('tier', 'premium')->get();

        if ($templates->isEmpty()) {
            return response()->json(['message' => 'Tiada rekaan berbayar dalam troli.'], 422);
        }

        $keys = $templates->pluck('key')->values()->all();
        $names = $templates->pluck('name')->values()->all();
        $basePrice = (float) $templates->sum(fn ($t) => (float) $t->price_myr);
        $amount = $basePrice;

        // Resolve an optional admin-issued voucher (applied to the whole order). The
        // frontend already validated the code, so a non-redeemable one here is simply
        // ignored — we bill the full price rather than erroring.
        $voucher = null;
        if (! empty($data['voucher_code'])) {
            $candidate = Voucher::where('code', $data['voucher_code'])->first();
            // Ignore a once-per-user code the buyer has already redeemed (defence in depth
            // behind the checkout UI's validation).
            $alreadyUsed = $candidate && $candidate->once_per_user && $candidate->redeemedByUser($user->id);
            $roleAllowed = $candidate && $candidate->allowsRole($user->role);
            if ($candidate && $candidate->isRedeemable() && $roleAllowed && ! $alreadyUsed) {
                $voucher = $candidate;
                $amount = $voucher->apply($basePrice);
            }
        }

        $meta = ['template_keys' => $keys, 'template_names' => $names];
        if ($voucher) {
            $meta['voucher_code'] = $voucher->code;
        }

        // A voucher that fully covers the order settles it instantly — no gateway hop.
        // Ownership of every design is derived from this paid payment's meta.
        if ($voucher && $amount <= 0) {
            $ref = 'TPL-'.Str::upper(Str::random(10));

            Payment::create([
                'user_id' => $user->id,
                'purpose' => 'template',
                'template_key' => $keys[0] ?? null,
                'reference' => $ref,
                'amount_myr' => 0,
                'status' => 'paid',
                'paid_at' => now(),
                'meta' => array_merge($meta, ['voucher_settled' => true]),
            ]);

            $voucher->increment('used_count');
            $voucher->recordRedemption($user->id);

            return response()->json(['paid' => true]);
        }

        if (! $this->toyyibpay->isConfigured()) {
            return response()->json([
                'message' => 'Gerbang pembayaran ToyyibPay belum dikonfigurasi. Sila tetapkan TOYYIBPAY_SECRET_KEY dan TOYYIBPAY_CATEGORY_CODE dalam .env.',
                'configured' => false,
            ], 422);
        }

        $ref = 'TPL-'.Str::upper(Str::random(10));

        $payment = Payment::create([
            'user_id' => $user->id,
            'purpose' => 'template',
            'template_key' => $keys[0] ?? null,  // representative; the full list lives in meta
            'reference' => $ref,
            'amount_myr' => $amount,
            'status' => 'pending',
            'meta' => $meta,
        ]);

        try {
            $bill = $this->toyyibpay->createBill([
                'name' => count($keys) === 1
                    ? Str::limit('Rekaan '.$names[0], 30, '')
                    : 'Rekaan PortalKahwin ('.count($keys).')',
                'description' => 'Rekaan Premium: '.implode(', ', $names),
                'amountMyr' => $amount,
                'ref' => $ref,
                'returnUrl' => config('app.url').'/panel/checkout/return',
                'callbackUrl' => config('app.url').'/api/billing/callback',
                'payerName' => $user->name,
                'payerEmail' => $user->email,
                'payerPhone' => $user->phone ?? '',
            ]);
        } catch (\Throwable $e) {
            $payment->update(['status' => 'failed', 'meta' => ['error' => $e->getMessage()]]);

            return response()->json(['message' => 'Bil pembayaran belum berjaya dicipta.'], 502);
        }

        $payment->update(['bill_code' => $bill['billCode']]);

        return response()->json(['url' => $bill['url'], 'billCode' => $bill['billCode']]);
    }

    /**
     * Pay to publish a specific TRIAL card (Logic 2). Bills the card's design price
     * and, on payment, flips the card to paid + published (watermark removed). The
     * paid payment also becomes the credit that backs this card, so the consumable
     * maths stays balanced (one credit bought, one spent).
     */
    public function publishCard(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            'invitation_id' => ['required', 'string', 'exists:invitations,id'],
            'voucher_code' => ['nullable', 'string'],
        ]);

        $invitation = Invitation::where('id', $data['invitation_id'])->where('user_id', $user->id)->first();
        abort_unless($invitation, 404);

        if ($invitation->is_paid) {
            return response()->json(['paid' => true]);
        }

        $template = Template::where('key', $invitation->template_key)->first();

        // A free design carries no charge — just take it out of trial and publish it.
        if (! $template || $template->tier !== 'premium') {
            $this->markCardPublished($invitation);

            return response()->json(['paid' => true]);
        }

        $basePrice = (float) $template->price_myr;
        $amount = $basePrice;

        $voucher = null;
        if (! empty($data['voucher_code'])) {
            $candidate = Voucher::where('code', $data['voucher_code'])->first();
            $alreadyUsed = $candidate && $candidate->once_per_user && $candidate->redeemedByUser($user->id);
            if ($candidate && $candidate->isRedeemable() && ! $alreadyUsed) {
                $voucher = $candidate;
                $amount = $voucher->apply($basePrice);
            }
        }

        $meta = [
            'template_keys' => [$template->key],
            'template_names' => [$template->name],
            'invitation_id' => $invitation->id,
        ];
        if ($voucher) {
            $meta['voucher_code'] = $voucher->code;
        }

        // Full-value voucher settles instantly — publish now, no gateway hop.
        if ($voucher && $amount <= 0) {
            Payment::create([
                'user_id' => $user->id,
                'purpose' => 'template',
                'template_key' => $template->key,
                'reference' => 'PUB-'.Str::upper(Str::random(10)),
                'amount_myr' => 0,
                'status' => 'paid',
                'paid_at' => now(),
                'meta' => array_merge($meta, ['voucher_settled' => true]),
            ]);
            $voucher->increment('used_count');
            $voucher->recordRedemption($user->id);
            $this->markCardPublished($invitation);

            return response()->json(['paid' => true]);
        }

        if (! $this->toyyibpay->isConfigured()) {
            return response()->json([
                'message' => 'Gerbang pembayaran ToyyibPay belum dikonfigurasi.',
                'configured' => false,
            ], 422);
        }

        $ref = 'PUB-'.Str::upper(Str::random(10));
        $payment = Payment::create([
            'user_id' => $user->id,
            'purpose' => 'template',
            'template_key' => $template->key,
            'reference' => $ref,
            'amount_myr' => $amount,
            'status' => 'pending',
            'meta' => $meta,
        ]);

        try {
            $bill = $this->toyyibpay->createBill([
                'name' => Str::limit('Terbit '.$template->name, 30, ''),
                'description' => 'Terbitkan kad · '.$template->name,
                'amountMyr' => $amount,
                'ref' => $ref,
                'returnUrl' => config('app.url').'/panel/checkout/return',
                'callbackUrl' => config('app.url').'/api/billing/callback',
                'payerName' => $user->name,
                'payerEmail' => $user->email,
                'payerPhone' => $user->phone ?? '',
            ]);
        } catch (\Throwable $e) {
            $payment->update(['status' => 'failed', 'meta' => ['error' => $e->getMessage()]]);

            return response()->json(['message' => 'Bil pembayaran belum berjaya dicipta.'], 502);
        }

        $payment->update(['bill_code' => $bill['billCode']]);

        return response()->json(['url' => $bill['url'], 'billCode' => $bill['billCode']]);
    }

    /** Flip a trial card to a fully paid, published card (watermark removed). */
    private function markCardPublished(Invitation $invitation): void
    {
        $invitation->update([
            'is_trial' => false,
            'is_paid' => true,
            'status' => 'published',
            'published_at' => $invitation->published_at ?? now(),
        ]);
    }

    /** Server-to-server callback from ToyyibPay (source of truth). */
    public function callback(Request $request)
    {
        $billCode = $request->input('billcode');
        if ($billCode) {
            $this->settle($billCode);
        }

        return response('OK');
    }

    /** Browser-return verification triggered by the SPA checkout/return page. */
    public function verify(Request $request)
    {
        $billCode = $request->input('billcode');
        $payment = $billCode ? Payment::where('bill_code', $billCode)->first() : null;

        if (! $payment) {
            return response()->json(['status' => 'unknown'], 404);
        }

        $status = $this->settle($billCode);

        return response()->json([
            'status' => $status,
            'plan' => $request->user()?->fresh()->plan,
        ]);
    }

    /** Idempotently verify a bill and grant entitlement if paid. */
    private function settle(string $billCode): string
    {
        $payment = Payment::where('bill_code', $billCode)->first();
        if (! $payment) {
            return 'unknown';
        }
        if ($payment->status === 'paid') {
            return 'paid';
        }

        $status = $this->toyyibpay->billStatus($billCode);

        if ($status === 'paid') {
            $payment->update(['status' => 'paid', 'paid_at' => now()]);
            // A template purchase grants ownership of THAT design only (derived from the
            // paid payment row) + premium features. A subscription upgrades the whole plan.
            if ($payment->purpose === 'subscription' && $payment->user) {
                $payment->user->update([
                    'plan' => 'premium',
                    'plan_expires_at' => now()->addYear(),
                ]);
            }
            // Redeem a partially-discounting voucher exactly once. This block only runs on
            // the pending→paid transition (the method returns early if already paid), so the
            // used_count is never double-incremented.
            $voucherCode = $payment->meta['voucher_code'] ?? null;
            if ($payment->purpose === 'template' && $voucherCode) {
                $v = Voucher::where('code', $voucherCode)->first();
                if ($v) {
                    $v->increment('used_count');
                    if ($payment->user_id) {
                        $v->recordRedemption($payment->user_id);
                    }
                }
            }

            // Pay-to-publish: a template payment tied to a specific trial card flips
            // that card to paid + published once the money settles.
            $invId = $payment->meta['invitation_id'] ?? null;
            if ($payment->purpose === 'template' && $invId) {
                $inv = Invitation::where('id', $invId)->first();
                if ($inv) {
                    $this->markCardPublished($inv);
                }
            }
        } elseif ($status === 'failed') {
            $payment->update(['status' => 'failed']);
        }

        return $status;
    }
}
