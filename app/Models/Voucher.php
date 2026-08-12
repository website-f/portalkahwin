<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class Voucher extends Model
{
    use HasUuids;

    protected $fillable = ['code', 'kind', 'value', 'max_uses', 'used_count', 'expires_at', 'is_active', 'once_per_user', 'note'];

    protected function casts(): array
    {
        return ['expires_at' => 'datetime', 'is_active' => 'boolean', 'once_per_user' => 'boolean', 'value' => 'decimal:2'];
    }

    /** Has this specific user already redeemed this voucher? (only matters when once_per_user). */
    public function redeemedByUser(int $userId): bool
    {
        return DB::table('voucher_redemptions')
            ->where('voucher_id', $this->id)
            ->where('user_id', $userId)
            ->exists();
    }

    /** Record a redemption for this user (idempotent — safe to call once per paid order). */
    public function recordRedemption(int $userId): void
    {
        DB::table('voucher_redemptions')->updateOrInsert(
            ['voucher_id' => $this->id, 'user_id' => $userId],
            ['created_at' => now(), 'updated_at' => now()],
        );
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
