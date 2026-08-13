<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Support\Str;

/**
 * The card animations available to hosts.
 *
 * Read straight off disk rather than from a table: an animation is a file you
 * drop into public/lottie, and requiring a database row to go with it would
 * turn a thirty-second job into a deploy.
 */
class MotionController extends Controller
{
    /** Anything larger than this makes a card slow to open on mobile data. */
    private const MAX_BYTES = 512_000;

    public function index()
    {
        $dir = public_path('lottie');
        if (! is_dir($dir)) {
            return response()->json([]);
        }

        $files = collect(glob($dir.'/*.json') ?: [])
            ->filter(fn (string $path) => filesize($path) <= self::MAX_BYTES)
            ->map(fn (string $path) => [
                'file' => basename($path),
                // "petals-fall.json" reads as "Petals Fall" without anyone
                // having to maintain a label alongside the file.
                'label' => Str::of(basename($path, '.json'))->replace(['-', '_'], ' ')->title()->toString(),
                'size_kb' => (int) round(filesize($path) / 1024),
            ])
            ->sortBy('label')
            ->values();

        return response()->json($files);
    }
}
