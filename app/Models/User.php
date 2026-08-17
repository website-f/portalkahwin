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
        'template_scope', 'pay_per_entry_disabled',
        'must_change_password', 'company_name', 'company_logo', 'storage_quota_mb',
        'approval_receipt', 'approval_note', 'approved_at', 'approved_by', 'approval_payment_id',
        'google_id', 'avatar', 'referral_code', 'referred_by',
        'profile_data', 'use_own_receipt_branding',
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
            'profile_data' => 'array',
            'use_own_receipt_branding' => 'boolean',
            'pay_per_entry_disabled' => 'boolean',
        ];
    }

    /** Read one profile field value — company_name/logo live on columns, the rest in profile_data. */
    public function profileFieldValue(string $key): ?string
    {
        if (in_array($key, ProfileField::COLUMN_KEYS, true)) {
            return $this->{$key};
        }

        return data_get($this->profile_data, $key);
    }

    /**
     * Persist a set of profile field values, routing each key to its column or into
     * profile_data. Only keys given are touched; existing profile_data is preserved.
     *
     * @param  array<string,mixed>  $values
     */
    public function applyProfileValues(array $values): void
    {
        $data = $this->profile_data ?? [];
        foreach ($values as $key => $val) {
            $val = is_string($val) ? trim($val) : $val;
            if (in_array($key, ProfileField::COLUMN_KEYS, true)) {
                $this->{$key} = $val === '' ? null : $val;
            } else {
                if ($val === '' || $val === null) {
                    unset($data[$key]);
                } else {
                    $data[$key] = $val;
                }
            }
        }
        $this->profile_data = $data;
    }

    /** This account's own business block for receipts (before any allow/toggle checks). */
    public function sellerReceiptBlock(): array
    {
        return [
            'company' => (string) ($this->company_name ?? ''),
            'logo' => $this->company_logo,
            'address' => (string) ($this->profileFieldValue('receipt_address') ?? ''),
            'phone' => (string) ($this->profileFieldValue('receipt_phone') ?? ''),
            'email' => (string) ($this->profileFieldValue('receipt_email') ?? ''),
            'tax' => (string) ($this->profileFieldValue('receipt_tax') ?? ''),
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
     * May this account charge guests per RSVP entry? Vendors only, master switch
     * on, and this specific vendor not opted out by an admin. The master switch
     * enables every vendor by default; `pay_per_entry_disabled` withholds it.
     */
    public function canPayPerEntry(): bool
    {
        return $this->isVendor() && Setting::payPerEntryEnabled() && ! $this->pay_per_entry_disabled;
    }

    public function entryPayments(): HasMany
    {
        return $this->hasMany(EntryPayment::class, 'vendor_id');
    }

    public function payouts(): HasMany
    {
        return $this->hasMany(VendorPayout::class, 'vendor_id');
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

        // Role default, OR unlocked by an active plan/add-on entitlement.
        return Setting::roleCan($this->role ?? 'user', $feature)
            || in_array($feature, $this->entitlementFeatureKeys(), true);
    }

    public function entitlements(): HasMany
    {
        return $this->hasMany(Entitlement::class);
    }

    /** Entitlements that are live right now (active + unexpired). */
    public function activeEntitlements()
    {
        return $this->entitlements()
            ->where('status', 'active')
            ->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()))
            ->orderByDesc('created_at')
            ->get();
    }

    /** Gating keys unlocked by all of this user's active entitlements. */
    public function entitlementFeatureKeys(): array
    {
        return $this->activeEntitlements()
            ->flatMap(fn (Entitlement $e) => (array) ($e->feature_keys ?? []))
            ->unique()->values()->all();
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

    /**
     * Only VENDORS subscribe. Affiliates now behave exactly like normal users —
     * they buy designs per event — and simply earn referral tracking on top.
     */
    public function needsSubscription(): bool
    {
        return $this->isVendor();
    }

    /** Customers this affiliate has referred (signed up via their link). */
    public function referredUsers(): HasMany
    {
        return $this->hasMany(User::class, 'referred_by');
    }

    /** Give the affiliate a short, unique, shareable referral code if they lack one. */
    public function ensureReferralCode(): string
    {
        if ($this->referral_code) {
            return $this->referral_code;
        }
        do {
            $code = \Illuminate\Support\Str::upper(\Illuminate\Support\Str::random(7));
        } while (static::where('referral_code', $code)->exists());
        $this->forceFill(['referral_code' => $code])->save();

        return $code;
    }

    /**
     * How much this affiliate has driven: referred sign-ups, and the paid template
     * sales those customers made.
     *
     * @return array{referred_users:int, sales_count:int, templates_sold:int, revenue:float}
     */
    public function affiliateStats(): array
    {
        $referredIds = $this->referredUsers()->pluck('id');

        $payments = $referredIds->isEmpty()
            ? collect()
            : Payment::whereIn('user_id', $referredIds)
                ->where('purpose', 'template')
                ->where('status', 'paid')
                ->get(['amount_myr', 'template_key', 'meta']);

        $templatesSold = 0;
        foreach ($payments as $p) {
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
            $templatesSold += max(1, count(array_unique($keys)));
        }

        $revenue = round((float) $payments->sum('amount_myr'), 2);
        $rate = Setting::affiliateCommissionRate();

        return [
            'referred_users' => $referredIds->count(),
            'sales_count' => $payments->count(),
            'templates_sold' => $templatesSold,
            'revenue' => $revenue,
            // Commission the affiliate has earned on referred sales (settings-driven).
            'commission_percent' => round($rate * 100, 2),
            'commission' => round($revenue * $rate, 2),
        ];
    }

    /**
     * Denormalise this account's identity onto its financial rows (pay-per-entry
     * collections + payouts) so those records stay meaningful — an audit trail —
     * after the account is hard-deleted and the FKs null out. Call BEFORE delete.
     */
    public function snapshotFinancialsForDeletion(): void
    {
        $name = $this->company_name ?: $this->name;
        EntryPayment::where('vendor_id', $this->id)->update(['vendor_name' => $name, 'vendor_email' => $this->email]);
        \App\Models\VendorPayout::where('vendor_id', $this->id)->update(['vendor_name' => $name, 'vendor_email' => $this->email]);
        // Freeze each collection's event label before its invitation is removed.
        EntryPayment::where('vendor_id', $this->id)->whereNull('event_label')->with('invitation')->get()
            ->each(function (EntryPayment $p) {
                $inv = $p->invitation;
                if (! $inv) {
                    return;
                }
                $label = $inv->event_name
                    ?: trim(trim(((string) ($inv->groom_short ?: $inv->groom_name)).' & '.((string) ($inv->bride_short ?: $inv->bride_name))), ' &');
                $p->update(['event_label' => $label ?: '—']);
            });
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

    /**
     * [key => unspent credits] for every design the user still holds a credit for —
     * so the gallery can show "3 credits" and decrement as cards are created.
     *
     * @return array<string,int>
     */
    public function templateCredits(): array
    {
        $bought = $this->templateCreditTally();
        $spent = $this->consumedTemplateTally();
        $out = [];
        foreach ($bought as $key => $count) {
            $left = $count - ($spent[$key] ?? 0);
            if ($left > 0) {
                $out[$key] = $left;
            }
        }

        return $out;
    }

    /** Paying customers (ever bought a design) or premium/admin get premium FEATURES like seating. */
    public function hasPaidAccess(): bool
    {
        return $this->isPremium() || $this->hasEverPaidTemplate();
    }

    /** Does an active package target this account's role (or everyone)? Drives the plans nav. */
    public function hasPurchasablePackage(): bool
    {
        return \App\Models\Package::where('is_active', true)
            ->whereIn('role_target', ['any', $this->role])
            ->exists();
    }

    /** Access fields appended to the user payload returned by the auth endpoints. */
    public function accessPayload(): array
    {
        $owned = $this->ownedTemplates();

        return [
            'owned_templates' => $owned,
            // Per-design unspent credit counts (consumable model) — {key: count}.
            'template_credits' => (object) $this->templateCredits(),
            'has_paid_access' => $this->hasPaidAccess(),
            'needs_subscription' => $this->needsSubscription(),
            // True when an admin has published a package aimed at this role — lets a
            // normal user reach the plans surface for a custom package built for them.
            'has_purchasable_package' => $this->hasPurchasablePackage(),
            // Custom profile field values + the seller's receipt-branding opt-in.
            'profile_data' => $this->profile_data ?? (object) [],
            'use_own_receipt_branding' => (bool) $this->use_own_receipt_branding,
            'storage_used_mb' => $this->storageUsedMb(),
            'storage_quota_mb' => (int) $this->storage_quota_mb,
            // What this account may actually do — the SPA hides nav from it, and
            // every server-side gate reads the same source.
            'features' => $this->featurePayload(),
            // Vendor ticketed-events: may this account charge guests per RSVP entry?
            'can_pay_per_entry' => $this->canPayPerEntry(),
            // Active plan + add-on entitlements (for the profile + subscription page).
            'entitlements' => $this->activeEntitlements()->map(fn (Entitlement $e) => [
                'id' => $e->id,
                'package_id' => $e->package_id,
                'name' => $e->name,
                'kind' => $e->kind,
                'feature_keys' => $e->feature_keys ?? [],
                'interval' => $e->interval,
                'expires_at' => optional($e->expires_at)->toIso8601String(),
            ])->values(),
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
