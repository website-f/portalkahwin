<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

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
     * CONSUMABLE purchase model: each paid template purchase is one CREDIT to make
     * one card; a paid card consumes one credit for its design. To use the design
     * for another wedding you buy it again.
     *
     * `templateCreditTally()` returns [key => credits_bought] across every paid
     * template payment (a payment lists each design once; buying the same design
     * twice = two payments = two credits).
     *
     * @return array<string,int>
     */
    private function templateCreditTally(): array
    {
        $tally = [];
        foreach ($this->payments()->where('purpose', 'template')->where('status', 'paid')->get(['template_key', 'meta']) as $p) {
            $keys = [];
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
            // A single payment row lists each design once — but `template_key` and
            // `meta.template_keys` can both name it, so dedupe within the payment.
            foreach (array_unique($keys) as $k) {
                $tally[$k] = ($tally[$k] ?? 0) + 1;
            }
        }

        return $tally;
    }

    /** [key => credits already spent] — one per paid card of that design. @return array<string,int> */
    private function consumedTemplateTally(): array
    {
        return $this->invitations()
            ->where('is_paid', true)
            ->whereNotNull('template_key')
            ->get(['template_key'])
            ->groupBy('template_key')
            ->map->count()
            ->all();
    }

    /** Unspent paid credits for a design (buy again → +1; publish a paid card → −1). */
    public function availableTemplateCredits(string $key): int
    {
        $bought = $this->templateCreditTally()[$key] ?? 0;
        $spent = $this->consumedTemplateTally()[$key] ?? 0;

        return max(0, $bought - $spent);
    }

    /** Has the user EVER paid for a template? (feature access survives spending credits). */
    public function hasEverPaidTemplate(): bool
    {
        return $this->payments()->where('purpose', 'template')->where('status', 'paid')->exists();
    }

    /**
     * Designs the user can use RIGHT NOW without paying — i.e. those with an
     * unspent credit. Drives the gallery "Owned" state + the owns() gate.
     */
    public function ownedTemplates(): array
    {
        $bought = $this->templateCreditTally();
        $spent = $this->consumedTemplateTally();

        $available = [];
        foreach ($bought as $key => $count) {
            if ($count - ($spent[$key] ?? 0) > 0) {
                $available[] = $key;
            }
        }

        return array_values($available);
    }

    /** Can this user create a card with this design without paying now? */
    public function ownsTemplate(string $key): bool
    {
        return $this->isPremium() || $this->availableTemplateCredits($key) > 0;
    }

    /** Paying customers (ever bought a design) or premium/admin get premium FEATURES like seating. */
    public function hasPaidAccess(): bool
    {
        return $this->isPremium() || $this->hasEverPaidTemplate();
    }

    /** Access fields appended to the user payload returned by the auth endpoints. */
    public function accessPayload(): array
    {
        $owned = $this->ownedTemplates();

        return [
            'owned_templates' => $owned,
            'has_paid_access' => $this->hasPaidAccess(),
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
