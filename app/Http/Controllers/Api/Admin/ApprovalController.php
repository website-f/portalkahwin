<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Mail\VendorApproved;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class ApprovalController extends Controller
{
    /** Pending vendor/affiliate registrations awaiting an admin decision. */
    public function index()
    {
        return User::query()
            ->where('status', 'pending')
            ->whereIn('role', ['vendor', 'affiliate'])
            ->latest()
            ->get(['id', 'name', 'email', 'phone', 'role', 'company_name', 'created_at']);
    }

    /**
     * Approve an applicant after collecting payment offline: attach the supporting
     * receipt, activate the account, grant a year of premium, and email them.
     */
    public function approve(Request $request, User $user)
    {
        $data = $request->validate([
            'receipt' => ['nullable', 'file', 'mimes:jpeg,jpg,png,webp,gif,pdf', 'max:4096'],
            'note' => ['nullable', 'string', 'max:2000'],
        ]);

        $payload = [
            'status' => 'active',
            // is_active defaults true, but re-assert it so a previously disabled account goes live.
            'is_active' => true,
            'approval_note' => $data['note'] ?? null,
            'approved_at' => now(),
            'approved_by' => $request->user()->id,
            'plan' => 'premium',
            'plan_expires_at' => now()->addYear(),
        ];

        // Only overwrite the stored receipt when a new file was actually uploaded.
        if ($request->hasFile('receipt')) {
            $path = $request->file('receipt')->store("approvals/{$user->id}", 'public');
            $payload['approval_receipt'] = '/storage/'.$path;
        }

        $user->update($payload);
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
}
