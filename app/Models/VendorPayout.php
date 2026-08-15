<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A manual release of collected entry money from the platform to one vendor.
 * Groups the paid entry_payments it settles (via entry_payments.payout_id) and
 * carries the receipt reference printed for both sides.
 */
class VendorPayout extends Model
{
    use HasUuids;

    protected $fillable = [
        'vendor_id', 'reference', 'gross', 'fee_total', 'adjustment', 'net',
        'entries_count', 'method', 'note', 'released_by', 'released_at', 'status',
    ];

    protected function casts(): array
    {
        return [
            'gross' => 'decimal:2',
            'fee_total' => 'decimal:2',
            'adjustment' => 'decimal:2',
            'net' => 'decimal:2',
            'entries_count' => 'integer',
            'released_at' => 'datetime',
        ];
    }

    public function vendor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'vendor_id');
    }

    public function releasedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'released_by');
    }

    public function entries(): HasMany
    {
        return $this->hasMany(EntryPayment::class, 'payout_id');
    }
}
