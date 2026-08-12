<?php

namespace App\Console\Commands;

use App\Models\Invitation;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * Auto-disable pass for the affiliate 24-hour window.
 *
 * Affiliate-owned free cards go live for 24h when published (see
 * InvitationController::applyPublishLifecycle). Once that window lapses without a
 * payment, the public endpoint (publicShow) already hides the card behind an
 * "awaiting payment" gate — so this command is not what enforces the block. It is
 * the housekeeping/observability pass: it counts the lapsed cards so the state is
 * visible in logs and can be alerted on. Safe to run repeatedly (idempotent — it
 * mutates nothing).
 */
class ExpireAffiliateCards extends Command
{
    protected $signature = 'cards:expire-affiliate';

    protected $description = 'Report published affiliate free cards whose 24-hour live window has lapsed';

    public function handle(): int
    {
        $lapsed = Invitation::query()
            ->where('status', 'published')
            ->where('is_paid', 0)
            ->whereNotNull('expires_at')
            ->where('expires_at', '<', now())
            ->whereHas('user', fn ($q) => $q->where('role', 'affiliate'))
            ->count();

        if ($lapsed > 0) {
            Log::info('cards:expire-affiliate — lapsed affiliate cards awaiting payment', ['count' => $lapsed]);
            $this->warn("{$lapsed} affiliate card(s) past their 24h window — hidden pending payment.");
        } else {
            $this->info('No lapsed affiliate cards.');
        }

        return self::SUCCESS;
    }
}
