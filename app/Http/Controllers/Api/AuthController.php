<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\WelcomeMail;
use App\Models\ProfileField;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
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

        // Welcome / onboarding email — must never block signup if mail is down.
        try {
            Mail::to($user->email)->send(new WelcomeMail($user, $needsApproval));
        } catch (\Throwable $e) {
            Log::warning('WelcomeMail failed', ['user' => $user->id, 'error' => $e->getMessage()]);
        }

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

    /**
     * The profile field definitions (grouped into tabs) that apply to the signed-in
     * user's role, plus their current values and the receipt-branding state.
     */
    public function myProfileFields(Request $request)
    {
        $user = $request->user();
        $role = $user->role ?? 'user';
        $fields = ProfileField::forRole($role);

        // Group into tabs, preserving field order within each group.
        $groups = [];
        foreach ($fields as $f) {
            $groups[$f->group_key] ??= ['key' => $f->group_key, 'label' => $f->group_label, 'system' => (bool) $f->system, 'fields' => []];
            $groups[$f->group_key]['fields'][] = [
                'key' => $f->key,
                'label' => $f->label,
                'type' => $f->type,
                'options' => $f->options ?? [],
                'required' => (bool) $f->required,
                'system' => (bool) $f->system,
            ];
            // A group is "system" only if all its fields are.
            if (! $f->system) {
                $groups[$f->group_key]['system'] = false;
            }
        }

        $values = [];
        foreach ($fields as $f) {
            $values[$f->key] = $user->profileFieldValue($f->key);
        }

        return response()->json([
            'groups' => array_values($groups),
            'values' => (object) $values,
            'branding' => [
                'allowed' => Setting::get('allow_seller_receipt_branding', 'true') === 'true',
                'use_own' => (bool) $user->use_own_receipt_branding,
                'can_brand' => in_array($role, ['vendor', 'affiliate'], true),
            ],
        ]);
    }

    /** Self-service profile update (name, phone, company branding, and custom fields). */
    public function updateProfile(Request $request)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'phone' => ['nullable', 'string', 'max:30'],
            'company_name' => ['nullable', 'string', 'max:160'],
            'company_logo' => ['nullable', 'string', 'max:500'],
            'profile_data' => ['sometimes', 'array'],
            'use_own_receipt_branding' => ['sometimes', 'boolean'],
        ]);

        $user = $request->user();
        $role = $user->role ?? 'user';

        // The business identity (name + logo) belongs to vendor/affiliate accounts —
        // they need it for their receipt branding regardless of the card-branding
        // feature flag. Everyone else can't set it: drop rather than trust the client.
        if (! in_array($role, ['vendor', 'affiliate'], true)) {
            unset($data['company_name'], $data['company_logo']);
        }

        foreach (['name', 'phone', 'company_name', 'company_logo'] as $col) {
            if (array_key_exists($col, $data)) {
                $user->{$col} = $data[$col];
            }
        }

        // Custom field values: only accept keys that are real, active fields for this
        // role — never trust arbitrary keys into profile_data.
        if (array_key_exists('profile_data', $data)) {
            $allowed = ProfileField::forRole($role)->keyBy('key');
            $clean = [];
            foreach ($data['profile_data'] as $key => $val) {
                if ($allowed->has($key)) {
                    $clean[$key] = is_scalar($val) ? (string) $val : null;
                }
            }
            $user->applyProfileValues($clean);
        }

        // Only sellers may opt in, and only while the master switch allows it.
        if (array_key_exists('use_own_receipt_branding', $data)
            && in_array($role, ['vendor', 'affiliate'], true)
            && Setting::get('allow_seller_receipt_branding', 'true') === 'true') {
            $user->use_own_receipt_branding = (bool) $data['use_own_receipt_branding'];
        }

        $user->save();
        $fresh = $user->fresh();

        return response()->json($fresh->toArray() + $fresh->accessPayload());
    }

    /** Upload a company logo (vendor/affiliate). Returns a host-agnostic /storage URL. */
    public function uploadLogo(Request $request)
    {
        $request->validate(['file' => ['required', 'image', 'max:'.Setting::maxUploadKb()]]);

        $user = $request->user();

        abort_unless(
            in_array($user->role, ['vendor', 'affiliate'], true),
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
