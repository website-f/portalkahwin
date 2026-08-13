<?php

namespace App\Support;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Stores template cover thumbnails captured in the browser.
 *
 * Thumbnails are rendered client-side from the real template component (see
 * resources/js/lib/thumbnail.ts) and posted here as a data URL. Capturing in the
 * browser means the image always matches what the template actually renders —
 * fonts, gradients, SVG ornaments and all — with no headless browser to install
 * or keep in step with the front-end.
 */
class ThumbnailStore
{
    /** Anything larger than this is a capture bug, not a thumbnail. */
    private const MAX_BYTES = 4_194_304; // 4 MB

    /**
     * Decode a `data:image/png;base64,…` URL and store it under
     * `thumbnails/{slug}-{token}.png`, returning the public path.
     *
     * The token makes each capture a new filename so browsers and CDNs cannot
     * serve a stale cover after a regenerate.
     */
    public static function put(string $dataUrl, string $slug): string
    {
        $binary = self::decode($dataUrl);

        $name = 'thumbnails/'.Str::slug($slug).'-'.Str::lower(Str::random(8)).'.png';
        Storage::disk('public')->put($name, $binary);

        return '/storage/'.$name;
    }

    /** Delete a previously stored thumbnail; ignores anything we did not store. */
    public static function forget(?string $path): void
    {
        if (! $path || ! str_starts_with($path, '/storage/thumbnails/')) {
            return;
        }

        Storage::disk('public')->delete(Str::after($path, '/storage/'));
    }

    /** @throws \InvalidArgumentException when the payload is not a PNG data URL */
    private static function decode(string $dataUrl): string
    {
        if (! preg_match('#^data:image/png;base64,#i', $dataUrl)) {
            throw new \InvalidArgumentException('Thumbnail must be a PNG data URL.');
        }

        $binary = base64_decode(Str::after($dataUrl, 'base64,'), true);

        if ($binary === false || $binary === '') {
            throw new \InvalidArgumentException('Thumbnail is not valid base64.');
        }

        if (strlen($binary) > self::MAX_BYTES) {
            throw new \InvalidArgumentException('Thumbnail is too large.');
        }

        return $binary;
    }
}
