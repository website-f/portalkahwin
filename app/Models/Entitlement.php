<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/**
 * A per-user grant bought from a Package — either the subscription PLAN or an
 * add-ON. Pay-once with a dated expiry (per the package interval); the feature
 * gate reads active entitlements on top of the role defaults.
 */
class Entitlement extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id', 'package_id', 'name', 'kind', 'feature_keys',
        'interval', 'price_myr', 'status', 'starts_at', 'expires_at', 'payment_id',
    ];

    protected function casts(): array
    {
        return [
            'feature_keys' => 'array',
            'price_myr' => 'decimal:2',
            'starts_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function package()
    {
        return $this->belongsTo(Package::class);
    }

    /** Live right now? (active status + not past its expiry). */
    public function isActive(): bool
    {
        return $this->status === 'active'
            && ($this->expires_at === null || $this->expires_at->isFuture());
    }

    /** Grant (or extend) an entitlement to a user from a package + settled payment. */
    public static function grantFromPackage(User $user, Package $package, ?string $paymentId = null): self
    {
        $months = $package->interval === 'yearly' ? 12 : ($package->interval === 'once' ? 0 : 1);
        $expires = $months > 0 ? now()->addMonths($months) : null;

        // Extend an existing live grant of the same package rather than duplicate.
        $existing = static::where('user_id', $user->id)
            ->where('package_id', $package->id)
            ->where('status', 'active')
            ->latest()->first();

        if ($existing && $existing->isActive()) {
            $base = ($existing->expires_at && $existing->expires_at->isFuture()) ? $existing->expires_at : now();
            $existing->update([
                'expires_at' => $months > 0 ? $base->copy()->addMonths($months) : null,
                'feature_keys' => $package->feature_keys ?? [],
                'name' => $package->name,
                'payment_id' => $paymentId ?? $existing->payment_id,
            ]);

            return $existing->refresh();
        }

        return static::create([
            'user_id' => $user->id,
            'package_id' => $package->id,
            'name' => $package->name,
            'kind' => $package->kind === 'addon' ? 'addon' : 'plan',
            'feature_keys' => $package->feature_keys ?? [],
            'interval' => $package->interval,
            'price_myr' => $package->price_myr,
            'status' => 'active',
            'starts_at' => now(),
            'expires_at' => $expires,
            'payment_id' => $paymentId,
        ]);
    }
}
