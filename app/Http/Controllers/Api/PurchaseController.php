<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\Setting;
use App\Models\Template;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class PurchaseController extends Controller
{
    /**
     * A single purchase as a downloadable PDF receipt.
     *
     * Rendered server-side rather than screenshotting the drawer: the output is
     * real selectable text, a fraction of the size, and it keeps ~500 KB of PDF
     * libraries out of the browser bundle. Admins may fetch anyone's receipt;
     * everyone else only their own.
     */
    public function receipt(Request $request, Payment $payment)
    {
        $user = $request->user();
        abort_unless($payment->user_id === $user->id || $user->isAdmin(), 403);

        $names = $payment->template_key
            ? Template::whereIn('key', [$payment->template_key])->pluck('name', 'key')
            : collect();

        $amount = (float) $payment->amount_myr;
        if ($payment->purpose === 'subscription') {
            $items = [['name' => 'Langganan Premium', 'amount' => $amount]];
        } else {
            [, $items] = $this->templatePurchase($payment, $names, $amount);
        }

        $owner = $payment->user;
        $brand = (string) Setting::get('site_name', config('app.name'));

        // dompdf renders webp unreliably, so the header uses a PNG copy of the logo,
        // inlined as a data URI (no remote fetch / chroot concerns).
        $logoFile = public_path('Portal-Kahwin-Logo-Header-2.png');
        $logo = is_file($logoFile) ? 'data:image/png;base64,'.base64_encode((string) file_get_contents($logoFile)) : null;

        $pdf = Pdf::loadView('pdf.receipt', [
            'brand' => $brand,
            'logo' => $logo,
            'company' => (string) Setting::get('receipt_company_name'),
            'description' => (string) Setting::get('receipt_description'),
            'phone' => (string) Setting::get('receipt_phone'),
            'website' => (string) Setting::get('receipt_website'),
            'email' => (string) Setting::get('receipt_email'),
            'receipt' => [
                'reference' => (string) $payment->reference,
                'date' => optional($payment->paid_at ?? $payment->created_at)->format('d/m/Y H:i'),
                'status' => $payment->status,
                'customer' => (string) ($owner->name ?? '—'),
                'email' => (string) ($owner->email ?? ''),
                'items' => $items,
                'amount' => $amount,
            ],
        ]);

        return $pdf->download('resit-'.$payment->reference.'.pdf');
    }

    /** The signed-in user's own purchases, newest first. */
    public function index(Request $request)
    {
        $payments = Payment::where('user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->get();

        // Resolve every template display name we might need in a single query (no N+1).
        // Covers both the `template_key` column and any bundle keys in meta.template_keys.
        $keys = $payments->pluck('template_key')
            ->merge($payments->flatMap(fn (Payment $p) => is_array($p->meta['template_keys'] ?? null) ? $p->meta['template_keys'] : []))
            ->filter()
            ->unique()
            ->values();
        $names = $keys->isEmpty()
            ? collect()
            : Template::whereIn('key', $keys->all())->pluck('name', 'key');

        $data = $payments->map(function (Payment $p) use ($names) {
            $amount = (float) $p->amount_myr;

            if ($p->purpose === 'subscription') {
                $item = 'Premium subscription';
                $items = [['name' => $item, 'amount' => $amount]];
            } else {
                [$item, $items] = $this->templatePurchase($p, $names, $amount);
            }

            return [
                'id' => (string) $p->id,
                'reference' => (string) ($p->reference ?? ''),
                'purpose' => $p->purpose,
                'item' => $item,
                'amount' => $amount,
                'status' => $p->status,
                'date' => optional($p->paid_at)->toISOString(),
                'created_at' => optional($p->created_at)->toISOString(),
                'items' => $items,
            ];
        })->values();

        return response()->json($data);
    }

    /**
     * Derive the short label + line items for a template purchase.
     * Mirrors AdminFinanceController's name derivation, then expands multi-design
     * bundles into one line item each (splitting the charge evenly).
     *
     * @return array{0:string,1:array<int,array{name:string,amount:float}>}
     */
    private function templatePurchase(Payment $p, Collection $names, float $amount): array
    {
        $meta = $p->meta ?? [];

        // Display names of the designs in this purchase (prefer stored names, else map keys).
        $designNames = [];
        if (! empty($meta['template_names']) && is_array($meta['template_names'])) {
            $designNames = array_values(array_filter(array_map('strval', $meta['template_names'])));
        } elseif (! empty($meta['template_keys']) && is_array($meta['template_keys'])) {
            $designNames = array_values(array_map(fn ($k) => (string) ($names[$k] ?? $k), $meta['template_keys']));
        }

        // Short row label.
        if ($p->template_key && $names->has($p->template_key)) {
            $item = (string) $names[$p->template_key];
        } elseif (! empty($meta['template_name'])) {
            $item = (string) $meta['template_name'];
        } elseif (count($designNames) > 0) {
            $item = implode(', ', $designNames);
        } else {
            $item = (string) ($p->template_key ?? 'Template');
        }

        // Line items: one per design (split the charge evenly, remainder on the last row)
        // when the purchase covers several designs; otherwise a single line for the whole amount.
        if (count($designNames) > 1) {
            $n = count($designNames);
            $each = round($amount / $n, 2);
            $running = 0.0;
            $items = [];
            foreach ($designNames as $i => $name) {
                $line = $i === $n - 1 ? round($amount - $running, 2) : $each;
                $running += $line;
                $items[] = ['name' => $name, 'amount' => (float) $line];
            }
        } else {
            $items = [['name' => $item, 'amount' => $amount]];
        }

        return [$item, $items];
    }
}
