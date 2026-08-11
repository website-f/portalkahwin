<?php

namespace App\Services\Toyyibpay;

use Illuminate\Support\Facades\Http;

/**
 * ToyyibPay gateway client (FPX online banking + e-Wallet).
 *
 * Docs: https://toyyibpay.com/apireference/
 * Sandbox base: https://dev.toyyibpay.com   Live base: https://toyyibpay.com
 *
 * Fill TOYYIBPAY_SECRET_KEY + TOYYIBPAY_CATEGORY_CODE in .env to activate.
 */
class ToyyibpayService
{
    public function isConfigured(): bool
    {
        return filled(config('services.toyyibpay.secret_key'))
            && filled(config('services.toyyibpay.category_code'));
    }

    public function baseUrl(): string
    {
        return config('services.toyyibpay.env') === 'production'
            ? 'https://toyyibpay.com'
            : 'https://dev.toyyibpay.com';
    }

    /**
     * Create a bill and return ['billCode' => string, 'url' => string].
     *
     * @param  array{name:string,description:string,amountMyr:float,ref:string,returnUrl:string,callbackUrl:string,payerName?:string,payerEmail?:string,payerPhone?:string}  $o
     */
    public function createBill(array $o): array
    {
        $res = Http::asForm()->post($this->baseUrl().'/index.php/api/createBill', [
            'userSecretKey' => config('services.toyyibpay.secret_key'),
            'categoryCode' => config('services.toyyibpay.category_code'),
            'billName' => substr($o['name'], 0, 30),
            'billDescription' => substr($o['description'], 0, 100),
            'billPriceSetting' => 1,
            'billPayorInfo' => 1,
            'billAmount' => (int) round($o['amountMyr'] * 100), // cents
            'billReturnUrl' => $o['returnUrl'],
            'billCallbackUrl' => $o['callbackUrl'],
            'billExternalReferenceNo' => $o['ref'],
            'billTo' => $o['payerName'] ?? '',
            'billEmail' => $o['payerEmail'] ?? '',
            'billPhone' => $o['payerPhone'] ?? '',
            'billPaymentChannel' => 2, // 0=FPX, 1=CC, 2=both
        ]);

        $data = $res->json();
        if (! is_array($data) || empty($data[0]['BillCode'])) {
            throw new \RuntimeException('ToyyibPay createBill failed: '.$res->body());
        }

        $code = $data[0]['BillCode'];

        return ['billCode' => $code, 'url' => $this->baseUrl().'/'.$code];
    }

    /**
     * Returns 'paid' | 'pending' | 'failed' for a bill (server-side verification).
     */
    public function billStatus(string $billCode): string
    {
        $res = Http::asForm()->post($this->baseUrl().'/index.php/api/getBillTransactions', [
            'userSecretKey' => config('services.toyyibpay.secret_key'),
            'billCode' => $billCode,
        ]);

        $rows = $res->json();
        if (! is_array($rows) || $rows === []) {
            return 'pending';
        }

        // A bill holds one row per attempt — an abandoned FPX redirect leaves an
        // incomplete "4" row behind, and it is not always last. So look at every
        // row: one success settles the bill, and it only failed if all of them did.
        $statuses = array_map(
            fn ($row) => (string) ($row['billpaymentStatus'] ?? '2'),
            array_filter($rows, 'is_array'),
        );

        if (in_array('1', $statuses, true)) {
            return 'paid';
        }

        if ($statuses !== [] && array_diff($statuses, ['3']) === []) {
            return 'failed';
        }

        return 'pending';
    }
}
