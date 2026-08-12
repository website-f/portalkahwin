<?php

namespace App\Mail;

use App\Models\Invitation;
use App\Models\RsvpGuest;
use App\Support\Branding;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Sent when a host seats a guest after their RSVP confirmation already went out,
 * so the guest learns their table without having to keep the link open.
 */
class SeatAssigned extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public RsvpGuest $guest,
        public Invitation $invitation,
        public string $seatInfo,
        public string $seatUrl,
    ) {}

    public function envelope(): Envelope
    {
        $couple = $this->invitation->bride_name.' & '.$this->invitation->groom_name;

        return new Envelope(subject: 'Tempat Duduk Anda · '.$couple);
    }

    public function content(): Content
    {
        $brand = Branding::forInvitation($this->invitation);

        return new Content(
            view: 'emails.seat_assigned',
            text: 'emails.seat_assigned_text',
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
