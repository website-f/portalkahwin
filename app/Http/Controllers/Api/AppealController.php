<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\VendorApproved;
use App\Models\Appeal;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;

/**
 * A rejected vendor/affiliate can appeal the decision. They stay logged in but are
 * locked (client-side + these endpoints) to the Appeal page: they state their case
 * and attach proof, then the superadmin reviews it and either activates the account
 * or upholds the rejection.
 */
class AppealController extends Controller
{
    /** The signed-in user's account status + the rejection note + their latest appeal. */
    public function mine(Request $request)
    {
        $u = $request->user();

        return response()->json([
            'status' => $u->status,
            'rejection_note' => $u->approval_note,
            'appeal' => Appeal::where('user_id', $u->id)->latest()->first(),
        ]);
    }

    /** Submit an appeal. Only a rejected account may appeal, and only once at a time. */
    public function store(Request $request)
    {
        $u = $request->user();
        abort_unless($u->status === 'rejected', 403, 'Hanya akaun yang ditolak boleh membuat rayuan.');
        abort_if(
            Appeal::where('user_id', $u->id)->where('status', 'pending')->exists(),
            422,
            'Anda sudah mempunyai rayuan yang menunggu semakan.'
        );

        $data = $request->validate([
            'reason' => ['required', 'string', 'max:3000'],
            'attachment' => ['nullable', 'file', 'mimes:jpeg,jpg,png,webp,gif,pdf', 'max:'.Setting::maxUploadKb()],
        ]);

        $path = null;
        if ($request->hasFile('attachment')) {
            $path = $request->file('attachment')->store("appeals/{$u->id}", 'public');
        }

        $appeal = Appeal::create([
            'user_id' => $u->id,
            'reason' => $data['reason'],
            'attachment' => $path,
            'status' => 'pending',
        ]);

        return response()->json($appeal, 201);
    }

    /* ---------------------------------- Admin ---------------------------------- */

    /** Admin list of appeals (newest first). Defaults to pending. */
    public function index(Request $request)
    {
        $status = $request->query('status', 'pending');

        return Appeal::query()
            ->with('user:id,name,email,role,company_name,status,approval_note')
            ->when($status && $status !== 'all', fn ($q) => $q->where('status', $status))
            ->latest()
            ->get()
            ->map(fn (Appeal $a) => [
                'id' => $a->id,
                'user_id' => $a->user_id,
                'name' => $a->user?->name,
                'email' => $a->user?->email,
                'role' => $a->user?->role,
                'company_name' => $a->user?->company_name,
                'account_status' => $a->user?->status,
                'rejection_note' => $a->user?->approval_note,
                'reason' => $a->reason,
                'has_attachment' => (bool) $a->attachment,
                'status' => $a->status,
                'review_note' => $a->review_note,
                'created_at' => $a->created_at,
            ]);
    }

    /** Stream an appeal's supporting attachment (superadmin). */
    public function attachment(Appeal $appeal)
    {
        abort_unless($appeal->attachment && Storage::disk('public')->exists($appeal->attachment), 404, 'Tiada lampiran.');

        return Storage::disk('public')->response($appeal->attachment);
    }

    /**
     * Approve the appeal: reactivate the account (same activation the sign-up
     * approval runs — vendor gets premium, affiliate gets a referral code) and mark
     * the appeal approved.
     */
    public function approve(Request $request, Appeal $appeal)
    {
        $data = $request->validate(['note' => ['nullable', 'string', 'max:2000']]);
        abort_if($appeal->status !== 'pending', 422, 'Rayuan ini telah diproses.');

        $user = $appeal->user;
        $payload = ['status' => 'active', 'is_active' => true, 'approved_at' => now(), 'approved_by' => $request->user()->id];
        if ($user->isVendor()) {
            $payload['plan'] = 'premium';
            $payload['plan_expires_at'] = now()->addMonths(Setting::premiumDurationMonths());
        }
        $user->update($payload);

        if ($user->isAffiliate()) {
            $user->fresh()->ensureReferralCode();
        }

        $appeal->update([
            'status' => 'approved',
            'review_note' => $data['note'] ?? null,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        $fresh = $user->fresh();
        try {
            Mail::to($fresh->email)->send(new VendorApproved($fresh));
        } catch (\Throwable $e) {
            Log::warning('VendorApproved (appeal) email failed', ['user' => $fresh->id, 'error' => $e->getMessage()]);
        }

        return response()->json(['ok' => true, 'user' => $fresh, 'appeal' => $appeal->fresh()]);
    }

    /** Uphold the rejection: mark the appeal rejected; the account stays rejected. */
    public function reject(Request $request, Appeal $appeal)
    {
        $data = $request->validate(['note' => ['nullable', 'string', 'max:2000']]);
        abort_if($appeal->status !== 'pending', 422, 'Rayuan ini telah diproses.');

        $appeal->update([
            'status' => 'rejected',
            'review_note' => $data['note'] ?? null,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        return response()->json(['ok' => true, 'appeal' => $appeal->fresh()]);
    }
}
