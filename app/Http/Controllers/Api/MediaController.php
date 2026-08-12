<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\Invitation;
use App\Models\Setting;
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
                'required', 'file', 'max:'.Setting::maxUploadKb(), // superadmin-configurable
                'mimetypes:image/jpeg,image/png,image/webp,image/gif,audio/mpeg,audio/mp4,audio/aac,audio/ogg,audio/wav',
            ],
        ]);

        $user = $request->user();
        $file = $request->file('file');

        // Snapshot size + kind before the file is moved out of its temp location.
        $size = (int) $file->getSize();
        $kind = str_starts_with((string) $file->getMimeType(), 'image/') ? 'image' : 'audio';

        // Enforce the uploader's quota (remaining MB → bytes) before storing.
        if ($user->storageRemainingMb() * 1_048_576 < $size) {
            return response()->json([
                'message' => 'Storan tidak mencukupi. Sila mohon tambah storan.',
            ], 422);
        }

        $path = $file->store("cards/{$invitation->id}", 'public');

        Asset::create([
            'user_id' => $user->id,
            'invitation_id' => $invitation->id,
            'path' => $path,
            'size_bytes' => $size,
            'kind' => $kind,
        ]);

        return response()->json(['url' => '/storage/'.$path]);
    }
}
