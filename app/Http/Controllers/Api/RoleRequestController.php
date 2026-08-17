<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\VendorApproved;
use App\Models\RoleRequest;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;

/**
 * Self-serve role change: a normal user asks to become a vendor or affiliate,
 * providing the same onboarding details a direct sign-up gives (company + phone).
 * There is no instant self-upgrade — the superadmin reviews the request in the
 * Approvals page (same surface as direct sign-ups) and approves (which flips the
 * role, applies the details, and runs vendor/affiliate setup) or rejects it.
 */
class RoleRequestController extends Controller
{
    /** The signed-in user's current role + their latest request (for status display). */
    public function mine(Request $request)
    {
        $u = $request->user();

        return response()->json([
            'role' => $u->role,
            'request' => RoleRequest::where('user_id', $u->id)->latest()->first(),
        ]);
    }

    /** Create a pending request. Blocked for admins, current-role matches, or a live pending one. */
    public function store(Request $request)
    {
        $u = $request->user();
        $data = $request->validate([
            'requested_role' => ['required', 'in:vendor,affiliate'],
            'company_name' => ['nullable', 'string', 'max:160'],
            'phone' => ['nullable', 'string', 'max:30'],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        abort_if(in_array($u->role, ['admin', 'superadmin'], true), 422, 'Akaun pentadbir tidak boleh memohon perubahan peranan.');
        abort_if($u->role === $data['requested_role'], 422, 'Anda sudah mempunyai peranan ini.');
        abort_if(
            RoleRequest::where('user_id', $u->id)->where('status', 'pending')->exists(),
            422,
            'Anda sudah mempunyai permohonan yang menunggu kelulusan.'
        );

        $req = RoleRequest::create([
            'user_id' => $u->id,
            'requested_role' => $data['requested_role'],
            'company_name' => $data['company_name'] ?? null,
            'phone' => $data['phone'] ?? null,
            'note' => $data['note'] ?? null,
            'status' => 'pending',
        ]);

        return response()->json($req, 201);
    }

    /**
     * Admin list of role-upgrade requests (newest first). Defaults to pending so the
     * Approvals surface only shows what still needs a decision; `?status=all` (or a
     * specific status) returns the full history.
     */
    public function index(Request $request)
    {
        $status = $request->query('status', 'pending');

        return RoleRequest::query()
            ->with('user:id,name,email')
            ->when($status && $status !== 'all', fn ($q) => $q->where('status', $status))
            ->latest()
            ->get()
            ->map(fn (RoleRequest $r) => [
                'request_id' => $r->id,
                'user_id' => $r->user_id,
                'name' => $r->user?->name,
                'email' => $r->user?->email,
                'phone' => $r->phone,
                'company_name' => $r->company_name,
                'requested_role' => $r->requested_role,
                'note' => $r->note,
                'status' => $r->status,
                'created_at' => $r->created_at,
            ]);
    }

    /**
     * Superadmin approves: flips the role and runs the same activation the signup
     * approval does — vendors get premium, affiliates get a referral code. The
     * request's onboarding details (company/phone) are copied onto the user, and an
     * optional payment receipt + note are stored, exactly like a direct approval.
     */
    public function approve(Request $request, RoleRequest $roleRequest)
    {
        $data = $request->validate([
            'receipt' => ['nullable', 'file', 'mimes:jpeg,jpg,png,webp,gif,pdf', 'max:'.Setting::maxUploadKb()],
            // Accept either key so the shared approval drawer and the user-detail page
            // can both call this endpoint.
            'note' => ['nullable', 'string', 'max:2000'],
            'review_note' => ['nullable', 'string', 'max:2000'],
        ]);
        abort_if($roleRequest->status !== 'pending', 422, 'Permohonan ini telah diproses.');

        $user = $roleRequest->user;
        $role = $roleRequest->requested_role;
        $note = $data['note'] ?? $data['review_note'] ?? null;

        // Copy the onboarding details the applicant supplied (don't clobber existing values with blanks).
        $userPayload = ['role' => $role, 'status' => 'active', 'is_active' => true];
        if ($roleRequest->company_name) $userPayload['company_name'] = $roleRequest->company_name;
        if ($roleRequest->phone) $userPayload['phone'] = $roleRequest->phone;
        if ($note !== null) $userPayload['approval_note'] = $note;
        $userPayload['approved_at'] = now();
        $userPayload['approved_by'] = $request->user()->id;

        // Vendors get a premium subscription; affiliates sell per event (no plan).
        if ($role === 'vendor') {
            $userPayload['plan'] = 'premium';
            $userPayload['plan_expires_at'] = now()->addMonths(Setting::premiumDurationMonths());
        }

        // Payment receipt (settled offline) — stored under the same path as direct approvals.
        $receiptPath = null;
        if ($request->hasFile('receipt')) {
            $path = $request->file('receipt')->store("approvals/{$user->id}", 'public');
            $receiptPath = '/storage/'.$path;
            $userPayload['approval_receipt'] = $receiptPath;
        }

        $user->update($userPayload);

        if ($role === 'affiliate') {
            $user->fresh()->ensureReferralCode();
        }

        $roleRequest->update([
            'status' => 'approved',
            'review_note' => $note,
            'receipt' => $receiptPath,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        $fresh = $user->fresh();

        // Notify the applicant, but never let a mail failure block activation.
        try {
            Mail::to($fresh->email)->send(new VendorApproved($fresh));
        } catch (\Throwable $e) {
            Log::warning('VendorApproved email failed', ['user' => $fresh->id, 'error' => $e->getMessage()]);
        }

        return response()->json(['ok' => true, 'user' => $fresh, 'request' => $roleRequest->fresh()]);
    }

    public function reject(Request $request, RoleRequest $roleRequest)
    {
        $data = $request->validate([
            'note' => ['nullable', 'string', 'max:2000'],
            'review_note' => ['nullable', 'string', 'max:2000'],
        ]);
        abort_if($roleRequest->status !== 'pending', 422, 'Permohonan ini telah diproses.');

        $roleRequest->update([
            'status' => 'rejected',
            'review_note' => $data['note'] ?? $data['review_note'] ?? null,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        return response()->json(['ok' => true, 'request' => $roleRequest->fresh()]);
    }
}
