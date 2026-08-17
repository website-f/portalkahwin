<?php

namespace App\Console\Commands;

use App\Models\Entitlement;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * Lapse dated package entitlements (plans + add-ons) once they pass their expiry.
 * Marking them 'expired' stops the feature gate from granting their keys and lets
 * the panel prompt the user to renew / continue / switch. The user's `plan`
 * column reverts on its own via isPremium()'s expiry check. Idempotent.
 */
class ExpireEntitlements extends Command
{
    protected $signature = 'entitlements:expire';

    protected $description = 'Mark package entitlements expired once past their expiry date';

    public function handle(): int
    {
        $count = Entitlement::query()
            ->where('status', 'active')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<', now())
            ->update(['status' => 'expired']);

        if ($count > 0) {
            Log::info('entitlements:expire — lapsed entitlements', ['count' => $count]);
            $this->warn("{$count} entitlement(s) expired.");
        } else {
            $this->info('No entitlements to expire.');
        }

        return self::SUCCESS;
    }
}
