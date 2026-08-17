<?php

namespace App\Services\Hitpay;

use Illuminate\Support\Facades\Http;

/**
 * HitPay gateway client (FPX, cards, e-wallets, DuitNow QR…).
 *
 * Docs: https://docs.hitpayapp.com/apis/payment-request
 * Sandbox base: https://api.sandbox.hit-pay.com/v1   Live base: https://api.hit-pay.com/v1
 *
 * Fill HITPAY_API_KEY + HITPAY_SALT in .env to activate (HITPAY_ENV=sandbox|production).
 * The API key authenticates requests; the salt verifies the payment-request webhook HMAC.
 */
class HitpayService
{
    public function isConfigured(): bool
    {
        return filled(config('services.hitpay.api_key'));
    }

    public function baseUrl(): string
    {
        return config('services.hitpay.env') === 'production'
            ? 'https://api.hit-pay.com/v1'
            : 'https://api.sandbox.hit-pay.com/v1';
    }

    private function apiKey(): string
    {
        return (string) config('services.hitpay.api_key');
    }

    /**
     * Create a payment request and return ['id' => string, 'url' => string].
     * `id` is HitPay's payment-request id (stored on the payment for status checks);
     * `url` is the hosted checkout to redirect the payer to.
     *
     * @param  array{name:string,description:string,amountMyr:float,ref:string,returnUrl:string,webhookUrl:string,payerName?:string,payerEmail?:string,payerPhone?:string}  $o
     */
    public function createPaymentRequest(array $o): array
    {
        // HitPay rejects a phone longer than 15 chars, so strip formatting to
        // digits (keep a leading +) — "+1 (928) 496-7069" (17) → "+19284967069"
        // (12). If it is still over 15 after cleaning, send none: an empty phone
        // is accepted, a mangled/truncated one would be wrong.
        $phone = preg_replace('/[^0-9+]/', '', (string) ($o['payerPhone'] ?? ''));
        if (strlen((string) $phone) > 15) {
            $phone = '';
        }

        $res = Http::asForm()
            ->withHeaders([
                'X-BUSINESS-API-KEY' => $this->apiKey(),
                'X-Requested-With' => 'XMLHttpRequest',
            ])
            ->post($this->baseUrl().'/payment-requests', [
                'amount' => number_format((float) $o['amountMyr'], 2, '.', ''),
                'currency' => config('services.hitpay.currency', 'MYR'),
                'email' => $o['payerEmail'] ?? '',
                'name' => $o['payerName'] ?? '',
                'phone' => $phone,
                'purpose' => substr($o['description'] ?: $o['name'], 0, 255),
                'reference_number' => $o['ref'],
                'redirect_url' => $o['returnUrl'],
                'webhook' => $o['webhookUrl'],
                'send_email' => false,
            ]);

        $data = $res->json();
        if (! is_array($data) || empty($data['id']) || empty($data['url'])) {
            throw new \RuntimeException('HitPay createPaymentRequest failed: '.$res->body());
        }

        return ['id' => (string) $data['id'], 'url' => (string) $data['url']];
    }

    /**
     * Authoritative status for a payment request: 'paid' | 'pending' | 'failed'.
     */
    public function paymentRequestStatus(string $id): string
    {
        if ($id === '') {
            return 'pending';
        }

        $res = Http::withHeaders([
            'X-BUSINESS-API-KEY' => $this->apiKey(),
            'X-Requested-With' => 'XMLHttpRequest',
        ])->get($this->baseUrl().'/payment-requests/'.$id);

        return $this->mapStatus((string) ($res->json('status') ?? 'pending'));
    }

    /** Map HitPay's status vocabulary onto our three-state model. */
    public function mapStatus(string $status): string
    {
        return match ($status) {
            'completed' => 'paid',
            'failed', 'expired', 'canceled', 'inactive' => 'failed',
            default => 'pending',
        };
    }

    /**
     * Verify a classic payment-request webhook (form-encoded, `hmac` field).
     *
     * HitPay signs by sorting the params by key, concatenating key+value with no
     * separator, then HMAC-SHA256 with the API-key salt. The result must match the
     * `hmac` field in the payload.
     *
     * @param  array<string,mixed>  $params
     */
    public function verifyWebhook(array $params): bool
    {
        $salt = (string) config('services.hitpay.salt');
        $provided = (string) ($params['hmac'] ?? '');
        if ($salt === '' || $provided === '') {
            return false;
        }

        unset($params['hmac']);
        ksort($params);
        $payload = '';
        foreach ($params as $k => $v) {
            $payload .= $k.$v;
        }

        return hash_equals(hash_hmac('sha256', $payload, $salt), $provided);
    }
}
