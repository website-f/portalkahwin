<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class VendorApproved extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public User $user) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Tahniah! Akaun anda telah diluluskan · '.config('app.name'));
    }

    public function content(): Content
    {
        // An HTML-only body is a standing spam signal (SpamAssassin MIME_HTML_ONLY),
        // so ship a plain-text alternative alongside it.
        return new Content(
            view: 'emails.vendor_approved',
            text: 'emails.vendor_approved_text',
            with: [
                'user' => $this->user,
                'roleLabel' => $this->user->isAffiliate() ? 'affiliate' : 'vendor',
                'appName' => config('app.name'),
                'loginUrl' => rtrim(config('app.url'), '/').'/login',
            ],
        );
    }
}
