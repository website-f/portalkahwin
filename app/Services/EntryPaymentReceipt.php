<?php

namespace App\Services;

use App\Models\EntryPayment;
use App\Models\Setting;
use Barryvdh\DomPDF\Facade\Pdf;
use Symfony\Component\HttpFoundation\Response;

/**
 * The receipt a GUEST gets for a pay-per-entry RSVP — issued by the vendor who runs
 * the event, so the vendor can hand it to the attendee as proof of payment. Branded
 * with the vendor's own business identity when they have one, otherwise the platform.
 */
class EntryPaymentReceipt
{
    public static function download(EntryPayment $payment): Response
    {
        $payment->loadMissing(['vendor', 'invitation']);
        $vendor = $payment->vendor;
        $all = Setting::allMerged();

        // Prefer the vendor's own business identity on the receipt; fall back to the
        // platform brand when they haven't filled a company name.
        $block = $vendor ? $vendor->sellerReceiptBlock() : ['company' => '', 'logo' => null, 'address' => '', 'phone' => '', 'email' => '', 'tax' => ''];
        $useVendor = $vendor && trim((string) $block['company']) !== '';

        $company = $useVendor ? $block['company'] : ($all['receipt_company_name'] ?? config('app.name'));
        $logo = $useVendor && $block['logo'] ? self::inlineImage($block['logo']) : self::inlinePublic(public_path('Portal-Kahwin-Logo-Header-2.png'));

        $inv = $payment->invitation;
        $event = $inv?->event_name
            ?: ($inv ? trim(trim((string) ($inv->groom_short ?: $inv->groom_name)).' & '.trim((string) ($inv->bride_short ?: $inv->bride_name)), ' &') : null)
            ?: 'RSVP';
        $pax = max(1, (int) $payment->pax);

        $pdf = Pdf::loadView('pdf.receipt', [
            'brand' => $all['site_name'] ?? config('app.name'),
            'logo' => $logo,
            'company' => $company,
            'description' => 'Resit Kehadiran RSVP · Event Entry Receipt',
            'address' => $useVendor ? ($block['address'] ?: null) : null,
            'phone' => $useVendor ? ($block['phone'] ?: null) : ($all['receipt_phone'] ?? null),
            'website' => $useVendor ? null : ($all['receipt_website'] ?? null),
            'email' => $useVendor ? ($block['email'] ?: null) : ($all['receipt_email'] ?? null),
            'tax' => $useVendor ? ($block['tax'] ?: null) : null,
            'disclaimer' => null,
            'receipt' => [
                'reference' => (string) $payment->reference,
                'date' => optional($payment->paid_at ?? $payment->created_at)->format('d/m/Y H:i'),
                'status' => $payment->status,
                'customer' => (string) ($payment->payer_name ?: '—'),
                'email' => (string) ($payment->payer_email ?? ''),
                'items' => [[
                    'name' => 'Kemasukan RSVP · '.$event.' · '.$pax.' pax',
                    'amount' => (float) $payment->amount,
                ]],
                'amount' => (float) $payment->amount,
            ],
        ]);

        return $pdf->download('resit-rsvp-'.$payment->reference.'.pdf');
    }

    /** Inline a /storage/… image as a data URI (dompdf can't fetch remotely). */
    private static function inlineImage(?string $ref): ?string
    {
        if (! $ref) return null;
        $rel = ltrim(\Illuminate\Support\Str::after($ref, '/storage/'), '/');
        $path = storage_path('app/public/'.$rel);

        return is_file($path) ? self::inlinePublic($path) : null;
    }

    /** Inline an absolute file path as a data URI. */
    private static function inlinePublic(?string $path): ?string
    {
        if (! $path || ! is_file($path)) return null;
        $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        $mime = match ($ext) { 'png' => 'image/png', 'jpg', 'jpeg' => 'image/jpeg', 'gif' => 'image/gif', 'webp' => 'image/webp', 'svg' => 'image/svg+xml', default => 'image/png' };

        return 'data:'.$mime.';base64,'.base64_encode((string) file_get_contents($path));
    }
}
