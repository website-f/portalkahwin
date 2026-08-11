<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\VisitorEvent;
use Illuminate\Http\Request;

class TrackingController extends Controller
{
    /** PUBLIC — records a page view for admin traffic analytics. */
    public function store(Request $request)
    {
        $data = $request->validate([
            'path' => ['required', 'string', 'max:300'],
            'referrer' => ['nullable', 'string', 'max:300'],
            'session_id' => ['nullable', 'string', 'max:120'],
        ]);

        VisitorEvent::create([
            'path' => $data['path'],
            'referrer' => $data['referrer'] ?? null,
            'session_id' => $data['session_id'] ?? null,
            'ip' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 512),
            'created_at' => now(),
        ]);

        return response()->noContent();
    }
}
