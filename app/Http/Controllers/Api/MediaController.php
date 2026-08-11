<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invitation;
use Illuminate\Http\Request;

class MediaController extends Controller
{
    /** Upload an image or audio file for a card; returns a host-agnostic URL. */
    public function upload(Request $request, Invitation $invitation)
    {
        abort_unless(
            $invitation->user_id === $request->user()->id || $request->user()->isAdmin(),
            403, 'Bukan kad anda.'
        );

        $request->validate([
            'file' => [
                'required', 'file', 'max:8192', // 8 MB
                'mimetypes:image/jpeg,image/png,image/webp,image/gif,audio/mpeg,audio/mp4,audio/aac,audio/ogg,audio/wav',
            ],
        ]);

        $path = $request->file('file')->store("cards/{$invitation->id}", 'public');

        return response()->json(['url' => '/storage/'.$path]);
    }
}
