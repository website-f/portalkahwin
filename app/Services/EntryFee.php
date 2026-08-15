<?php

namespace App\Services;

use App\Models\Invitation;
use App\Models\Setting;

/**
 * The single source of truth for pay-per-entry money maths.
 *
 * The vendor sets one price per head — nothing else. The guest pays price × pax.
 * The PLATFORM then deducts a configurable list of charges (commission, FPX fee,
 * SST, …) — that total is the platform's income; the remainder is the vendor's.
 *   amount = unit_price × pax          (what the guest pays)
 *   charges[] each = %·amount OR flat RM (platform income, in configured order)
 *   platform_fee = Σ charges           (capped so it never exceeds the amount)
 *   vendor_net   = amount − platform_fee
 */
class EntryFee
{
    /**
     * @return array{pax:int,unit_price:float,amount:float,charges:array<int,array{name:string,mode:string,value:float,amount:float}>,platform_fee:float,vendor_net:float}
     */
    public static function quote(Invitation $invitation, int $pax): array
    {
        $pax = max(1, $pax);
        $unit = round((float) ($invitation->rsvp_price ?? 0), 2);
        $amount = round($unit * $pax, 2);

        $charges = [];
        $total = 0.0;
        foreach (Setting::payPerEntryCharges() as $c) {
            $line = $c['mode'] === 'flat'
                ? round((float) $c['value'], 2)
                : round($amount * (float) $c['value'] / 100, 2);
            // Never let the running deductions exceed what the guest actually paid.
            $line = max(0.0, min($line, round($amount - $total, 2)));
            $charges[] = [
                'name' => $c['name'],
                'mode' => $c['mode'],
                'value' => (float) $c['value'],
                'amount' => $line,
            ];
            $total = round($total + $line, 2);
        }

        return [
            'pax' => $pax,
            'unit_price' => $unit,
            'amount' => $amount,
            'charges' => $charges,
            'platform_fee' => $total,
            'vendor_net' => round($amount - $total, 2),
        ];
    }
}
