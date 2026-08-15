<?php

namespace App\Mail;

use App\Models\EntryPayment;
use App\Models\Invitation;
use App\Models\RsvpGuest;
use App\Support\Branding;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Sent to a guest after a successful pay-per-entry RSVP: the invitation link plus
 * the link to their own (expiring) QR entry pass. Deliberately plain, like the
 * other transactional mail, so the relay doesn't flag it as spam.
 */
class PassIssued extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public RsvpGuest $guest,
        public Invitation $invitation,
        public EntryPayment $payment,
    ) {}

    public function envelope(): Envelope
    {
        $a = $this->invitation->groom_short ?: $this->invitation->groom_name;
        $b = $this->invitation->bride_short ?: $this->invitation->bride_name;

        return new Envelope(subject: 'Tiket & Pas Kehadiran · '.trim($a.' & '.$b, ' &'));
    }

    public function content(): Content
    {
        $brand = Branding::forInvitation($this->invitation);
        $base = rtrim(config('app.url'), '/');

        return new Content(
            view: 'emails.pass_issued',
            text: 'emails.pass_issued_text',
            with: [
                'guest' => $this->guest,
                'inv' => $this->invitation,
                'payment' => $this->payment,
                'currency' => config('services.hitpay.currency', 'MYR'),
                'cardUrl' => $base.'/e/'.$this->invitation->slug,
                'passUrl' => $this->guest->pass_token ? $base.'/pass/'.$this->guest->pass_token : null,
                'brandName' => $brand['name'],
            ],
        );
    }
}
