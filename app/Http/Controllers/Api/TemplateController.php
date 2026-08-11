<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Template;

class TemplateController extends Controller
{
    /** Public catalog for the gallery. */
    public function index()
    {
        return Template::where('is_active', true)
            ->orderBy('sort_order')
            ->get();
    }

    public function show(string $key)
    {
        return Template::where('key', $key)->where('is_active', true)->firstOrFail();
    }
}
