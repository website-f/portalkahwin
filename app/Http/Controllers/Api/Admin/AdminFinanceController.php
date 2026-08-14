<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\Template;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class AdminFinanceController extends Controller
{
    public function index(Request $request)
    {
        // Optional date-range filter (YYYY-MM-DD). Scopes the totals, top templates
        // and the sales table; the 12-month trend chart always shows full history.
        $data = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);
        // Only paid payments count as sales. Every paid row is needed for the table,
        // so we load them once (with the buyer eager-loaded) and derive all aggregates
        // in PHP — no extra queries, and no DB-specific date SQL.
        $payments = Payment::with('user:id,name,email')
            ->where('status', 'paid')
            ->orderByDesc('paid_at')
            ->get();

        // Resolve template display names in a single query (avoid N+1). Covers both the
        // `template_key` column and any bundle keys stored in meta.template_keys.
        $keys = $payments->pluck('template_key')
            ->merge($payments->flatMap(fn (Payment $p) => is_array($p->meta['template_keys'] ?? null) ? $p->meta['template_keys'] : []))
            ->filter()
            ->unique()
            ->values();
        $names = $keys->isEmpty()
            ? collect()
            : Template::whereIn('key', $keys->all())->pluck('name', 'key');

        $itemName = function (Payment $p) use ($names): string {
            if ($p->purpose === 'subscription') {
                return 'Premium subscription';
            }
            if ($p->template_key && $names->has($p->template_key)) {
                return (string) $names[$p->template_key];
            }
            $meta = $p->meta ?? [];
            if (! empty($meta['template_name'])) {
                return (string) $meta['template_name'];
            }
            if (! empty($meta['template_keys']) && is_array($meta['template_keys'])) {
                return collect($meta['template_keys'])
                    ->map(fn ($k) => $names[$k] ?? $k)
                    ->implode(', ');
            }

            return (string) ($p->template_key ?? 'Template');
        };

        // Revenue per YYYY-MM, then zero-fill the last 12 months chronologically (server-side now()).
        // Built from the FULL history so the trend line is stable regardless of the range filter.
        $revByMonth = $payments
            ->groupBy(fn (Payment $p) => optional($p->paid_at)->format('Y-m'))
            ->map(fn ($grp) => round((float) $grp->sum('amount_myr'), 2));
        $byMonth = collect(range(11, 0))->map(function (int $i) use ($revByMonth) {
            $m = now()->subMonths($i)->format('Y-m');

            return ['month' => $m, 'revenue' => (float) ($revByMonth[$m] ?? 0)];
        })->values();

        // Apply the range filter to everything else.
        $scoped = $payments;
        if (! empty($data['from'])) {
            $start = Carbon::parse($data['from'])->startOfDay();
            $scoped = $scoped->filter(fn (Payment $p) => $p->paid_at && $p->paid_at->gte($start));
        }
        if (! empty($data['to'])) {
            $end = Carbon::parse($data['to'])->endOfDay();
            $scoped = $scoped->filter(fn (Payment $p) => $p->paid_at && $p->paid_at->lte($end));
        }

        $subs = $scoped->where('purpose', 'subscription');
        $tpl = $scoped->where('purpose', 'template');

        // Top 8 templates by revenue (template purchases only).
        $topTemplates = $tpl
            ->map(function (Payment $p) {
                $key = $p->template_key;
                if (! $key) {
                    $mk = $p->meta['template_keys'] ?? null;
                    $key = is_array($mk) && count($mk) ? $mk[0] : null;
                }

                return $key ? ['key' => $key, 'amount' => (float) $p->amount_myr] : null;
            })
            ->filter()
            ->groupBy('key')
            ->map(fn ($grp, $key) => [
                'key' => (string) $key,
                'name' => (string) ($names[$key] ?? $key),
                'orders' => $grp->count(),
                'revenue' => round((float) $grp->sum('amount'), 2),
            ])
            ->sortByDesc('revenue')
            ->take(8)
            ->values();

        $rows = $scoped->map(fn (Payment $p) => [
            'id' => (string) $p->id,
            'date' => optional($p->paid_at)->toISOString(),
            'reference' => (string) ($p->reference ?? ''),
            'customer' => $p->user?->name ?? '—',
            'email' => $p->user?->email ?? '',
            'type' => $p->purpose,
            'item' => $itemName($p),
            'amount' => (float) $p->amount_myr,
            'status' => $p->status,
        ])->values();

        return response()->json([
            'totals' => [
                'revenue' => round((float) $scoped->sum('amount_myr'), 2),
                'subscriptions_revenue' => round((float) $subs->sum('amount_myr'), 2),
                'templates_revenue' => round((float) $tpl->sum('amount_myr'), 2),
                'orders' => $scoped->count(),
                'subs_orders' => $subs->count(),
                'template_orders' => $tpl->count(),
            ],
            'by_month' => $byMonth,
            'top_templates' => $topTemplates,
            'rows' => $rows,
        ]);
    }
}
