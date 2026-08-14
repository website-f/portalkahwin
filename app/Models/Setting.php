<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    protected $primaryKey = 'key';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['key', 'value'];

    protected function casts(): array
    {
        return ['value' => 'json'];
    }

    /** Editable site settings + their defaults. */
    public static function defaults(): array
    {
        return [
            'site_name' => 'PortalKahwin',
            'support_email' => 'sokongan@portalkahwin.test',
            'currency' => 'MYR',
            'premium_price_myr' => 59,
            'free_card_limit' => 1,
            'free_guest_limit' => 30,
            'premium_guest_limit' => 0, // 0 = unlimited
            // Per-file upload ceiling, applied to card media, designer assets and
            // company logos alike so there is a single number to raise.
            'max_upload_mb' => 5,
            // Starting storage allowance per role. Only seeds a NEW account —
            // an individual quota is then revised per user from Approvals.
            'storage_quota_vendor_mb' => 100,
            'storage_quota_affiliate_mb' => 50,
            'storage_quota_user_mb' => 50,
            // Which flow normal users / affiliates use: 'trial' (Logic 2 — try the
            // template fully, then log in + pay to publish) or 'buy' (Logic 1 — must
            // buy before editing). Superadmin switches this.
            'signup_flow' => 'trial',
            // How many times a trial/preview link may be opened before it locks and
            // asks the host to pay. 0 = unlimited.
            'trial_view_limit' => 5,
            // Max edits allowed per card, to stop one purchase being reused across
            // weddings. 0 = unlimited.
            'card_edit_limit' => 0,
            // Business identity shown on receipts/invoices (editable by superadmin).
            'receipt_company_name' => 'TiraTech Marketing Sdn. Bhd. (1684387-U)',
            'receipt_description' => 'Kad Kahwin Digital / Digital Invitation Card',
            'receipt_phone' => '010 - 306 5978',
            'receipt_website' => 'www.portalkahwin.com',
            'receipt_email' => 'contact@portalkahwin.com',
        ];
    }

    /**
     * Capabilities an admin can switch on or off per role.
     *
     * These are business rules, not code constants: the client's plan for who
     * gets seating or QR check-in has already changed once, so it lives in
     * settings rather than in `if ($user->role === …)` scattered through the
     * controllers. Every gate reads `roleCan()`.
     */
    public const FEATURES = ['seating', 'checkin', 'qr_passes', 'company_branding', 'designer'];

    public const FEATURE_ROLES = ['user', 'vendor', 'affiliate'];

    /**
     * Shipping defaults. Table management, check-in and QR passes are the
     * subscription features — vendors and affiliates pay for them, normal users
     * get invitations and the RSVP list.
     */
    public static function featureDefaults(): array
    {
        return [
            'user' => [
                'seating' => false,
                'checkin' => false,
                'qr_passes' => false,
                'company_branding' => false,
                'designer' => true,
            ],
            'vendor' => [
                'seating' => true,
                'checkin' => true,
                'qr_passes' => true,
                'company_branding' => true,
                'designer' => true,
            ],
            // Affiliates behave exactly like normal users (they buy designs per event);
            // their only extra is referral sales tracking. Admin can still flip any of
            // these on per-role from the matrix.
            'affiliate' => [
                'seating' => false,
                'checkin' => false,
                'qr_passes' => false,
                'company_branding' => false,
                'designer' => true,
            ],
        ];
    }

    /** Settings key holding one role/feature switch. */
    public static function featureKey(string $role, string $feature): string
    {
        return "feat_{$role}_{$feature}";
    }

    /** Is `$feature` switched on for `$role`? Falls back to the shipping default. */
    public static function roleCan(string $role, string $feature): bool
    {
        $default = static::featureDefaults()[$role][$feature] ?? false;
        $stored = static::get(static::featureKey($role, $feature));

        if ($stored === null) {
            return $default;
        }

        return $stored === true || $stored === 'true' || $stored === 1 || $stored === '1';
    }

    /** The whole matrix, defaults merged with overrides — for the admin UI. */
    public static function featureMatrix(): array
    {
        $out = [];
        foreach (static::FEATURE_ROLES as $role) {
            foreach (static::FEATURES as $feature) {
                $out[static::featureKey($role, $feature)] = static::roleCan($role, $feature);
            }
        }

        return $out;
    }

    /** Per-file upload ceiling in kilobytes, for Laravel's `max:` rule. */
    public static function maxUploadKb(): int
    {
        return max(1, (int) static::get('max_upload_mb', 5)) * 1024;
    }

    /** Starting storage allowance for a freshly created account of this role. */
    public static function quotaForRole(string $role): int
    {
        return (int) match ($role) {
            'vendor' => static::get('storage_quota_vendor_mb', 100),
            'affiliate' => static::get('storage_quota_affiliate_mb', 50),
            default => static::get('storage_quota_user_mb', 50),
        };
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        $row = static::find($key);
        if ($row) {
            return $row->value;
        }

        return $default ?? (static::defaults()[$key] ?? null);
    }

    /** All settings merged over defaults. */
    public static function allMerged(): array
    {
        $overrides = static::all()->pluck('value', 'key')->toArray();

        return array_merge(static::defaults(), $overrides);
    }

    public static function put(string $key, mixed $value): void
    {
        static::updateOrCreate(['key' => $key], ['value' => $value]);
    }
}
