<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TemplateFavorite;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FavoriteController extends Controller
{
    /** GET /me/favorites — the template keys this user has saved. */
    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'keys' => TemplateFavorite::where('user_id', $request->user()->id)
                ->pluck('template_key')
                ->values(),
        ]);
    }

    /** POST /me/favorites/toggle — save (create) or unsave (delete) a design for this user. */
    public function toggle(Request $request): JsonResponse
    {
        $data = $request->validate([
            'key' => ['required', 'string', 'exists:templates,key'],
        ]);

        $userId = $request->user()->id;

        $existing = TemplateFavorite::where('user_id', $userId)
            ->where('template_key', $data['key'])
            ->first();

        if ($existing) {
            $existing->delete();

            return response()->json(['favorited' => false]);
        }

        TemplateFavorite::create([
            'user_id' => $userId,
            'template_key' => $data['key'],
        ]);

        return response()->json(['favorited' => true]);
    }
}
