<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Wipe every sandbox payment/transaction record so the platform can switch its
 * HitPay keys from sandbox to production on a clean financial ledger.
 *
 * What it clears (and why it is safe):
 *  - payments            template purchases, subscription/add-on + approval fees.
 *                        Template OWNERSHIP is derived from paid `purpose=template`
 *                        rows (User::ownsTemplate), so clearing these revokes the
 *                        fake sandbox purchases automatically.
 *  - entitlements        premium plan / add-on grants (each tied to a payment).
 *  - entry_payments      pay-per-entry guest payments collected for vendors.
 *  - vendor_payouts      the payout batches those entry payments rolled up into.
 *  - affiliate_payouts   affiliate commission batches.
 *  - voucher_redemptions + vouchers.used_count  so promo limits reset for real customers.
 *
 * What it deliberately keeps: users, invitations (their cards), templates,
 * vouchers (the codes themselves), and all other content. Rows are deleted
 * child-before-parent so foreign keys never block, all inside one transaction.
 */
class ResetPayments extends Command
{
    protected $signature = 'payments:reset {--force : Skip the confirmation prompt}';

    protected $description = 'Delete ALL payment/transaction records (sandbox→production reset). Keeps users, cards and templates.';

    /** Deleted child-first so FK constraints (RESTRICT) never block the delete. */
    private const TABLES = [
        'voucher_redemptions',
        'entitlements',
        'entry_payments',
        'payments',
        'vendor_payouts',
        'affiliate_payouts',
    ];

    public function handle(): int
    {
        // Show the damage first so an operator confirms against real counts.
        $counts = [];
        foreach (self::TABLES as $table) {
            $counts[$table] = DB::table($table)->count();
        }
        $vouchersToReset = DB::table('vouchers')->where('used_count', '>', 0)->count();

        $this->newLine();
        $this->line('<comment>This will permanently delete every payment record:</comment>');
        foreach ($counts as $table => $n) {
            $this->line(sprintf('  • %-22s %s row(s)', $table, number_format($n)));
        }
        $this->line(sprintf('  • %-22s %s voucher(s) → used_count reset to 0', 'vouchers', number_format($vouchersToReset)));
        $this->newLine();
        $this->line('<info>Kept intact:</info> users, invitations (cards), templates, voucher codes.');
        $this->newLine();

        if (array_sum($counts) === 0 && $vouchersToReset === 0) {
            $this->info('Nothing to clear — the ledger is already empty.');

            return self::SUCCESS;
        }

        if (! $this->option('force') && ! $this->confirm('Clear all of the above? This cannot be undone.')) {
            $this->warn('Aborted — nothing was changed.');

            return self::SUCCESS;
        }

        $deleted = [];
        DB::transaction(function () use (&$deleted) {
            foreach (self::TABLES as $table) {
                $deleted[$table] = DB::table($table)->delete();
            }
            // Reset only the usage counter; the voucher definitions stay live.
            DB::table('vouchers')->where('used_count', '>', 0)->update(['used_count' => 0]);
        });

        Log::warning('payments:reset — payment ledger cleared', ['deleted' => $deleted]);

        $this->newLine();
        foreach ($deleted as $table => $n) {
            $this->line(sprintf('  ✓ cleared %-22s %s row(s)', $table, number_format($n)));
        }
        $this->info('Payment ledger cleared. Safe to switch HitPay to production keys now.');

        return self::SUCCESS;
    }
}
