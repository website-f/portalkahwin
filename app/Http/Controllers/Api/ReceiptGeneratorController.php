<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * A standalone receipt generator for vendors — NOT tied to any platform
 * transaction. The vendor fills in their own "from" business, a billed-to, and any
 * number of custom line items, and gets a clean PDF using the platform's receipt
 * template. Nothing is stored; it's a tool, not a record.
 */
class ReceiptGeneratorController extends Controller
{
    public function generate(Request $request)
    {
        $user = $request->user();
        abort_unless($user->isVendor() || $user->isAffiliate(), 403, 'Alat ini untuk akaun vendor sahaja.');

        $data = $request->validate([
            'company' => ['required', 'string', 'max:160'],
            'description' => ['nullable', 'string', 'max:200'],
            'address' => ['nullable', 'string', 'max:300'],
            'phone' => ['nullable', 'string', 'max:60'],
            'email' => ['nullable', 'string', 'max:120'],
            'tax' => ['nullable', 'string', 'max:60'],
            'customer' => ['required', 'string', 'max:160'],
            'customer_email' => ['nullable', 'string', 'max:120'],
            'reference' => ['nullable', 'string', 'max:60'],
            'date' => ['nullable', 'string', 'max:40'],
            'note' => ['nullable', 'string', 'max:400'],
            'items' => ['required', 'array', 'min:1', 'max:50'],
            'items.*.name' => ['required', 'string', 'max:200'],
            'items.*.amount' => ['required', 'numeric', 'min:0', 'max:9999999'],
        ]);

        $items = array_map(fn ($i) => ['name' => (string) $i['name'], 'amount' => round((float) $i['amount'], 2)], $data['items']);
        $total = round(array_sum(array_column($items, 'amount')), 2);

        // The vendor's own uploaded logo when they have one, else the platform logo.
        $logo = ($user->company_logo ? self::inline($user->company_logo) : null)
            ?? self::inlinePublic(public_path('Portal-Kahwin-Logo-Header-2.png'));

        $reference = ($data['reference'] ?? '') ?: 'RCP-'.Str::upper(Str::random(8));

        $pdf = Pdf::loadView('pdf.receipt', [
            'brand' => Setting::get('site_name', config('app.name')),
            'logo' => $logo,
            'company' => $data['company'],
            'description' => $data['description'] ?? '',
            'address' => $data['address'] ?? null,
            'phone' => $data['phone'] ?? null,
            'website' => null,
            'email' => $data['email'] ?? null,
            'tax' => $data['tax'] ?? null,
            'disclaimer' => $data['note'] ?? null,
            'receipt' => [
                'reference' => $reference,
                'date' => ($data['date'] ?? '') ?: now()->format('d/m/Y'),
                'status' => 'paid',
                'customer' => $data['customer'],
                'email' => $data['customer_email'] ?? '',
                'items' => $items,
                'amount' => $total,
            ],
        ]);

        return $pdf->download('resit-'.$reference.'.pdf');
    }

    private static function inline(?string $ref): ?string
    {
        if (! $ref) return null;
        $rel = ltrim(Str::after($ref, '/storage/'), '/');
        $path = storage_path('app/public/'.$rel);

        return is_file($path) ? self::inlinePublic($path) : null;
    }

    private static function inlinePublic(?string $path): ?string
    {
        if (! $path || ! is_file($path)) return null;
        $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        $mime = match ($ext) { 'png' => 'image/png', 'jpg', 'jpeg' => 'image/jpeg', 'gif' => 'image/gif', 'webp' => 'image/webp', 'svg' => 'image/svg+xml', default => 'image/png' };

        return 'data:'.$mime.';base64,'.base64_encode((string) file_get_contents($path));
    }
}
