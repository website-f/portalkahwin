<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:30'],
            'password' => ['required', 'string', 'min:6'],
            'role' => ['nullable', 'in:user,vendor,affiliate'],
            'company_name' => ['nullable', 'string', 'max:160'],
            // Affiliate referral code — attributes this signup (and their future
            // purchases) to the affiliate who shared the link.
            'ref' => ['nullable', 'string', 'max:40'],
        ]);

        $role = $data['role'] ?? 'user';
        // Vendor/affiliate accounts must be approved by an admin before they go active.
        $needsApproval = in_array($role, ['vendor', 'affiliate'], true);

        // Resolve the referring affiliate, if a valid code was passed.
        $referredBy = null;
        if (! empty($data['ref'])) {
            $affiliate = User::where('referral_code', $data['ref'])->where('role', 'affiliate')->first();
            $referredBy = $affiliate?->id;
        }

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'password' => $data['password'],
            'role' => $role,
            'status' => $needsApproval ? 'pending' : 'active',
            // Vendors ship far more media than a couple with one card, so the
            // starting allowance is per role and superadmin-tunable.
            'storage_quota_mb' => Setting::quotaForRole($role),
            'company_name' => $data['company_name'] ?? null,
            'referred_by' => $referredBy,
        ]);

        return response()->json([
            'user' => $user->toArray() + $user->accessPayload(),
            'token' => $user->createToken('spa')->plainTextToken,
        ], 201);
    }

    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $data['email'])->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages(['email' => 'E-mel atau kata laluan tidak sah.']);
        }

        if (! $user->is_active) {
            throw ValidationException::withMessages(['email' => 'Akaun ini telah dinyahaktifkan.']);
        }

        return response()->json([
            'user' => $user->toArray() + $user->accessPayload(),
            'token' => $user->createToken('spa')->plainTextToken,
        ]);
    }

    public function me(Request $request)
    {
        $user = $request->user();

        return response()->json($user->toArray() + $user->accessPayload());
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['ok' => true]);
    }

    /** Self-service profile update (name, phone, and company branding for vendor/affiliate). */
    public function updateProfile(Request $request)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'phone' => ['nullable', 'string', 'max:30'],
            'company_name' => ['nullable', 'string', 'max:160'],
            'company_logo' => ['nullable', 'string', 'max:500'],
        ]);

        $user = $request->user();

        // Company branding belongs to vendor/affiliate accounts. The sidebar link
        // is already hidden for everyone else, but hiding a control is not access
        // control — drop the fields rather than trust the client.
        if (! $user->canUseCompanyBranding()) {
            unset($data['company_name'], $data['company_logo']);
        }
        $user->update($data);
        $fresh = $user->fresh();

        return response()->json($fresh->toArray() + $fresh->accessPayload());
    }

    /** Upload a company logo (vendor/affiliate). Returns a host-agnostic /storage URL. */
    public function uploadLogo(Request $request)
    {
        $request->validate(['file' => ['required', 'image', 'max:'.Setting::maxUploadKb()]]);

        $user = $request->user();

        abort_unless(
            $user->canUseCompanyBranding(),
            403,
            'Penjenamaan syarikat tersedia untuk akaun Vendor dan Affiliate sahaja.'
        );
        $path = $request->file('file')->store("logos/{$user->id}", 'public');
        $url = '/storage/'.$path;

        $user->update(['company_logo' => $url]);

        return response()->json(['url' => $url]);
    }

    /** Set a new password (used for the forced change after an admin reset, and voluntary changes). */
    public function changePassword(Request $request)
    {
        $data = $request->validate([
            'new_password' => ['required', 'string', 'min:6', 'confirmed'],
        ]);

        $user = $request->user();
        $user->update([
            'password' => $data['new_password'],
            'must_change_password' => false,
        ]);

        $fresh = $user->fresh();

        return response()->json($fresh->toArray() + $fresh->accessPayload());
    }
}
