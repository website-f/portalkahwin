<?php

namespace App\Console\Commands;

use App\Models\RsvpGuest;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * Retire expired pay-per-entry QR passes.
 *
 * Once a paid guest's pass is past its expiry (event date + grace window), its
 * token is nulled so the public /pass/{token} link stops resolving. The guest and
 * their payment stay on record for the vendor's history and reconciliation — only
 * the live credential is removed. Idempotent; safe to run repeatedly.
 */
class ExpirePasses extends Command
{
    protected $signature = 'passes:expire';

    protected $description = 'Invalidate paid QR passes whose event (plus grace) has passed';

    public function handle(): int
    {
        $count = RsvpGuest::query()
            ->whereNotNull('pass_token')
            ->whereNotNull('pass_expires_at')
            ->where('pass_expires_at', '<', now())
            ->update(['pass_token' => null]);

        if ($count > 0) {
            Log::info('passes:expire — retired expired entry passes', ['count' => $count]);
            $this->warn("{$count} entry pass(es) expired and retired.");
        } else {
            $this->info('No passes to expire.');
        }

        return self::SUCCESS;
    }
}
