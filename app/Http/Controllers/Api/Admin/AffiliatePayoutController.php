<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\AffiliateController;
use App\Http\Controllers\Controller;
use App\Models\AffiliatePayout;
use App\Models\Payment;
use App\Models\Setting;
use App\Models\User;
use App\Services\AffiliateTransactionReceipt;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Superadmin — release the commission owed to an affiliate as one recorded payout.
 * Mirrors the vendor pay-per-entry PayoutController: the attributed template sales
 * (referred users' buys + the affiliate's own reseller buys) that aren't yet paid
 * out are stamped with the new payout id, and the commission (rate × their gross)
 * is recorded with the affiliate's bank snapshot for the manual bank transfer.
 */
class AffiliatePayoutController extends Controller
{
    /** All recorded affiliate commission payouts, newest first. */
    public function index()
    {
        return AffiliatePayout::with('affiliate:id,name,company_name,email')
            ->latest()->limit(300)->get();
    }

    /**
     * One affiliate's full payout book (admin drill-down, mirrors the vendor page):
     * their identity + bank details, the commission summary, every attributed sale
     * (their cashflow), and every recorded payout.
     */
    public function show(User $affiliate)
    {
        abort_unless($affiliate->role === 'affiliate', 404);

        $bank = [
            'name' => (string) $affiliate->profileFieldValue('payout_bank_name'),
            'account_name' => (string) $affiliate->profileFieldValue('payout_bank_account_name'),
            'account_no' => (string) $affiliate->profileFieldValue('payout_bank_account_no'),
        ];

        return response()->json([
            'affiliate' => array_merge([
                'id' => $affiliate->id,
                'name' => $affiliate->name,
                'company_name' => $affiliate->company_name,
                'email' => $affiliate->email,
                'phone' => $affiliate->phone,
                'referral_code' => $affiliate->referral_code,
                'bank' => $bank,
                'bank_filled' => (bool) array_filter($bank),
            ], $affiliate->affiliateStats()),
            'transactions' => AffiliateController::mapTransactions($affiliate),
            'payouts' => AffiliatePayout::where('affiliate_id', $affiliate->id)->latest()->get(),
        ]);
    }

    /** Download a commission-payout receipt (superadmin). */
    public function receiptPdf(AffiliatePayout $payout)
    {
        return \App\Services\AffiliatePayoutReceipt::download($payout);
    }

    /** Coded receipt for one attributed transaction (superadmin copy). */
    public function transactionReceipt(User $affiliate, Payment $payment)
    {
        abort_unless($affiliate->role === 'affiliate', 404);
        abort_unless(AffiliateController::isAttributed($affiliate, $payment), 404);

        return AffiliateTransactionReceipt::download($payment, $affiliate);
    }

    /** Stream the payout's proof-of-payment attachment (superadmin). */
    public function attachment(AffiliatePayout $payout)
    {
        abort_unless($payout->attachment && Storage::disk('public')->exists($payout->attachment), 404, 'Tiada bukti dimuat naik.');

        return Storage::disk('public')->response($payout->attachment);
    }

    /** Release everything currently owed to one affiliate. */
    public function release(Request $request, User $affiliate)
    {
        abort_unless($affiliate->role === 'affiliate', 422, 'Akaun ini bukan afiliat.');

        // Proof of the bank transfer is REQUIRED — a commission release must carry a
        // digital receipt (screenshot/PDF), never a bare "mark as paid".
        $data = $request->validate([
            'method' => ['nullable', 'string', 'max:60'],
            'note' => ['nullable', 'string', 'max:500'],
            'attachment' => ['required', 'file', 'max:'.Setting::maxUploadKb(), 'mimetypes:image/jpeg,image/png,image/webp,application/pdf'],
        ], [
            'attachment.required' => 'Sila lampirkan bukti pembayaran (gambar atau PDF) untuk melepaskan komisen.',
        ]);

        $payments = $affiliate->attributedCommissionPayments(true);
        if ($payments->isEmpty()) {
            return response()->json(['message' => 'Tiada komisen belum dibayar untuk afiliat ini.'], 422);
        }

        $ratePct = round($affiliate->affiliateCommissionRate() * 100, 2);
        $gross = round((float) $payments->sum('amount_myr'), 2);
        $amount = round($gross * $ratePct / 100, 2);
        if ($amount <= 0) {
            return response()->json(['message' => 'Kadar komisen ialah 0%. Tetapkan di Tetapan dahulu.'], 422);
        }

        $bank = trim(implode(' · ', array_filter([
            (string) $affiliate->profileFieldValue('payout_bank_name'),
            (string) $affiliate->profileFieldValue('payout_bank_account_name'),
            (string) $affiliate->profileFieldValue('payout_bank_account_no'),
        ])));

        $payout = DB::transaction(function () use ($affiliate, $payments, $ratePct, $gross, $amount, $bank, $data, $request) {
            $payout = AffiliatePayout::create([
                'affiliate_id' => $affiliate->id,
                'affiliate_name' => $affiliate->company_name ?: $affiliate->name,
                'affiliate_email' => $affiliate->email,
                'reference' => 'AF-'.Str::upper(Str::random(8)),
                'gross' => $gross,
                'rate_percent' => $ratePct,
                'amount' => $amount,
                'payments_count' => $payments->count(),
                'method' => $data['method'] ?? null,
                'bank_snapshot' => $bank ?: null,
                'note' => $data['note'] ?? null,
                'released_by' => $request->user()->id,
                'released_at' => now(),
                'status' => 'released',
            ]);

            Payment::whereIn('id', $payments->pluck('id'))->update(['affiliate_payout_id' => $payout->id]);

            return $payout;
        });

        if ($request->hasFile('attachment')) {
            $path = $request->file('attachment')->store("affiliate-payouts/{$affiliate->id}", 'public');
            $payout->update(['attachment' => $path]);
        }

        return response()->json($payout->fresh()->load('affiliate:id,name,company_name,email'), 201);
    }
}
