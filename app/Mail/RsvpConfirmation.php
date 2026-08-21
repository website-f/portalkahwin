<?php

namespace App\Mail;

use App\Models\Invitation;
use App\Models\RsvpGuest;
use App\Support\Branding;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
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
        public ?string $seatUrl = null,
    ) {}

    public function envelope(): Envelope
    {
        $couple = $this->invitation->bride_name.' & '.$this->invitation->groom_name;

        // A vendor's card: replies go to the vendor, so the email reads as from them.
        return new Envelope(subject: 'Pengesahan RSVP · '.$couple, replyTo: $this->vendorReplyTo());
    }

    /** @return array<int, Address> */
    private function vendorReplyTo(): array
    {
        $owner = $this->invitation->user;

        return ($owner && $owner->role === 'vendor' && $owner->email)
            ? [new Address($owner->email, $owner->company_name ?: $owner->name)]
            : [];
    }

    public function content(): Content
    {
        // An HTML-only body is a standing spam signal (SpamAssassin MIME_HTML_ONLY),
        // so ship a plain-text alternative alongside it.
        $brand = Branding::forInvitation($this->invitation);

        return new Content(
            view: 'emails.rsvp',
            text: 'emails.rsvp_text',
            with: [
                'guest' => $this->guest,
                'inv' => $this->invitation,
                'seatInfo' => $this->seatInfo,
                'seatUrl' => $this->seatUrl,
                'cardUrl' => rtrim(config('app.url'), '/').'/e/'.$this->invitation->slug,
                'brandLogo' => $brand['logo'],
                'brandName' => $brand['name'],
            ],
        );
    }
}
