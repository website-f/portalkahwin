<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Services\Toyyibpay\ToyyibpayService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PaymentController extends Controller
{
    public function __construct(private ToyyibpayService $toyyibpay) {}

    /** Start a premium subscription purchase — returns the ToyyibPay payment URL. */
    public function subscribe(Request $request)
    {
        $user = $request->user();

        if (! $this->toyyibpay->isConfigured()) {
            return response()->json([
                'message' => 'Gerbang pembayaran ToyyibPay belum dikonfigurasi. Sila tetapkan TOYYIBPAY_SECRET_KEY & TOYYIBPAY_CATEGORY_CODE dalam .env.',
                'configured' => false,
            ], 422);
        }

        $amount = (float) config('services.toyyibpay.premium_price_myr', 59);
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
                'returnUrl' => config('app.url').'/app/checkout/return',
                'callbackUrl' => config('app.url').'/api/billing/callback',
                'payerName' => $user->name,
                'payerEmail' => $user->email,
                'payerPhone' => $user->phone ?? '',
            ]);
        } catch (\Throwable $e) {
            $payment->update(['status' => 'failed', 'meta' => ['error' => $e->getMessage()]]);

            return response()->json(['message' => 'Gagal mencipta bil pembayaran.'], 502);
        }

        $payment->update(['bill_code' => $bill['billCode']]);

        return response()->json(['url' => $bill['url'], 'billCode' => $bill['billCode']]);
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
            if ($payment->purpose === 'subscription' && $payment->user) {
                $payment->user->update([
                    'plan' => 'premium',
                    'plan_expires_at' => now()->addYear(),
                ]);
            }
        } elseif ($status === 'failed') {
            $payment->update(['status' => 'failed']);
        }

        return $status;
    }
}
