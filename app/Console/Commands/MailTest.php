<?php

namespace App\Console\Commands;

use App\Mail\PasswordResetCode;
use App\Mail\PurchaseReceipt;
use App\Mail\RsvpConfirmation;
use App\Mail\SeatAssigned;
use App\Mail\VendorApproved;
use App\Mail\WelcomeMail;
use App\Models\Invitation;
use App\Models\Payment;
use App\Models\RsvpGuest;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Mail\Mailable;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

/**
 * Sends a probe through whichever mailer .env currently activates and prints the
 * settings it used, so a delivery problem can be pinned to config, transport, or
 * the relay beyond it without reading Exim reports.
 *
 * With --all, sends a real sample of every account/billing notification (built
 * from in-memory demo data) so the superadmin can eyeball each template + confirm
 * delivery end to end.
 */
class MailTest extends Command
{
    protected $signature = 'mail:test {to : Recipient address} {--all : Send a sample of every notification instead of a raw probe}';

    protected $description = 'Send a test message (or a sample of every notification) through the active mailer';

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

        return $this->option('all') ? $this->sendAll($to) : $this->sendProbe($to, $cfg);
    }

    /** The original single raw probe — proves transport/config works. */
    private function sendProbe(string $to, array $cfg): int
    {
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

        if (str_contains((string) ($cfg['host'] ?? ''), 'portalkahwin.com')) {
            $this->warn('This relay filters downstream — if nothing arrives, check cPanel → Email → Track Delivery.');
        }

        return self::SUCCESS;
    }

    /**
     * Send a real sample of every account/billing notification, built from
     * in-memory demo models (nothing is written to the database). RSVP/seat/pass
     * notifications that only fire from a real guest action are represented by the
     * RSVP + seat samples here.
     */
    private function sendAll(string $to): int
    {
        // Shared demo actors (unsaved — never persisted).
        $user = new User(['name' => 'Ahmad & Siti', 'email' => $to, 'role' => 'vendor', 'company_name' => 'Contoh Enterprise Sdn Bhd']);

        $payment = new Payment([
            'purpose' => 'template', 'reference' => 'DEMO-'.Str::upper(Str::random(6)),
            'amount_myr' => 69, 'status' => 'paid', 'meta' => ['template_names' => ['Khat Zamrud']],
        ]);
        $payment->paid_at = now();
        $payment->setRelation('user', $user);

        $inv = new Invitation([
            'slug' => 'contoh-kad', 'groom_name' => 'Ahmad', 'bride_name' => 'Siti',
            'groom_short' => 'Ahmad', 'bride_short' => 'Siti',
            'venue_name' => 'Dewan Seri Melati, Kajang', 'date_label' => 'Sabtu, 12 Disember 2026',
            'time_label' => '11:00 pagi – 4:00 petang',
        ]);
        $inv->setRelation('user', $user);

        $guest = new RsvpGuest(['name' => 'Tetamu Contoh', 'pax' => 2, 'status' => 'attending']);
        $seatUrl = rtrim(config('app.url'), '/').'/e/contoh-kad/meja/demo';

        /** @var array<string, Mailable> $suite */
        $suite = [
            'Welcome (aktif)' => new WelcomeMail($user, false),
            'Welcome (menunggu kelulusan)' => new WelcomeMail($user, true),
            'Resit pembelian' => new PurchaseReceipt($payment),
            'Akaun diluluskan' => new VendorApproved($user),
            'Kod set semula kata laluan' => new PasswordResetCode($user, '482913', 30),
            'Pengesahan RSVP' => new RsvpConfirmation($guest, $inv, 'Meja 3', $seatUrl),
            'Tempat duduk ditetapkan' => new SeatAssigned($guest, $inv, 'Meja 3', $seatUrl),
        ];

        $sent = 0;
        $failed = 0;
        foreach ($suite as $label => $mailable) {
            try {
                Mail::to($to)->send($mailable);
                $this->info('  ✓ '.$label);
                $sent++;
            } catch (\Throwable $e) {
                $this->error('  ✗ '.$label.' — '.$e->getMessage());
                $failed++;
            }
        }

        $this->newLine();
        $this->line("Sent {$sent}, failed {$failed}. Check {$to} (including spam).");

        return $failed === 0 ? self::SUCCESS : self::FAILURE;
    }
}
