<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

/**
 * Sends a probe through whichever mailer .env currently activates and prints the
 * settings it used, so a delivery problem can be pinned to config, transport, or
 * the relay beyond it without reading Exim reports.
 */
class MailTest extends Command
{
    protected $signature = 'mail:test {to : Recipient address}';

    protected $description = 'Send a test message through the active mailer and report the result';

    public function handle(): int
    {
        $to = $this->argument('to');
        $name = config('mail.default');
        $cfg = config('mail.mailers.'.$name, []);

        $this->line('mailer   : '.$name);
        $this->line('host     : '.($cfg['host'] ?? '—').':'.($cfg['port'] ?? '—').'  scheme='.($cfg['scheme'] ?: 'auto'));
        $this->line('username : '.($cfg['username'] ?: '<blank>'));
        $this->line('helo     : '.($cfg['local_domain'] ?? '—'));
        $this->line('from     : '.config('mail.from.address').' ('.config('mail.from.name').')');
        $this->newLine();

        foreach (['username' => 'MAIL_USERNAME', 'password' => 'MAIL_PASSWORD'] as $key => $env) {
            if (blank($cfg[$key] ?? null)) {
                $this->error($env.' is still blank in .env — fill it in before testing.');

                return self::FAILURE;
            }
        }

        if (blank(config('mail.from.address'))) {
            $this->error('MAIL_FROM_ADDRESS is still blank in .env.');

            return self::FAILURE;
        }

        try {
            Mail::raw(
                "Ujian penghantaran PortalKahwin.\n\nJika anda membaca mesej ini, konfigurasi mel sudah berfungsi.",
                fn ($m) => $m->to($to)->subject('Ujian mel PortalKahwin'),
            );
        } catch (\Throwable $e) {
            $this->error('REJECTED by '.($cfg['host'] ?? 'mailer').': '.$e->getMessage());

            return self::FAILURE;
        }

        $this->info('Accepted by '.($cfg['host'] ?? 'the mailer').'.');
        $this->line('Now check '.$to.', including spam.');

        // Acceptance is only proof of hand-off. A relay that filters downstream
        // (the cPanel/MailSentinel path) can still reject minutes later.
        if (str_contains((string) ($cfg['host'] ?? ''), 'portalkahwin.com')) {
            $this->warn('This relay filters downstream — if nothing arrives, check cPanel → Email → Track Delivery.');
        }

        return self::SUCCESS;
    }
}
