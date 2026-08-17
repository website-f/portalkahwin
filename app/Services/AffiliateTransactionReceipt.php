<?php

namespace App\Services;

use App\Models\Payment;
use App\Models\Setting;
use App\Models\Template;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Symfony\Component\HttpFoundation\Response;

/**
 * The affiliate's OWN copy of a sale they drove — a template purchase by a referred
 * customer (or the affiliate's own reseller buy). Unlike the buyer-facing receipt
 * (PurchaseController), this one ALWAYS leads with the affiliate's code so it is
 * proof of attribution, regardless of the seller-branding opt-in. Downloaded by the
 * affiliate and the superadmin from the "All transactions" tables.
 */
class AffiliateTransactionReceipt
{
    public static function download(Payment $payment, User $affiliate): Response
    {
        $all = Setting::allMerged();
        $amount = (float) $payment->amount_myr;

        $items = self::lineItems($payment, $amount);

        $logoPath = public_path('Portal-Kahwin-Logo-Header-2.png');
        $logo = is_file($logoPath)
            ? 'data:image/png;base64,'.base64_encode((string) file_get_contents($logoPath))
            : null;

        $billed = ReceiptBranding::billedTo($payment);

        $pdf = Pdf::loadView('pdf.receipt', [
            'brand' => $all['site_name'] ?? config('app.name'),
            'logo' => $logo,
            'company' => $all['receipt_company_name'] ?? config('app.name'),
            'description' => 'Jualan dirujuk · Affiliate-referred sale',
            'address' => null,
            'phone' => $all['receipt_phone'] ?? null,
            'website' => $all['receipt_website'] ?? null,
            'email' => $all['receipt_email'] ?? null,
            'tax' => null,
            // Always the affiliate's code — this receipt exists to prove attribution.
            'agent_code' => $affiliate->referral_code,
            'disclaimer' => 'Affiliate: '.trim(($affiliate->company_name ?: $affiliate->name).' ('.$affiliate->referral_code.')'),
            'receipt' => [
                'reference' => (string) $payment->reference,
                'date' => optional($payment->paid_at ?? $payment->created_at)->format('d/m/Y H:i'),
                'status' => $payment->status,
                'customer' => $billed['name'],
                'email' => $billed['email'],
                'items' => $items,
                'amount' => $amount,
            ],
        ]);

        return $pdf->download('resit-jualan-'.$payment->reference.'.pdf');
    }

    /** One line per design in the purchase (splitting the charge), else a single line. */
    private static function lineItems(Payment $payment, float $amount): array
    {
        $meta = $payment->meta ?? [];
        $names = [];
        if (! empty($meta['template_names']) && is_array($meta['template_names'])) {
            $names = array_values(array_filter(array_map('strval', $meta['template_names'])));
        } elseif (! empty($meta['template_keys']) && is_array($meta['template_keys'])) {
            $map = Template::whereIn('key', $meta['template_keys'])->pluck('name', 'key');
            $names = array_values(array_map(fn ($k) => (string) ($map[$k] ?? $k), $meta['template_keys']));
        } elseif ($payment->template_key) {
            $names = [(string) (Template::where('key', $payment->template_key)->value('name') ?? $payment->template_key)];
        }

        if (count($names) > 1) {
            $n = count($names);
            $each = round($amount / $n, 2);
            $running = 0.0;
            $items = [];
            foreach ($names as $i => $name) {
                $line = $i === $n - 1 ? round($amount - $running, 2) : $each;
                $running += $line;
                $items[] = ['name' => $name, 'amount' => (float) $line];
            }

            return $items;
        }

        return [['name' => $names[0] ?? 'Template', 'amount' => $amount]];
    }
}
