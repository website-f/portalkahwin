<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    /** Admin — all editable settings merged over defaults, plus the role matrix. */
    public function index()
    {
        // Feature switches come back as 'true'/'false' strings to match how every
        // other toggle on this screen is stored and posted.
        $matrix = array_map(
            fn (bool $on) => $on ? 'true' : 'false',
            Setting::featureMatrix()
        );

        return response()->json(array_merge($matrix, Setting::allMerged()));
    }

    /** Admin — upsert any provided settings. */
    public function update(Request $request)
    {
        $data = $request->validate([
            'site_name' => ['sometimes', 'string', 'max:80'],
            'support_email' => ['sometimes', 'email'],
            'currency' => ['sometimes', 'string', 'max:8'],
            'premium_price_myr' => ['sometimes', 'numeric', 'min:0'],
            'free_card_limit' => ['sometimes', 'integer', 'min:0'],
            'free_guest_limit' => ['sometimes', 'integer', 'min:0'],
            'premium_guest_limit' => ['sometimes', 'integer', 'min:0'],
            'max_upload_mb' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'affiliate_link_hours' => ['sometimes', 'integer', 'min:1', 'max:8760'],
            // Trial / purchase flow controls.
            'signup_flow' => ['sometimes', 'in:trial,buy'],
            'trial_view_limit' => ['sometimes', 'integer', 'min:0', 'max:100000'],
            'card_edit_limit' => ['sometimes', 'integer', 'min:0', 'max:100000'],
            'storage_quota_vendor_mb' => ['sometimes', 'integer', 'min:1', 'max:100000'],
            'storage_quota_affiliate_mb' => ['sometimes', 'integer', 'min:1', 'max:100000'],
            'storage_quota_user_mb' => ['sometimes', 'integer', 'min:1', 'max:100000'],
            // Receipt / business identity (shown on invoices).
            'receipt_company_name' => ['sometimes', 'string', 'max:120'],
            'receipt_description' => ['sometimes', 'string', 'max:160'],
            'receipt_phone' => ['sometimes', 'string', 'max:40'],
            'receipt_website' => ['sometimes', 'string', 'max:120'],
            'receipt_email' => ['sometimes', 'string', 'max:120'],
            // Feature toggles (stored as 'true'/'false' strings)
            'allow_user_templates' => ['sometimes', 'in:true,false'],
            'payment_enabled_user' => ['sometimes', 'in:true,false'],
            'payment_enabled_vendor' => ['sometimes', 'in:true,false'],
            'payment_enabled_affiliate' => ['sometimes', 'in:true,false'],
            // When ON, guests see only their own name in the seating view.
        ]);

        // Role x feature matrix — validated dynamically so adding a capability to
        // Setting::FEATURES is the only change needed to expose it here.
        $featureRules = [];
        foreach (Setting::FEATURE_ROLES as $role) {
            foreach (Setting::FEATURES as $feature) {
                $featureRules[Setting::featureKey($role, $feature)] = ['sometimes', 'in:true,false'];
            }
        }
        $data = array_merge($data, $request->validate($featureRules));

        foreach ($data as $k => $v) {
            Setting::put($k, $v);
        }

        return response()->json(Setting::allMerged());
    }

    /** Public — safe subset used by the marketing/checkout surface. */
    public function publicShow()
    {
        $all = Setting::allMerged();

        return response()->json([
            'site_name' => $all['site_name'],
            'premium_price_myr' => $all['premium_price_myr'],
            'currency' => $all['currency'],
            'allow_user_templates' => ($all['allow_user_templates'] ?? 'false') === 'true',
            // The uploader needs this to reject oversized files before sending them.
            'max_upload_mb' => (int) ($all['max_upload_mb'] ?? 5),
            // Trial/purchase flow — the gallery picks Test vs Order from this.
            'signup_flow' => $all['signup_flow'] ?? 'trial',
            'trial_view_limit' => (int) ($all['trial_view_limit'] ?? 5),
            'card_edit_limit' => (int) ($all['card_edit_limit'] ?? 0),
            // Business identity for receipts/invoices (shown to buyers).
            'receipt_company_name' => $all['receipt_company_name'],
            'receipt_description' => $all['receipt_description'],
            'receipt_phone' => $all['receipt_phone'],
            'receipt_website' => $all['receipt_website'],
            'receipt_email' => $all['receipt_email'],
        ]);
    }
}
