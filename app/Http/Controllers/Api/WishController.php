<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invitation;
use Illuminate\Http\Request;

class WishController extends Controller
{
    /** PUBLIC — the guestbook: speeches / ucapan left for the couple on the live card. */
    public function index(string $slug)
    {
        $invitation = Invitation::where('slug', $slug)->where('status', 'published')->firstOrFail();

        $wishes = $invitation->wishes()
            ->latest()
            ->limit(100)
            ->get(['id', 'name', 'message', 'created_at']);

        return response()->json($wishes);
    }

    /** PUBLIC — a guest posts a speech / ucapan (no RSVP required). */
    public function store(Request $request, string $slug)
    {
        $invitation = Invitation::where('slug', $slug)->where('status', 'published')->firstOrFail();

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'message' => ['required', 'string', 'max:600'],
        ]);

        $wish = $invitation->wishes()->create($data);

        return response()->json($wish, 201);
    }
}
