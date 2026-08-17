<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Package;
use Illuminate\Http\Request;

class PackageController extends Controller
{
    /** Public — active packages only, ordered for the pricing surface. */
    public function publicIndex()
    {
        return Package::where('is_active', true)
            ->orderBy('sort')
            ->orderBy('price_myr')
            ->get();
    }

    /** Admin — every package, ordered by display sort. */
    public function index()
    {
        return Package::orderBy('sort')->orderBy('name')->get();
    }

    public function store(Request $request)
    {
        $package = Package::create($this->validateData($request));

        return response()->json($package, 201);
    }

    public function update(Request $request, Package $package)
    {
        $package->update($this->validateData($request));

        return response()->json($package);
    }

    public function destroy(Package $package)
    {
        $package->delete();

        return response()->json(['ok' => true]);
    }

    private function validateData(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'role_target' => ['required', 'in:any,user,vendor,affiliate'],
            // A package is a subscription PLAN or an à-la-carte add-ON.
            'kind' => ['nullable', 'in:plan,addon'],
            'price_myr' => ['required', 'numeric', 'min:0'],
            'interval' => ['required', 'in:monthly,yearly,once'],
            'features' => ['nullable', 'array'],
            'features.*' => ['string', 'max:160'],
            // The gating keys this package actually unlocks (seating/checkin/…).
            'feature_keys' => ['nullable', 'array'],
            'feature_keys.*' => ['string', 'in:'.implode(',', \App\Models\Setting::FEATURES)],
            'is_active' => ['boolean'],
            'sort' => ['integer', 'min:0'],
        ]);
    }
}
