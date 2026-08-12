<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Voucher extends Model
{
    use HasUuids;

    protected $fillable = ['code', 'kind', 'value', 'max_uses', 'used_count', 'expires_at', 'is_active', 'note'];

    protected function casts(): array
    {
        return ['expires_at' => 'datetime', 'is_active' => 'boolean', 'value' => 'decimal:2'];
    }

    /** Whether this voucher can still be redeemed right now. */
    public function isRedeemable(): bool
    {
        if (! $this->is_active) {
            return false;
        }
        if ($this->expires_at && $this->expires_at->isPast()) {
            return false;
        }
        if ($this->max_uses !== null && $this->used_count >= $this->max_uses) {
            return false;
        }

        return true;
    }

    /** Price after applying this voucher to a base amount (RM). */
    public function apply(float $amount): float
    {
        return match ($this->kind) {
            'full' => 0.0,
            'percent' => max(0, round($amount * (1 - ((float) $this->value / 100)), 2)),
            'amount' => max(0, round($amount - (float) $this->value, 2)),
            default => $amount,
        };
    }
}
