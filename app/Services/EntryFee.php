<?php

namespace App\Services;

use App\Models\Invitation;
use App\Models\Setting;

/**
 * The single source of truth for pay-per-entry money maths.
 *
 * Decision (locked with the client): the platform commission is charged on the
 * BASE ticket price only; the vendor keeps the tax they set (their SST to remit).
 *   base   = unit_price × pax
 *   tax    = base × tax_percent
 *   amount = base + tax                (what the guest pays)
 *   fee    = %·base   OR   flat RM     (platform commission, capped at base)
 *   net    = amount − fee              (owed to the vendor, tax included)
 */
class EntryFee
{
    /**
     * @return array{pax:int,unit_price:float,tax_percent:float,base:float,tax_amount:float,amount:float,fee_type:string,fee_value:float,platform_fee:float,vendor_net:float}
     */
    public static function quote(Invitation $invitation, int $pax): array
    {
        $pax = max(1, $pax);
        $unit = round((float) ($invitation->rsvp_price ?? 0), 2);
        $taxPct = round((float) ($invitation->rsvp_tax_percent ?? 0), 2);

        $base = round($unit * $pax, 2);
        $tax = round($base * $taxPct / 100, 2);
        $amount = round($base + $tax, 2);

        $fee = Setting::payPerEntryFee(); // ['type' => percent|fixed, 'value' => float]
        $platformFee = $fee['type'] === 'fixed'
            ? min(round((float) $fee['value'], 2), $base)      // flat RM, never more than the base
            : round($base * (float) $fee['value'] / 100, 2);   // percent of the base
        $vendorNet = round($amount - $platformFee, 2);

        return [
            'pax' => $pax,
            'unit_price' => $unit,
            'tax_percent' => $taxPct,
            'base' => $base,
            'tax_amount' => $tax,
            'amount' => $amount,
            'fee_type' => $fee['type'],
            'fee_value' => (float) $fee['value'],
            'platform_fee' => $platformFee,
            'vendor_net' => $vendorNet,
        ];
    }
}
