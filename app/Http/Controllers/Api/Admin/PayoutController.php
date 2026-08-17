<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\EntryPayment;
use App\Models\Setting;
use App\Models\User;
use App\Models\VendorPayout;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Superadmin — the single management surface for pay-per-entry money.
 *
 * The platform collects every guest payment (entry_payments); this controller
 * shows the whole book grouped per vendor (so no two vendors' money clashes) and
 * lets the superadmin release what is owed to a vendor as a recorded payout with a
 * printable receipt. Commission and grace settings are edited in Admin → Settings.
 */
class PayoutController extends Controller
{
    /** All collections, per-vendor balances, and global totals. */
    public function index(Request $request)
    {
        $vendorId = $request->input('vendor');

        $paid = EntryPayment::where('status', 'paid')
            ->with('vendor:id,name,email,company_name')
            ->get();

        // Per-vendor balances (over ALL paid, so the release amounts are correct
        // regardless of the table filter below). Deleted vendors (vendor_id null)
        // drop out of the card list but their rows stay in the audit table.
        $vendors = $paid->filter(fn (EntryPayment $p) => $p->vendor_id !== null)
            ->groupBy('vendor_id')->map(function ($grp) {
            $v = $grp->first()->vendor;

            return [
                'vendor_id' => (int) $grp->first()->vendor_id,
                'vendor_name' => $v?->company_name ?: $v?->name,
                'vendor_email' => $v?->email,
                'entries' => $grp->count(),
                'collected' => round((float) $grp->sum('amount'), 2),
                'fees' => round((float) $grp->sum('platform_fee'), 2),
                'net' => round((float) $grp->sum('vendor_net'), 2),
                'released' => round((float) $grp->whereNotNull('payout_id')->sum('vendor_net'), 2),
                'pending_release' => round((float) $grp->whereNull('payout_id')->sum('vendor_net'), 2),
            ];
        })->sortByDesc('pending_release')->values();

        // Rows for the table (optionally scoped to one vendor).
        $rows = ($vendorId ? $paid->where('vendor_id', (int) $vendorId) : $paid)
            ->concat(EntryPayment::where('status', '!=', 'paid')
                ->when($vendorId, fn ($q) => $q->where('vendor_id', (int) $vendorId))
                ->with('vendor:id,name,email,company_name')->latest()->limit(200)->get())
            ->sortByDesc('created_at')
            ->take(400)
            ->map(fn (EntryPayment $p) => $this->row($p))
            ->values();

        return response()->json([
            'enabled' => Setting::payPerEntryEnabled(),
            // The current (editable) charge list + how the platform's actual income
            // so far breaks down by charge name (from each payment's frozen snapshot).
            'charges' => Setting::payPerEntryCharges(),
            'grace_days' => Setting::payPerEntryGraceDays(),
            'charge_breakdown' => self::breakdown($paid),
            'totals' => [
                'entries' => $paid->count(),
                'collected' => round((float) $paid->sum('amount'), 2),
                'commission' => round((float) $paid->sum('platform_fee'), 2),
                'vendor_net' => round((float) $paid->sum('vendor_net'), 2),
                'released' => round((float) $paid->whereNotNull('payout_id')->sum('vendor_net'), 2),
                'pending_release' => round((float) $paid->whereNull('payout_id')->sum('vendor_net'), 2),
            ],
            'vendors' => $vendors,
            'rows' => $rows,
        ]);
    }

    /** One vendor's full pay-per-entry book — their events, entries and payouts. */
    public function vendorDetail(User $vendor)
    {
        $payments = EntryPayment::where('vendor_id', $vendor->id)
            ->with('invitation:id,slug,groom_name,bride_name,groom_short,bride_short')
            ->latest()->get();

        $paid = $payments->where('status', 'paid');

        // The vendor's collections grouped per event (invitation).
        $events = $paid->groupBy('invitation_id')->map(function ($grp) {
            $inv = $grp->first()->invitation;
            $a = $inv?->groom_short ?: $inv?->groom_name;
            $b = $inv?->bride_short ?: $inv?->bride_name;

            return [
                'invitation_id' => $grp->first()->invitation_id,
                'event' => $inv ? trim(trim((string) $a).' & '.trim((string) $b), ' &') : '—',
                'slug' => $inv?->slug,
                'entries' => $grp->count(),
                'pax' => (int) $grp->sum('pax'),
                'collected' => round((float) $grp->sum('amount'), 2),
                'charges' => round((float) $grp->sum('platform_fee'), 2),
                'net' => round((float) $grp->sum('vendor_net'), 2),
            ];
        })->sortByDesc('collected')->values();

        return response()->json([
            'vendor' => [
                'id' => $vendor->id,
                'name' => $vendor->company_name ?: $vendor->name,
                'email' => $vendor->email,
                'phone' => $vendor->phone,
            ],
            'summary' => [
                'entries' => $paid->count(),
                'collected' => round((float) $paid->sum('amount'), 2),
                'charges' => round((float) $paid->sum('platform_fee'), 2),
                'net' => round((float) $paid->sum('vendor_net'), 2),
                'released' => round((float) $paid->whereNotNull('payout_id')->sum('vendor_net'), 2),
                'pending_release' => round((float) $paid->whereNull('payout_id')->sum('vendor_net'), 2),
            ],
            'charge_breakdown' => self::breakdown($paid),
            'events' => $events,
            'payments' => $payments->map(fn (EntryPayment $p) => $this->row($p))->values(),
            'payouts' => $vendor->payouts()->latest()->get(),
        ]);
    }

    /** List released payouts (receipts). */
    public function payouts()
    {
        $payouts = VendorPayout::with('vendor:id,name,company_name,email')
            ->latest()->limit(300)->get();

        return response()->json($payouts);
    }

    /**
     * Release everything currently owed to one vendor (or a chosen subset) as a
     * single recorded payout — the receipt printed for both sides.
     */
    public function release(Request $request)
    {
        $data = $request->validate([
            'vendor_id' => ['required', 'integer', 'exists:users,id'],
            'adjustment' => ['nullable', 'numeric', 'min:-1000000', 'max:1000000'],
            'method' => ['nullable', 'string', 'max:60'],
            'note' => ['nullable', 'string', 'max:500'],
            'entry_ids' => ['nullable', 'array'],
            'entry_ids.*' => ['uuid'],
            // Proof of transfer (bank receipt) the vendor will acknowledge.
            'attachment' => ['nullable', 'file', 'max:'.Setting::maxUploadKb(), 'mimetypes:image/jpeg,image/png,image/webp,application/pdf'],
        ]);

        $vendor = User::findOrFail($data['vendor_id']);

        $entries = EntryPayment::where('vendor_id', $vendor->id)
            ->where('status', 'paid')
            ->whereNull('payout_id')
            ->when(! empty($data['entry_ids']), fn ($q) => $q->whereIn('id', $data['entry_ids']))
            ->get();

        if ($entries->isEmpty()) {
            return response()->json(['message' => 'Tiada bayaran yang belum dilepaskan untuk vendor ini.'], 422);
        }

        $gross = round((float) $entries->sum('amount'), 2);
        $fee = round((float) $entries->sum('platform_fee'), 2);
        $adj = round((float) ($data['adjustment'] ?? 0), 2);
        $net = round((float) $entries->sum('vendor_net') + $adj, 2);

        $payout = DB::transaction(function () use ($vendor, $entries, $gross, $fee, $adj, $net, $data, $request) {
            $payout = VendorPayout::create([
                'vendor_id' => $vendor->id,
                'reference' => 'PO-'.Str::upper(Str::random(8)),
                'gross' => $gross,
                'fee_total' => $fee,
                'adjustment' => $adj,
                'net' => $net,
                'entries_count' => $entries->count(),
                'method' => $data['method'] ?? null,
                'note' => $data['note'] ?? null,
                'released_by' => $request->user()->id,
                'released_at' => now(),
                'status' => 'released',
            ]);

            EntryPayment::whereIn('id', $entries->pluck('id'))->update(['payout_id' => $payout->id]);

            return $payout;
        });

        // Store the proof of transfer (outside the txn — file IO isn't rolled back).
        if ($request->hasFile('attachment')) {
            $path = $request->file('attachment')->store("payouts/{$vendor->id}", 'public');
            $payout->update(['attachment' => $path]);
        }

        return response()->json($payout->fresh()->load('vendor:id,name,company_name,email'), 201);
    }

    /**
     * Delete a fully-settled vendor straight from the pay-per-entry surface.
     * Refuses while anything is still owed (unreleased). Their collections &
     * payouts survive as snapshots (audit trail); only their own event data goes.
     */
    public function deleteVendor(Request $request, User $vendor)
    {
        abort_if(in_array($vendor->role, ['admin', 'superadmin'], true), 422, 'Akaun ini tidak boleh dipadam di sini.');

        $pending = EntryPayment::where('vendor_id', $vendor->id)
            ->where('status', 'paid')->whereNull('payout_id')->sum('vendor_net');
        abort_if(round((float) $pending, 2) > 0, 422, 'Vendor ini masih ada baki belum dilepaskan. Lepaskan bayaran dahulu.');

        DB::transaction(function () use ($vendor) {
            $vendor->snapshotFinancialsForDeletion();
            $vendor->invitations()->get()->each(fn ($inv) => $inv->delete()); // cascades guests/seats/media
            $vendor->forceDelete();
        });

        return response()->json(['ok' => true]);
    }

    /** Reverse a payout — its entries become unreleased again. */
    public function void(VendorPayout $payout)
    {
        if ($payout->status !== 'void') {
            DB::transaction(function () use ($payout) {
                EntryPayment::where('payout_id', $payout->id)->update(['payout_id' => null]);
                $payout->update(['status' => 'void']);
            });
        }

        return response()->json($payout->fresh());
    }

    /** Download the payout receipt as a PDF (our logo + simple item breakdown). */
    public function receiptPdf(VendorPayout $payout)
    {
        return \App\Services\PayoutReceipt::download($payout);
    }

    /** Printable receipt data for one released payout. */
    public function receipt(VendorPayout $payout)
    {
        $payout->load(['vendor:id,name,company_name,email,phone', 'releasedBy:id,name', 'entries']);
        $all = Setting::allMerged();

        return response()->json([
            'payout' => [
                'reference' => $payout->reference,
                'released_at' => optional($payout->released_at)->toIso8601String(),
                'released_by' => $payout->releasedBy?->name,
                'gross' => (float) $payout->gross,
                'fee_total' => (float) $payout->fee_total,
                'adjustment' => (float) $payout->adjustment,
                'net' => (float) $payout->net,
                'entries_count' => (int) $payout->entries_count,
                'method' => $payout->method,
                'note' => $payout->note,
                'attachment_url' => $payout->attachment_url,
                'acknowledged_at' => optional($payout->acknowledged_at)->toIso8601String(),
                'status' => $payout->status,
            ],
            'vendor' => [
                'name' => $payout->vendor?->company_name ?: $payout->vendor?->name,
                'email' => $payout->vendor?->email,
                'phone' => $payout->vendor?->phone,
            ],
            'platform' => [
                'name' => $all['receipt_company_name'] ?? config('app.name'),
                'phone' => $all['receipt_phone'] ?? null,
                'email' => $all['receipt_email'] ?? null,
                'website' => $all['receipt_website'] ?? null,
            ],
            'currency' => config('services.hitpay.currency', 'MYR'),
            // Itemised platform charges withheld across this payout's entries.
            'charge_breakdown' => self::breakdown($payout->entries),
            'entries' => $payout->entries->map(fn (EntryPayment $p) => [
                'reference' => $p->reference,
                'payer_name' => $p->payer_name,
                'paid_at' => optional($p->paid_at)->toIso8601String(),
                'pax' => (int) $p->pax,
                'amount' => (float) $p->amount,
                'platform_fee' => (float) $p->platform_fee,
                'vendor_net' => (float) $p->vendor_net,
            ])->values(),
        ]);
    }

    /**
     * Aggregate the platform's income by charge name across a set of paid entries.
     * Entries frozen before the itemised-charges column fall back to one
     * "Commission" line equal to their platform_fee, so nothing is lost.
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

    private function row(EntryPayment $p): array
    {
        $v = $p->vendor;

        return [
            'id' => $p->id,
            'reference' => $p->reference,
            'created_at' => optional($p->created_at)->toIso8601String(),
            'paid_at' => optional($p->paid_at)->toIso8601String(),
            'vendor_id' => (int) $p->vendor_id,
            // Fall back to the frozen snapshot once the vendor account is gone.
            'vendor_name' => $v?->company_name ?: $v?->name ?: $p->vendor_name ?: '—',
            'payer_name' => $p->payer_name,
            'payer_email' => $p->payer_email,
            'pax' => (int) $p->pax,
            'amount' => (float) $p->amount,
            'platform_fee' => (float) $p->platform_fee,
            'vendor_net' => (float) $p->vendor_net,
            'status' => $p->status,
            'released' => $p->payout_id !== null,
        ];
    }
}
