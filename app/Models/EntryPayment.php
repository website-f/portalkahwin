<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A single guest's pay-per-entry RSVP payment, collected by the platform on behalf
 * of a vendor. `platform_fee` / `vendor_net` are frozen at payment time so payouts
 * and reconciliation never drift from what the guest actually paid.
 */
class EntryPayment extends Model
{
    use HasUuids;

    protected $fillable = [
        'invitation_id', 'vendor_id', 'guest_id',
        // Snapshots kept so the record survives its vendor/event being deleted.
        'vendor_name', 'vendor_email', 'event_label',
        'reference', 'bill_code',
        'payer_name', 'payer_email', 'payer_phone',
        'pax', 'unit_price', 'tax_percent', 'tax_amount', 'amount',
        'fee_type', 'fee_value', 'platform_fee', 'vendor_net', 'charges',
        'status', 'paid_at', 'payout_id', 'meta',
    ];

    protected function casts(): array
    {
        return [
            'pax' => 'integer',
            'unit_price' => 'decimal:2',
            'tax_percent' => 'decimal:2',
            'tax_amount' => 'decimal:2',
            'amount' => 'decimal:2',
            'fee_value' => 'decimal:2',
            'platform_fee' => 'decimal:2',
            'vendor_net' => 'decimal:2',
            'charges' => 'array',
            'paid_at' => 'datetime',
            'meta' => 'array',
        ];
    }

    public function invitation(): BelongsTo
    {
        return $this->belongsTo(Invitation::class);
    }

    public function vendor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'vendor_id');
    }

    public function guest(): BelongsTo
    {
        return $this->belongsTo(RsvpGuest::class, 'guest_id');
    }

    public function payout(): BelongsTo
    {
        return $this->belongsTo(VendorPayout::class, 'payout_id');
    }
}
