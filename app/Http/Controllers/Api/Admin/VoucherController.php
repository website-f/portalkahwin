<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Voucher;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class VoucherController extends Controller
{
    /** Admin — every voucher, newest first. */
    public function index()
    {
        return Voucher::orderByDesc('created_at')->get();
    }

    public function store(Request $request)
    {
        $voucher = Voucher::create($this->validateData($request));

        return response()->json($voucher, 201);
    }

    public function update(Request $request, Voucher $voucher)
    {
        $voucher->update($this->validateData($request, $voucher->id));

        return response()->json($voucher);
    }

    public function destroy(Voucher $voucher)
    {
        $voucher->delete();

        return response()->json(['ok' => true]);
    }

    /**
     * Authenticated — validate a code at checkout and preview the discounted price.
     * Wired to POST /vouchers/validate.
     */
    public function validateCode(Request $request)
    {
        $data = $request->validate([
            'code' => ['required', 'string'],
            'amount' => ['required', 'numeric', 'min:0'],
        ]);

        $amount = round((float) $data['amount'], 2);
        $voucher = Voucher::whereRaw('LOWER(code) = ?', [strtolower($data['code'])])->first();

        // Always 200 so the checkout UI can read `ok`/`message` without a thrown error.
        if (! $voucher || ! $voucher->isRedeemable()) {
            return response()->json(['ok' => false, 'message' => 'Kod baucar tidak sah atau telah tamat.', 'discounted' => $amount]);
        }

        $final = $voucher->apply($amount);

        return response()->json([
            'ok' => true,
            'code' => $voucher->code,
            'kind' => $voucher->kind,
            'value' => $voucher->value,
            'discounted' => $final,
            'discount' => round($amount - $final, 2),
        ]);
    }

    private function validateData(Request $request, ?string $ignoreId = null): array
    {
        return $request->validate([
            'code' => ['required', 'string', 'max:60', Rule::unique('vouchers', 'code')->ignore($ignoreId)],
            'kind' => ['required', 'in:full,percent,amount'],
            'value' => ['required', 'numeric', 'min:0'],
            'max_uses' => ['nullable', 'integer', 'min:1'],
            'expires_at' => ['nullable', 'date'],
            'is_active' => ['boolean'],
            'note' => ['nullable', 'string', 'max:200'],
        ]);
    }
}
