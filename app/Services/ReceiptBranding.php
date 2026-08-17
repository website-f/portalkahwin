<?php

namespace App\Services;

use App\Models\Payment;
use App\Models\Setting;
use App\Models\User;

/**
 * Resolves whose business identity a receipt carries.
 *
 * Attribution (confirmed product rule): the payer's role decides, with an affiliate
 * referral as the one cross-account case —
 *   • payer is a vendor/affiliate      → that seller's own branding
 *   • payer was referred by an affiliate → that affiliate's branding
 *   • everyone else                     → the platform (PortalKahwin)
 *
 * A seller's branding is only used when the superadmin master switch allows it AND
 * the seller opted in AND they actually filled a business name; otherwise it falls
 * back to the platform identity from Settings.
 */
class ReceiptBranding
{
    /** Disclaimer footers for third-party (seller) sales. Platform sales use none. */
    public const FOOTERS = [
        'vendor' => 'Payment and services are managed by the respective vendor. Portal Kahwin is only the platform provider and is not responsible for third-party services.',
        'affiliate' => 'Payment and services are managed by the respective affiliates. Portal Kahwin is only the platform provider and is not responsible for third-party services.',
    ];

    /**
     * Who the receipt is "Billed to". Normally the payer; but for an affiliate
     * RESELLER sale (they paid for a card on a client's behalf), it's the client
     * name recorded on that card.
     *
     * @return array{name:string,email:string}
     */
    public static function billedTo(Payment $payment): array
    {
        $payer = $payment->user;
        $name = (string) ($payer->name ?? '—');
        $email = (string) ($payer->email ?? '');

        if ($payer && $payer->role === 'affiliate') {
            $invId = $payment->meta['invitation_id'] ?? null;
            if ($invId) {
                $inv = \App\Models\Invitation::find($invId);
                if ($inv && trim((string) $inv->client_name) !== '') {
                    return ['name' => (string) $inv->client_name, 'email' => ''];
                }
            }
        }

        return ['name' => $name, 'email' => $email];
    }

    /** The vendor/affiliate a payment is attributed to, or null for a platform sale. */
    public static function resolveSeller(Payment $payment): ?User
    {
        $payer = $payment->user;
        if (! $payer) {
            return null;
        }
        if (in_array($payer->role, ['vendor', 'affiliate'], true)) {
            return $payer;
        }
        if ($payer->referred_by) {
            $ref = User::find($payer->referred_by);
            if ($ref && $ref->role === 'affiliate') {
                return $ref;
            }
        }

        return null;
    }

    /**
     * Full branding block for a payment. `logo` is a raw stored path (/storage/…) or
     * null; the caller inlines it for PDF or resolves it for the browser.
     *
     * @return array{seller_role:?string,company:string,description:string,logo:?string,address:string,phone:string,website:string,email:string,tax:string,footer:?string}
     */
    public static function forPayment(Payment $payment): array
    {
        $seller = self::resolveSeller($payment);
        $allowed = Setting::get('allow_seller_receipt_branding', 'true') === 'true';

        if ($seller && $allowed && $seller->use_own_receipt_branding) {
            $block = $seller->sellerReceiptBlock();
            if (trim($block['company']) !== '') {
                return [
                    'seller_role' => $seller->role,
                    // For an affiliate sale, lead with the agent code ("Affiliate
                    // Agent: XYZ") above their business name.
                    'agent_code' => $seller->role === 'affiliate' ? $seller->referral_code : null,
                    'company' => $block['company'],
                    'description' => '',
                    'logo' => $block['logo'],
                    'address' => $block['address'],
                    'phone' => $block['phone'],
                    'website' => '',
                    'email' => $block['email'],
                    'tax' => $block['tax'],
                    'footer' => self::FOOTERS[$seller->role] ?? null,
                ];
            }
        }

        // Platform identity (also the fallback when a seller hasn't set up branding).
        return [
            'seller_role' => null,
            'agent_code' => null,
            'company' => (string) Setting::get('receipt_company_name'),
            'description' => (string) Setting::get('receipt_description'),
            'logo' => null,
            'address' => '',
            'phone' => (string) Setting::get('receipt_phone'),
            'website' => (string) Setting::get('receipt_website'),
            'email' => (string) Setting::get('receipt_email'),
            'tax' => '',
            'footer' => null,
        ];
    }
}
