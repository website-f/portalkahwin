<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\Template;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class PurchaseController extends Controller
{
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
