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
        'entries_count', 'method', 'note', 'attachment', 'released_by', 'released_at', 'acknowledged_at', 'status',
    ];

    /** Expose a resolvable proof-of-transfer URL alongside the raw stored path. */
    protected $appends = ['attachment_url'];

    protected function casts(): array
    {
        return [
            'gross' => 'decimal:2',
            'fee_total' => 'decimal:2',
            'adjustment' => 'decimal:2',
            'net' => 'decimal:2',
            'entries_count' => 'integer',
            'released_at' => 'datetime',
            'acknowledged_at' => 'datetime',
        ];
    }

    public function getAttachmentUrlAttribute(): ?string
    {
        return $this->attachment ? '/storage/'.ltrim($this->attachment, '/') : null;
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
