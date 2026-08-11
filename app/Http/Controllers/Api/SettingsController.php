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
        ]);
    }
}
