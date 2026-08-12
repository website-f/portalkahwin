<?php

namespace App\Support;

use App\Models\Invitation;
use Illuminate\Support\Str;

/**
 * Resolves the vendor branding shown on emails / guest pages for a card.
 * Only VENDOR owners get their company logo + name surfaced; everyone else
 * (normal users, affiliates, admins) falls back to plain PortalKahwin branding.
 */
class Branding
{
    /** @return array{logo: ?string, name: ?string} */
    public static function forInvitation(Invitation $invitation): array
    {
        $owner = $invitation->user;

        if (! $owner || $owner->role !== 'vendor') {
            return ['logo' => null, 'name' => null];
        }

        return [
            'logo' => self::absolute($owner->company_logo),
            'name' => $owner->company_name ?: null,
        ];
    }

    /** Turn a stored asset path into an absolute URL email clients can load. */
    private static function absolute(?string $path): ?string
    {
        if (! $path) {
            return null;
        }
        if (Str::startsWith($path, ['http://', 'https://'])) {
            return $path;
        }

        return rtrim(config('app.url'), '/').'/'.ltrim($path, '/');
    }
}
