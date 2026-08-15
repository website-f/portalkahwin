<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\PassIssued;
use App\Models\EntryPayment;
use App\Models\Invitation;
use App\Models\RsvpGuest;
use App\Models\VendorPayout;
use App\Services\EntryFee;
use App\Services\Hitpay\HitpayService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

/**
 * Pay-per-entry RSVP — the guest-facing money flow.
 *
 * A guest on a ticketed vendor event fills in the RSVP, is sent to HitPay, and on
 * payment (confirmed by the platform webhook, re-queried against HitPay — never
 * trusting the webhook body) gets an expiring QR pass by email. Every payment is
 * stamped with its vendor and a frozen fee split so the platform can pay each
 * vendor out later without recomputing anything.
 */
class EntryPaymentController extends Controller
{
    public function __construct(private HitpayService $hitpay) {}

    /** PUBLIC — a guest pays to RSVP a ticketed event; returns the HitPay URL. */
    public function start(Request $request, string $slug)
    {
        $invitation = Invitation::where('slug', $slug)
            ->where('status', 'published')
            ->where('rsvp_enabled', true)
            ->firstOrFail();

        abort_unless($invitation->payPerEntryActive(), 404, 'Majlis ini tidak menerima bayaran RSVP.');
        abort_unless($this->hitpay->isConfigured(), 503, 'Gerbang pembayaran belum sedia. Sila cuba sebentar lagi.');

        $fields = $invitation->rsvpFieldSet();
        $wantsPhone = $fields !== 'email';

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'phone' => [$wantsPhone ? 'required' : 'nullable', 'string', 'max:30'],
            // Email is always required for a paid entry — the pass is delivered by email.
            'email' => ['required', 'email', 'max:120'],
            'pax' => ['required', 'integer', 'min:1', 'max:20'],
            'message' => ['nullable', 'string', 'max:500'],
        ]);

        // Capacity: don't take a payment for a seat that isn't there.
        if ($invitation->seatingFull((int) $data['pax'])) {
            return response()->json([
                'message' => 'Maaf, semua tempat duduk telah penuh.',
                'seating_full' => true,
                'contact' => $invitation->vendorContact(),
            ], 422);
        }

        $quote = EntryFee::quote($invitation, (int) $data['pax']);

        // Guest is provisional (status 'pending') until payment confirms — then the
        // pass is issued and they flip to 'attending'.
        $guest = $invitation->guests()->create([
            'name' => $data['name'],
            'phone' => $data['phone'] ?? null,
            'email' => $data['email'],
            'pax' => $data['pax'],
            'status' => 'pending',
            'message' => $data['message'] ?? null,
            'responded_at' => now(),
        ]);

        $ref = 'ENT-'.Str::upper(Str::random(10));
        $payment = EntryPayment::create([
            'invitation_id' => $invitation->id,
            'vendor_id' => $invitation->user_id,
            'guest_id' => $guest->id,
            'reference' => $ref,
            'payer_name' => $data['name'],
            'payer_email' => $data['email'],
            'payer_phone' => $data['phone'] ?? null,
            'pax' => $quote['pax'],
            'unit_price' => $quote['unit_price'],
            'tax_percent' => 0,
            'tax_amount' => 0,
            'amount' => $quote['amount'],
            'fee_type' => 'multi',
            'fee_value' => 0,
            'platform_fee' => $quote['platform_fee'],
            'vendor_net' => $quote['vendor_net'],
            'charges' => $quote['charges'],
            'status' => 'pending',
            'meta' => ['slug' => $invitation->slug],
        ]);

        try {
            $couple = $this->coupleName($invitation);
            $req = $this->hitpay->createPaymentRequest([
                'name' => 'RSVP · '.$couple,
                'description' => 'RSVP '.$quote['pax'].' pax · '.$couple,
                'amountMyr' => (float) $quote['amount'],
                'ref' => $ref,
                'returnUrl' => rtrim(config('app.url'), '/').'/entry/return?ref='.urlencode($ref),
                'webhookUrl' => rtrim(config('app.url'), '/').'/api/entry/webhook',
                'payerName' => $data['name'],
                'payerEmail' => $data['email'],
                'payerPhone' => $data['phone'] ?? '',
            ]);
            $payment->update(['bill_code' => $req['id']]);

            return response()->json(['url' => $req['url'], 'reference' => $ref], 201);
        } catch (\Throwable $e) {
            report($e);
            $payment->update(['status' => 'failed']);

            return response()->json(['message' => 'Pembayaran tidak dapat dimulakan. Sila cuba lagi.'], 502);
        }
    }

    /** VENDOR — acknowledge receipt of a released payout (their record + reference). */
    public function acknowledgePayout(Request $request, VendorPayout $payout)
    {
        abort_unless($payout->vendor_id === $request->user()->id, 403);

        if (! $payout->acknowledged_at) {
            $payout->update(['acknowledged_at' => now()]);
        }

        return response()->json($payout->fresh());
    }

    /** VENDOR — download their own payout receipt PDF. */
    public function payoutReceipt(Request $request, VendorPayout $payout)
    {
        abort_unless($payout->vendor_id === $request->user()->id, 403);

        return \App\Services\PayoutReceipt::download($payout);
    }

    /** VENDOR — their own event collections + payout history, for the monitor page. */
    public function mine(Request $request)
    {
        $user = $request->user();

        $payments = $user->entryPayments()
            ->with('invitation:id,slug,groom_name,bride_name,groom_short,bride_short')
            ->latest()
            ->get();

        $paid = $payments->where('status', 'paid');
        $unreleased = $paid->whereNull('payout_id');
        $payouts = $user->payouts()->latest()->get();

        return response()->json([
            'can_use' => $user->canPayPerEntry(),
            'payments' => $payments->map(fn (EntryPayment $p) => $this->row($p))->values(),
            'payouts' => $payouts,
            'summary' => [
                'entries' => $paid->count(),
                'collected' => round((float) $paid->sum('amount'), 2),
                'fees' => round((float) $paid->sum('platform_fee'), 2),
                'net' => round((float) $paid->sum('vendor_net'), 2),
                'released' => round((float) $paid->whereNotNull('payout_id')->sum('vendor_net'), 2),
                'pending_release' => round((float) $unreleased->sum('vendor_net'), 2),
            ],
        ]);
    }

    /** Shape one payment row for the vendor/admin tables. */
    private function row(EntryPayment $p): array
    {
        $inv = $p->invitation;
        $couple = $inv
            ? trim(trim((string) ($inv->groom_short ?: $inv->groom_name)).' & '.trim((string) ($inv->bride_short ?: $inv->bride_name)), ' &')
            : null;

        return [
            'id' => $p->id,
            'reference' => $p->reference,
            'created_at' => optional($p->created_at)->toIso8601String(),
            'paid_at' => optional($p->paid_at)->toIso8601String(),
            'payer_name' => $p->payer_name,
            'payer_email' => $p->payer_email,
            'event' => $couple,
            'slug' => $inv?->slug,
            'pax' => (int) $p->pax,
            'amount' => (float) $p->amount,
            'platform_fee' => (float) $p->platform_fee,
            'vendor_net' => (float) $p->vendor_net,
            'status' => $p->status,
            'released' => $p->payout_id !== null,
        ];
    }

    /** PUBLIC — HitPay server-to-server webhook (HMAC-verified; source of truth). */
    public function webhook(Request $request)
    {
        $params = $request->all();
        if (! $this->hitpay->verifyWebhook($params)) {
            return response('invalid signature', 400);
        }

        $ref = $request->input('reference_number');
        $payment = $ref ? EntryPayment::where('reference', $ref)->first() : null;
        if ($payment) {
            $this->settle($payment);
        }

        return response('OK');
    }

    /** PUBLIC — the browser-return check (guest has no session, so look up by ref). */
    public function verify(Request $request)
    {
        $ref = (string) ($request->input('reference') ?: $request->input('ref') ?: '');
        $payment = $ref !== '' ? EntryPayment::where('reference', $ref)->first() : null;
        if (! $payment) {
            return response()->json(['status' => 'unknown'], 404);
        }

        $status = $this->settle($payment);
        $guest = $payment->guest;

        return response()->json([
            'status' => $status,
            'email' => $payment->payer_email,
            'passUrl' => ($status === 'paid' && $guest?->pass_token)
                ? rtrim(config('app.url'), '/').'/pass/'.$guest->pass_token
                : null,
        ]);
    }

    /**
     * Idempotent settlement — confirm against HitPay, and on the first paid pass
     * issue the guest's QR + email it. Early-returns if already paid so the webhook
     * and the return page can both fire without doubling anything up.
     */
    private function settle(EntryPayment $payment): string
    {
        if ($payment->status === 'paid') {
            return 'paid';
        }

        $status = $this->hitpay->paymentRequestStatus((string) $payment->bill_code);

        if ($status === 'paid') {
            $payment->update(['status' => 'paid', 'paid_at' => now()]);
            $guest = $payment->guest;
            $invitation = $payment->invitation;
            if ($guest && $invitation) {
                $this->issuePass($guest, $invitation);
                $this->emailPass($payment, $guest->fresh(), $invitation);
            }
        } elseif ($status === 'failed') {
            $payment->update(['status' => 'failed']);
        }

        return $status;
    }

    /** Turn a provisional guest into a confirmed attendee with an expiring pass. */
    private function issuePass(RsvpGuest $guest, Invitation $invitation): void
    {
        if (! $guest->pass_token) {
            $guest->pass_token = Str::random(48);
        }
        $guest->pass_expires_at = $invitation->passExpiresAt();
        $guest->status = 'attending';
        $guest->save();
    }

    private function emailPass(EntryPayment $payment, RsvpGuest $guest, Invitation $invitation): void
    {
        if (empty($guest->email)) {
            return;
        }
        try {
            Mail::to($guest->email)->send(new PassIssued($guest, $invitation, $payment));
            Log::info('Entry pass handed to mailer', [
                'guest_id' => $guest->id,
                'reference' => $payment->reference,
                'invitation' => $invitation->slug,
            ]);
        } catch (\Throwable $e) {
            report($e);
        }
    }

    private function coupleName(Invitation $invitation): string
    {
        $a = $invitation->groom_short ?: $invitation->groom_name;
        $b = $invitation->bride_short ?: $invitation->bride_name;

        return trim(trim((string) $a).' & '.trim((string) $b), ' &');
    }
}
