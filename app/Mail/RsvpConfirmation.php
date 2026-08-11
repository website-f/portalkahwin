<?php

namespace App\Mail;

use App\Models\Invitation;
use App\Models\RsvpGuest;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class RsvpConfirmation extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public RsvpGuest $guest,
        public Invitation $invitation,
        public ?string $seatInfo = null,
    ) {}

    public function envelope(): Envelope
    {
        $couple = $this->invitation->bride_name.' & '.$this->invitation->groom_name;

        return new Envelope(subject: 'Pengesahan RSVP · '.$couple);
    }

    public function content(): Content
    {
        // An HTML-only body is a standing spam signal (SpamAssassin MIME_HTML_ONLY),
        // so ship a plain-text alternative alongside it.
        return new Content(
            view: 'emails.rsvp',
            text: 'emails.rsvp_text',
            with: [
                'guest' => $this->guest,
                'inv' => $this->invitation,
                'seatInfo' => $this->seatInfo,
                'cardUrl' => rtrim(config('app.url'), '/').'/e/'.$this->invitation->slug,
            ],
        );
    }
}
