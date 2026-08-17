<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Template extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'key', 'base_key', 'name', 'category', 'kind', 'languages', 'description', 'thumbnail',
        'tier', 'price_myr', 'discount_price_myr', 'palette', 'config', 'is_active', 'status', 'submitted_by', 'sort_order', 'usage_count',
    ];

    protected function casts(): array
    {
        return [
            'palette' => 'array',
            'config' => 'array',
            'languages' => 'array',
            'is_active' => 'boolean',
            'price_myr' => 'decimal:2',
            'discount_price_myr' => 'decimal:2',
        ];
    }

    /**
     * The price actually charged: the discount when it is set and genuinely lower
     * than the original, otherwise the original. Every charging path (publish,
     * cart, checkout) must use this, never `price_myr` directly.
     */
    public function effectivePrice(): float
    {
        $base = (float) $this->price_myr;
        $disc = $this->discount_price_myr === null ? null : (float) $this->discount_price_myr;

        return ($disc !== null && $disc >= 0 && $disc < $base) ? $disc : $base;
    }

    /** Whole-percent discount off the original, or 0 when there is no active discount. */
    public function discountPercent(): int
    {
        $base = (float) $this->price_myr;
        if ($base <= 0) {
            return 0;
        }
        $eff = $this->effectivePrice();

        return $eff < $base ? (int) round((1 - $eff / $base) * 100) : 0;
    }

    /** The registry key of the React component that actually renders this design. */
    public function renderKey(): string
    {
        return $this->base_key ?: $this->key;
    }

    public function submittedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }
}
