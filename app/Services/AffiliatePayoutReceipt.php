<?php

namespace App\Services;

use App\Models\AffiliatePayout;
use App\Models\Setting;
use Barryvdh\DomPDF\Facade\Pdf;
use Symfony\Component\HttpFoundation\Response;

/**
 * The affiliate commission-payout receipt PDF — same clean layout as the other
 * receipts, but it leads with "Affiliate Agent: CODE" and itemises the commission
 * (rate × referred/reseller sales). Downloaded by both the superadmin and the
 * affiliate for their records.
 */
class AffiliatePayoutReceipt
{
    public static function download(AffiliatePayout $payout): Response
    {
        $payout->loadMissing('affiliate');
        $all = Setting::allMerged();

        $code = $payout->affiliate?->referral_code;
        $items = [[
            'name' => 'Jualan dirujuk / Referred sales · '.$payout->payments_count.' jualan',
            'amount' => (float) $payout->gross,
        ], [
            'name' => 'Komisen / Commission ('.rtrim(rtrim(number_format((float) $payout->rate_percent, 2), '0'), '.').'%)',
            'amount' => (float) $payout->amount,
        ]];

        $logoPath = public_path('Portal-Kahwin-Logo-Header-2.png');
        $logo = is_file($logoPath)
            ? 'data:image/png;base64,'.base64_encode((string) file_get_contents($logoPath))
            : null;

        $pdf = Pdf::loadView('pdf.receipt', [
            'brand' => $all['site_name'] ?? config('app.name'),
            'logo' => $logo,
            'company' => $all['receipt_company_name'] ?? config('app.name'),
            'description' => 'Komisen Afiliat · Affiliate Commission Payout',
            'address' => null,
            'phone' => $all['receipt_phone'] ?? null,
            'website' => $all['receipt_website'] ?? null,
            'email' => $all['receipt_email'] ?? null,
            'tax' => null,
            'agent_code' => $code,
            'disclaimer' => $payout->note ?: null,
            'receipt' => [
                'reference' => (string) $payout->reference,
                'date' => optional($payout->released_at)->format('d/m/Y H:i'),
                'status' => 'released',
                'customer' => (string) ($payout->affiliate_name ?: $payout->affiliate?->name ?? '—'),
                'email' => (string) ($payout->affiliate_email ?: $payout->affiliate?->email ?? ''),
                'items' => $items,
                'amount' => (float) $payout->amount,
            ],
        ]);

        return $pdf->download('resit-komisen-'.$payout->reference.'.pdf');
    }
}
