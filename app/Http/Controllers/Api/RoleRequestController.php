<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RoleRequest;
use Illuminate\Http\Request;

/**
 * Self-serve role change: a normal user asks to become a vendor or affiliate.
 * There is no instant self-upgrade — the superadmin reviews the request on the
 * user-detail page and approves (which flips the role + does the vendor/affiliate
 * setup) or rejects it.
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
            'note' => $data['note'] ?? null,
            'status' => 'pending',
        ]);

        return response()->json($req, 201);
    }

    /**
     * Superadmin approves: flips the role and runs the same activation the signup
     * approval does — vendors get a year of premium, affiliates get a referral code.
     */
    public function approve(Request $request, RoleRequest $roleRequest)
    {
        $data = $request->validate(['review_note' => ['nullable', 'string', 'max:2000']]);
        abort_if($roleRequest->status !== 'pending', 422, 'Permohonan ini telah diproses.');

        $user = $roleRequest->user;
        $role = $roleRequest->requested_role;

        $payload = ['role' => $role, 'status' => 'active', 'is_active' => true];
        if ($role === 'vendor') {
            $payload['plan'] = 'premium';
            $payload['plan_expires_at'] = now()->addMonths(\App\Models\Setting::premiumDurationMonths());
        }
        $user->update($payload);

        if ($role === 'affiliate') {
            $user->fresh()->ensureReferralCode();
        }

        $roleRequest->update([
            'status' => 'approved',
            'review_note' => $data['review_note'] ?? null,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        return response()->json(['ok' => true, 'user' => $user->fresh(), 'request' => $roleRequest->fresh()]);
    }

    public function reject(Request $request, RoleRequest $roleRequest)
    {
        $data = $request->validate(['review_note' => ['nullable', 'string', 'max:2000']]);
        abort_if($roleRequest->status !== 'pending', 422, 'Permohonan ini telah diproses.');

        $roleRequest->update([
            'status' => 'rejected',
            'review_note' => $data['review_note'] ?? null,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        return response()->json(['ok' => true, 'request' => $roleRequest->fresh()]);
    }
}
