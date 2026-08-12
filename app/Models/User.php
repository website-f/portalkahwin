<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name', 'email', 'password', 'role', 'status', 'phone', 'is_active', 'plan', 'plan_expires_at',
        'must_change_password', 'company_name', 'company_logo', 'storage_quota_mb',
        'approval_receipt', 'approval_note', 'approved_at', 'approved_by', 'approval_payment_id',
        'google_id', 'avatar',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
            'plan_expires_at' => 'datetime',
            'must_change_password' => 'boolean',
            'approved_at' => 'datetime',
            'storage_quota_mb' => 'integer',
        ];
    }

    public function isAdmin(): bool
    {
        return in_array($this->role, ['admin', 'superadmin'], true);
    }

    public function isSuperadmin(): bool
    {
        return $this->role === 'superadmin';
    }

    public function isVendor(): bool
    {
        return $this->role === 'vendor';
    }

    /**
     * Is a capability switched on for this account?
     *
     * Staff bypass the matrix: an admin managing a customer's card must be able
     * to reach every tool regardless of what that customer's role is allowed.
     */
    public function hasFeature(string $feature): bool
    {
        if ($this->isAdmin()) {
            return true;
        }

        return Setting::roleCan($this->role ?? 'user', $feature);
    }

    /** The whole capability set, for the SPA to gate its navigation with. */
    public function featurePayload(): array
    {
        $out = [];
        foreach (Setting::FEATURES as $f) {
            $out[$f] = $this->hasFeature($f);
        }

        return $out;
    }

    /** Company logo + profile — now driven by the admin-editable matrix. */
    public function canUseCompanyBranding(): bool
    {
        return $this->hasFeature('company_branding');
    }

    public function isAffiliate(): bool
    {
        return $this->role === 'affiliate';
    }

    /** Vendor + affiliate are subscription roles; normal users just buy templates. */
    public function needsSubscription(): bool
    {
        return $this->isVendor() || $this->isAffiliate();
    }

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function isPremium(): bool
    {
        return $this->isAdmin()
            || ($this->plan === 'premium'
                && (! $this->plan_expires_at || $this->plan_expires_at->isFuture()));
    }

    /**
     * Template keys this user has purchased (per-template ownership). A paid
     * template payment may cover several designs at once, so we union the single
     * `template_key` column with the `meta.template_keys` list (multi-item cart).
     */
    public function ownedTemplates(): array
    {
        $keys = [];

        foreach ($this->payments()->where('purpose', 'template')->where('status', 'paid')->get(['template_key', 'meta']) as $p) {
            if ($p->template_key) {
                $keys[] = $p->template_key;
            }
            $metaKeys = $p->meta['template_keys'] ?? null;
            if (is_array($metaKeys)) {
                foreach ($metaKeys as $k) {
                    if (is_string($k)) {
                        $keys[] = $k;
                    }
                }
            }
        }

        return array_values(array_unique($keys));
    }

    /** Can this user use a given template? Free designs, admins/premium, or ones they bought. */
    public function ownsTemplate(string $key): bool
    {
        return $this->isPremium() || in_array($key, $this->ownedTemplates(), true);
    }

    /** Paying customers (bought ≥1 design) or premium/admin get premium FEATURES like seating. */
    public function hasPaidAccess(): bool
    {
        return $this->isPremium() || count($this->ownedTemplates()) > 0;
    }

    /** Access fields appended to the user payload returned by the auth endpoints. */
    public function accessPayload(): array
    {
        $owned = $this->ownedTemplates();

        return [
            'owned_templates' => $owned,
            'has_paid_access' => $this->isPremium() || count($owned) > 0,
            'needs_subscription' => $this->needsSubscription(),
            'storage_used_mb' => $this->storageUsedMb(),
            'storage_quota_mb' => (int) $this->storage_quota_mb,
            // What this account may actually do — the SPA hides nav from it, and
            // every server-side gate reads the same source.
            'features' => $this->featurePayload(),
        ];
    }

    public function storageUsedBytes(): int
    {
        return (int) $this->assets()->sum('size_bytes');
    }

    public function storageUsedMb(): float
    {
        return round($this->storageUsedBytes() / 1_048_576, 2);
    }

    public function storageRemainingMb(): float
    {
        return max(0, (int) $this->storage_quota_mb - $this->storageUsedMb());
    }

    public function invitations(): HasMany
    {
        return $this->hasMany(Invitation::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function assets(): HasMany
    {
        return $this->hasMany(Asset::class);
    }

    public function storageRequests(): HasMany
    {
        return $this->hasMany(StorageRequest::class);
    }
}
