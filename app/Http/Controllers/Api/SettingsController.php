<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    /** Admin — all editable settings merged over defaults. */
    public function index()
    {
        return response()->json(Setting::allMerged());
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
            // Feature toggles (stored as 'true'/'false' strings)
            'allow_user_templates' => ['sometimes', 'in:true,false'],
            'payment_enabled_user' => ['sometimes', 'in:true,false'],
            'payment_enabled_vendor' => ['sometimes', 'in:true,false'],
            'payment_enabled_affiliate' => ['sometimes', 'in:true,false'],
            // When ON, guests see only their own name in the seating view.
            'seat_names_private' => ['sometimes', 'in:true,false'],
        ]);

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
        ]);
    }
}
