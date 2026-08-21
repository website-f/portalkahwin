<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Mail\VendorApproved;
use App\Models\Payment;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ApprovalController extends Controller
{
    /**
     * All vendor/affiliate registrations (newest first) so admins can review both
     * pending applications and past decisions. Accepts an optional `?status=` filter
     * (pending|active|rejected); absent or `all` returns every application.
     */
    public function index(Request $request)
    {
        $status = $request->query('status');

        return User::query()
            ->whereIn('role', ['vendor', 'affiliate'])
            ->when($status && $status !== 'all', fn ($q) => $q->where('status', $status))
            ->latest()
            ->get([
                'id', 'name', 'email', 'phone', 'role', 'company_name', 'status',
                'approved_at', 'created_at',
                // Needed by the review drawer so a past decision can be reopened:
                // the uploaded receipt, the admin's note, and whether the receipt
                // has already been booked into finance.
                'approval_receipt', 'approval_note', 'approval_payment_id',
            ]);
    }

    /**
     * Book an approval receipt into finance as a paid subscription.
     *
     * Approvals are settled offline (bank transfer, receipt uploaded here), so
     * nothing in the payments table knows about them — which is why approved
     * vendors never showed up in revenue. This records the amount the admin
     * actually collected and links it back to the user, so the receipt on file
     * and the finance figure are the same event.
     *
     * Idempotent by design: `approval_payment_id` is set once, and a second
     * attempt is rejected rather than double-counting the revenue.
     */
    public function recordPayment(Request $request, User $user)
    {
        $data = $request->validate([
            'amount_myr' => ['required', 'numeric', 'min:0.01', 'max:999999'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        if ($user->approval_payment_id && Payment::whereKey($user->approval_payment_id)->exists()) {
            return response()->json([
                'message' => 'Bayaran untuk kelulusan ini telah pun direkodkan.',
                'already_recorded' => true,
            ], 422);
        }

        $payment = Payment::create([
            'user_id' => $user->id,
            'purpose' => 'subscription',
            'reference' => 'APV-'.Str::upper(Str::random(10)),
            'amount_myr' => $data['amount_myr'],
            'status' => 'paid',
            'paid_at' => now(),
            'meta' => [
                'source' => 'approval',
                'role' => $user->role,
                'company_name' => $user->company_name,
                'receipt' => $user->approval_receipt,
                'note' => $data['note'] ?? $user->approval_note,
                'recorded_by' => $request->user()->id,
            ],
        ]);

        $user->forceFill(['approval_payment_id' => $payment->id])->save();

        return response()->json([
            'ok' => true,
            'payment' => $payment,
            'user' => $user->fresh(),
        ], 201);
    }

    /**
     * Approve an applicant. VENDORS pay a subscription offline (receipt optional)
     * and are granted a year of premium. AFFILIATES don't pay — approval just
     * activates them (like a normal user) and issues a referral code; the receipt
     * stays optional either way ("with or without attachment").
     */
    public function approve(Request $request, User $user)
    {
        $data = $request->validate([
            'receipt' => ['nullable', 'file', 'mimes:jpeg,jpg,png,webp,gif,pdf', 'max:'.Setting::maxUploadKb()],
            'note' => ['nullable', 'string', 'max:2000'],
        ]);

        $payload = [
            'status' => 'active',
            // is_active defaults true, but re-assert it so a previously disabled account goes live.
            'is_active' => true,
            'approval_note' => $data['note'] ?? null,
            'approved_at' => now(),
            'approved_by' => $request->user()->id,
        ];

        // Vendors get Premium on approval ONLY in manual-billing mode (they paid the
        // admin directly). In self-serve mode the vendor is activated but not premium
        // — read-only until they subscribe to a plan themselves. Affiliates never get
        // a plan here (they buy designs per event).
        if ($user->isVendor() && Setting::vendorManualBilling()) {
            $payload['plan'] = 'premium';
            $payload['plan_expires_at'] = now()->addMonths(Setting::premiumDurationMonths());
        }

        // Only overwrite the stored receipt when a new file was actually uploaded.
        if ($request->hasFile('receipt')) {
            $path = $request->file('receipt')->store("approvals/{$user->id}", 'public');
            $payload['approval_receipt'] = '/storage/'.$path;
        }

        $user->update($payload);

        // An approved affiliate can start selling right away.
        if ($user->isAffiliate()) {
            $user->fresh()->ensureReferralCode();
        }

        $fresh = $user->fresh();

        // Activation must never hinge on the mail server being reachable — log and continue.
        try {
            Mail::to($fresh->email)->send(new VendorApproved($fresh));
        } catch (\Throwable $e) {
            Log::warning('VendorApproved email failed', ['user' => $fresh->id, 'error' => $e->getMessage()]);
        }

        return response()->json($fresh);
    }

    /** Reject an applicant, recording an optional note for the audit trail. */
    public function reject(Request $request, User $user)
    {
        $data = $request->validate([
            'note' => ['nullable', 'string', 'max:2000'],
        ]);

        $user->update([
            'status' => 'rejected',
            'approval_note' => $data['note'] ?? null,
        ]);

        return response()->json($user->fresh());
    }

    /**
     * Stream a stored approval receipt.
     *
     * Served through the API rather than as a public /storage URL for two
     * reasons: a receipt is a financial document and should not sit behind a
     * guessable public path, and a missing file here 404s honestly instead of
     * falling through to the SPA catch-all, which is what made a broken receipt
     * look like a redirect to the home page.
     */
    public function receipt(User $user)
    {
        $stored = $user->approval_receipt;
        abort_unless($stored, 404, 'Tiada resit dimuat naik.');

        // Stored as "/storage/approvals/..." — map it back onto the public disk.
        $path = Str::after($stored, '/storage/');
        abort_unless(Storage::disk('public')->exists($path), 404, 'Fail resit tidak dijumpai.');

        return Storage::disk('public')->response($path);
    }
}
