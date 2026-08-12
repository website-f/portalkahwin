<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PasswordResetCode extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public string $code,
        public int $ttlMinutes,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Kod Set Semula Kata Laluan · '.$this->code);
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.password_reset_code',
            text: 'emails.password_reset_code_text',
            with: [
                'user' => $this->user,
                'code' => $this->code,
                'ttl' => $this->ttlMinutes,
            ],
        );
    }
}
