<?php

namespace App\Services;

use App\Models\EntryPayment;
use App\Models\Setting;
use App\Models\VendorPayout;
use Barryvdh\DomPDF\Facade\Pdf;
use Symfony\Component\HttpFoundation\Response;

/**
 * The vendor-payout receipt PDF — the same clean layout as the template-purchase
 * receipt (platform logo + identity + description + line items + total), NOT the
 * full per-entry collection list. Downloaded by both the superadmin and the vendor.
 */
class PayoutReceipt
{
    public static function download(VendorPayout $payout): Response
    {
        $payout->loadMissing(['vendor', 'entries']);
        $all = Setting::allMerged();

        // A short, human line breakdown: gross → each platform charge deducted →
        // optional adjustment; the grand total is the net actually released.
        $items = [[
            'name' => 'Kutipan RSVP · '.$payout->entries_count.' entri / entries',
            'amount' => (float) $payout->gross,
        ]];
        foreach (self::breakdown($payout->entries) as $c) {
            $items[] = ['name' => $c['name'].' (potongan / deducted)', 'amount' => -1 * (float) $c['amount']];
        }
        if ((float) $payout->adjustment !== 0.0) {
            $items[] = ['name' => 'Pelarasan / Adjustment', 'amount' => (float) $payout->adjustment];
        }

        // Our own logo (platform pays the vendor) — inlined; dompdf can't fetch remotely.
        $logoPath = public_path('Portal-Kahwin-Logo-Header-2.png');
        $logo = is_file($logoPath)
            ? 'data:image/png;base64,'.base64_encode((string) file_get_contents($logoPath))
            : null;

        $pdf = Pdf::loadView('pdf.receipt', [
            'brand' => $all['site_name'] ?? config('app.name'),
            'logo' => $logo,
            'company' => $all['receipt_company_name'] ?? config('app.name'),
            'description' => 'Bayaran Vendor · RSVP Payout Release',
            'address' => null,
            'phone' => $all['receipt_phone'] ?? null,
            'website' => $all['receipt_website'] ?? null,
            'email' => $all['receipt_email'] ?? null,
            'tax' => null,
            'disclaimer' => $payout->note ?: null,
            'receipt' => [
                'reference' => (string) $payout->reference,
                'date' => optional($payout->released_at)->format('d/m/Y H:i'),
                'status' => 'released',
                'customer' => (string) ($payout->vendor?->company_name ?: $payout->vendor?->name ?? '—'),
                'email' => (string) ($payout->vendor?->email ?? ''),
                'items' => $items,
                'amount' => (float) $payout->net,
            ],
        ]);

        return $pdf->download('resit-payout-'.$payout->reference.'.pdf');
    }

    /**
     * Platform income by charge name across the payout's entries, with a fallback
     * to a single "Commission" line for entries frozen before itemisation.
     *
     * @param  \Illuminate\Support\Collection<int,EntryPayment>  $entries
     * @return array<int,array{name:string,amount:float}>
     */
    private static function breakdown($entries): array
    {
        $out = [];
        foreach ($entries as $p) {
            $lines = (array) ($p->charges ?? []);
            if (empty($lines) && (float) $p->platform_fee > 0) {
                $lines = [['name' => 'Commission', 'amount' => (float) $p->platform_fee]];
            }
            foreach ($lines as $c) {
                $name = (string) ($c['name'] ?? 'Charge');
                $out[$name] = round(($out[$name] ?? 0) + (float) ($c['amount'] ?? 0), 2);
            }
        }

        return array_map(fn ($name, $amount) => ['name' => $name, 'amount' => $amount], array_keys($out), array_values($out));
    }
}
