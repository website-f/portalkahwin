<?php

namespace App\Mail;

use App\Models\Payment;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Confirmation + receipt for a completed purchase (template, plan subscription or
 * add-on package). Sent whenever a payment reaches `paid` — a real HitPay
 * settlement or a voucher that fully covers the order.
 */
class PurchaseReceipt extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Payment $payment) {}

    public function envelope(): Envelope
    {
        $isPlan = $this->payment->purpose === 'subscription'
            || ($this->payment->purpose === 'package' && ($this->payment->meta['kind'] ?? null) === 'plan');

        $subject = $isPlan
            ? 'Langganan anda telah aktif · '.config('app.name')
            : 'Resit pembelian anda · '.config('app.name');

        return new Envelope(subject: $subject);
    }

    public function content(): Content
    {
        $p = $this->payment;
        $meta = $p->meta ?? [];

        // A friendly item name across the three purchase kinds.
        $item = 'Pembelian';
        if ($p->purpose === 'subscription') {
            $item = 'Langganan Premium';
        } elseif (! empty($meta['package_name'])) {
            $item = (string) $meta['package_name'];
        } elseif (! empty($meta['template_names']) && is_array($meta['template_names'])) {
            $item = implode(', ', $meta['template_names']);
        } elseif ($p->template_key) {
            $item = (string) $p->template_key;
        }

        $isPlan = $p->purpose === 'subscription' || ($p->purpose === 'package' && ($meta['kind'] ?? null) === 'plan');
        $amount = (float) $p->amount_myr;

        return new Content(
            view: 'emails.purchase',
            text: 'emails.purchase_text',
            with: [
                'user' => $p->user,
                'item' => $item,
                'isPlan' => $isPlan,
                'free' => $amount <= 0,
                'amount' => 'RM '.number_format($amount, 2),
                'reference' => (string) $p->reference,
                'date' => optional($p->paid_at ?? $p->created_at)->format('d M Y, g:i A'),
                'appName' => config('app.name'),
                'purchasesUrl' => rtrim(config('app.url'), '/').'/panel/purchases',
            ],
        );
    }
}
