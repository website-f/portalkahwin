<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Welcome / onboarding email, sent the moment an account is created. Vendor and
 * affiliate accounts start `pending` (an admin approves them), so the copy adapts:
 * an active user is invited to start; a pending seller is told we'll email once
 * their account is approved.
 */
class WelcomeMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public User $user, public bool $pending = false) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Selamat datang ke '.config('app.name').'!');
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.welcome',
            text: 'emails.welcome_text',
            with: [
                'user' => $this->user,
                'pending' => $this->pending,
                'appName' => config('app.name'),
                'loginUrl' => rtrim(config('app.url'), '/').'/login',
                'panelUrl' => rtrim(config('app.url'), '/').'/panel',
            ],
        );
    }
}
