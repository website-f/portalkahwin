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
            'premium_duration_months' => ['sometimes', 'integer', 'min:1', 'max:120'],
            'free_card_limit' => ['sometimes', 'integer', 'min:0'],
            'free_guest_limit' => ['sometimes', 'integer', 'min:0'],
            'premium_guest_limit' => ['sometimes', 'integer', 'min:0'],
            'rsvp_max_pax' => ['sometimes', 'integer', 'min:1', 'max:1000'],
            'default_table_capacity' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'max_table_capacity' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'affiliate_commission_percent' => ['sometimes', 'numeric', 'min:0', 'max:100'],
            'max_upload_mb' => ['sometimes', 'integer', 'min:1', 'max:100'],
            // Trial / purchase flow controls.
            'signup_flow' => ['sometimes', 'in:trial,buy'],
            'trial_view_limit' => ['sometimes', 'integer', 'min:0', 'max:100000'],
            'card_edit_limit' => ['sometimes', 'integer', 'min:0', 'max:100000'],
            // Default background song played in Preview + Test mode, so a visitor
            // hears that cards can carry music. (A file URL or a YouTube link.)
            'preview_song_url' => ['sometimes', 'nullable', 'string', 'max:500'],
            'preview_song_start' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'preview_song_end' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'storage_quota_vendor_mb' => ['sometimes', 'integer', 'min:1', 'max:100000'],
            'storage_quota_affiliate_mb' => ['sometimes', 'integer', 'min:1', 'max:100000'],
            'storage_quota_user_mb' => ['sometimes', 'integer', 'min:1', 'max:100000'],
            // Receipt / business identity (shown on invoices).
            'receipt_company_name' => ['sometimes', 'string', 'max:120'],
            'receipt_description' => ['sometimes', 'string', 'max:160'],
            'receipt_phone' => ['sometimes', 'string', 'max:40'],
            'receipt_website' => ['sometimes', 'string', 'max:120'],
            'receipt_email' => ['sometimes', 'string', 'max:120'],
            'allow_seller_receipt_branding' => ['sometimes', 'in:true,false'],
            // Feature toggles (stored as 'true'/'false' strings)
            'allow_user_templates' => ['sometimes', 'in:true,false'],
            'payment_enabled_user' => ['sometimes', 'in:true,false'],
            'payment_enabled_vendor' => ['sometimes', 'in:true,false'],
            'payment_enabled_affiliate' => ['sometimes', 'in:true,false'],
            // Pay-per-entry RSVP (vendor ticketed events): master switch + a flexible
            // list of platform charges (commission / FPX / SST / …) + pass grace.
            'pay_per_entry_enabled' => ['sometimes', 'in:true,false'],
            'pay_per_entry_charges' => ['sometimes', 'array', 'max:20'],
            'pay_per_entry_charges.*.name' => ['required', 'string', 'max:40'],
            'pay_per_entry_charges.*.mode' => ['required', 'in:percent,flat'],
            'pay_per_entry_charges.*.value' => ['required', 'numeric', 'min:0', 'max:100000'],
            'pay_per_entry_grace_days' => ['sometimes', 'integer', 'min:0', 'max:365'],
            // Admin-imported Google Fonts for the card display-font picker.
            'card_fonts' => ['sometimes', 'array', 'max:100'],
            'card_fonts.*.id' => ['required', 'string', 'max:60'],
            'card_fonts.*.label' => ['required', 'string', 'max:60'],
            'card_fonts.*.google' => ['required', 'string', 'max:160'],
            'card_fonts.*.stack' => ['required', 'string', 'max:200'],
            'card_fonts.*.group' => ['required', 'in:serif,script,display,sans'],
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
            // Default song for Preview + Test mode.
            'preview_song_url' => $all['preview_song_url'] ?? '',
            'preview_song_start' => (int) ($all['preview_song_start'] ?? 0),
            'preview_song_end' => isset($all['preview_song_end']) && $all['preview_song_end'] !== '' && $all['preview_song_end'] !== null ? (int) $all['preview_song_end'] : null,
            // Business identity for receipts/invoices (shown to buyers).
            'receipt_company_name' => $all['receipt_company_name'],
            'receipt_description' => $all['receipt_description'],
            'receipt_phone' => $all['receipt_phone'],
            'receipt_website' => $all['receipt_website'],
            'receipt_email' => $all['receipt_email'],
            // Admin-imported card fonts, so the editor + live cards can register them.
            'card_fonts' => is_array($all['card_fonts'] ?? null) ? array_values($all['card_fonts']) : [],
        ]);
    }
}
