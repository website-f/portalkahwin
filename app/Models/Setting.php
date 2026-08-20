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
            // How long a premium/subscription grant lasts, in months (replaces the
            // old hard-coded 1 year). Applied wherever a plan is granted.
            'premium_duration_months' => 12,
            'free_card_limit' => 1,
            'free_guest_limit' => 30,
            'premium_guest_limit' => 0, // 0 = unlimited
            // Default number of inviting parent families a wedding card shows:
            // '2' = both families (two_couples), '1' = a single family.
            'default_parent_families' => '2',
            // Max party size a single RSVP / paid entry may declare.
            'rsvp_max_pax' => 20,
            // Seating: capacity a fresh table starts at, and the ceiling per table.
            'default_table_capacity' => 8,
            'max_table_capacity' => 20,
            // Commission an affiliate earns on sales they refer (% of gross). 0 = off.
            'affiliate_commission_percent' => 0,
            // Reseller mode: when on, an affiliate may create + pay for a card on
            // behalf of a client and set the client's name as the receipt "billed to".
            'affiliate_reseller_enabled' => 'false',
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
            // Default background song for Preview + Test mode (a file URL or YouTube link).
            // This is the GENERAL default (covers weddings + any type without an override).
            'preview_song_url' => '',
            'preview_song_start' => 0,
            'preview_song_end' => null,
            // Per-card-type default-song overrides for Preview + Test mode, keyed by type
            // (birthday|openhouse|concert|aqiqah|corporate|gala|wedding) → {url,start,end}.
            // A type with no entry falls back to the general default above.
            'preview_songs' => [],
            'preview_gallery_images' => [],
            // Target date/time for the countdown in Preview + Test mode, so it visibly
            // ticks (the sample event is otherwise "today" and the countdown reads 0).
            // Blank or past → the preview falls back to 30 days out. ISO-ish string.
            'preview_countdown_at' => '',
            // Per-genre sample gallery photos for Preview + Test mode, keyed by genre
            // (malay|chinese|indian|event) → string[]. Lets the admin show the right
            // sample photos on each kind of card instead of one shared set. A genre
            // with no entry falls back to `preview_gallery_images` above.
            'preview_gallery_by_genre' => [],
            // May a host upload their OWN background music (MP3 file or YouTube link)?
            // When 'false', hosts may ONLY pick from the admin's curated music library.
            'allow_host_music_upload' => 'true',
            // Business identity shown on receipts/invoices (editable by superadmin).
            'receipt_company_name' => 'TiraTech Marketing Sdn. Bhd. (1684387-U)',
            'receipt_description' => 'Kad Kahwin Digital / Digital Invitation Card',
            'receipt_phone' => '010 - 306 5978',
            'receipt_website' => 'www.portalkahwin.com',
            'receipt_email' => 'contact@portalkahwin.com',
            // WhatsApp number guests/hosts are sent to for billing help (order checks,
            // plan changes). Digits only, international form preferred (e.g. 60123456789).
            // Blank falls back to receipt_phone, normalised to wa.me form on the client.
            'support_whatsapp' => '',
            // Master switch: may vendors/affiliates put their OWN business on receipts?
            // If 'false', every receipt uses the platform identity above regardless of
            // an individual seller's opt-in.
            'allow_seller_receipt_branding' => 'true',
            // Pay-per-entry RSVP (vendor ticketed events). Master switch — when 'false'
            // no vendor can turn per-entry charging on. The platform collects every
            // guest payment and DEDUCTS a configurable list of charges (commission, FPX
            // fee, etc.) before paying each vendor out manually. Those charges are the
            // platform's income. The QR pass stays valid this many days past the event.
            'pay_per_entry_enabled' => 'false',
            // Each charge: { name, mode: 'percent'|'flat', value }. Applied in order to
            // the amount the guest paid; percent = % of that amount, flat = flat RM.
            'pay_per_entry_charges' => [
                ['name' => 'Commission', 'mode' => 'percent', 'value' => 10],
            ],
            'pay_per_entry_grace_days' => 3,
            // Admin-imported Google Fonts, added to the card display-font picker.
            // Each: { id, label, google, stack, group }. Merged with the built-ins.
            'card_fonts' => [],
            // Superadmin-managed template categories (the Designer picker + gallery
            // filter draw from this). Seeded from the live categories by migration.
            'template_categories' => [],
        ];
    }

    /** Master switch: is the vendor pay-per-entry feature turned on at all? */
    public static function payPerEntryEnabled(): bool
    {
        return static::get('pay_per_entry_enabled', 'false') === 'true';
    }

    /**
     * The platform's deduction lines for pay-per-entry, normalised. Falls back to
     * the legacy single-fee settings if the list has never been configured.
     *
     * @return array<int,array{name:string,mode:string,value:float}>
     */
    public static function payPerEntryCharges(): array
    {
        $raw = static::get('pay_per_entry_charges');
        $list = [];
        if (is_array($raw)) {
            foreach ($raw as $c) {
                if (! is_array($c)) {
                    continue;
                }
                $name = trim((string) ($c['name'] ?? ''));
                $mode = ($c['mode'] ?? 'percent') === 'flat' ? 'flat' : 'percent';
                $value = round((float) ($c['value'] ?? 0), 2);
                if ($name === '' || $value <= 0) {
                    continue;
                }
                $list[] = ['name' => $name, 'mode' => $mode, 'value' => $value];
            }
        }

        if (empty($list)) {
            // Legacy fallback so older installs keep charging their commission.
            $mode = static::get('pay_per_entry_fee_type', 'percent') === 'fixed' ? 'flat' : 'percent';
            $value = round((float) static::get('pay_per_entry_fee_value', 10), 2);
            if ($value > 0) {
                $list[] = ['name' => 'Commission', 'mode' => $mode, 'value' => $value];
            }
        }

        return $list;
    }

    /** How many days after the event a paid QR pass stays valid before cleanup. */
    public static function payPerEntryGraceDays(): int
    {
        return max(0, (int) static::get('pay_per_entry_grace_days', 3));
    }

    /** Months a premium/subscription grant lasts (min 1). */
    public static function premiumDurationMonths(): int
    {
        return max(1, (int) static::get('premium_duration_months', 12));
    }

    /** Max party size allowed on a single RSVP / paid entry (min 1). */
    public static function rsvpMaxPax(): int
    {
        return max(1, (int) static::get('rsvp_max_pax', 20));
    }

    /** Seating: a fresh table's starting capacity (min 1). */
    public static function defaultTableCapacity(): int
    {
        return max(1, (int) static::get('default_table_capacity', 8));
    }

    /** Seating: ceiling capacity per table (min 1). */
    public static function maxTableCapacity(): int
    {
        return max(1, (int) static::get('max_table_capacity', 20));
    }

    /** Affiliate commission rate on referred sales, as a fraction 0..1. */
    public static function affiliateCommissionRate(): float
    {
        return max(0, min(100, (float) static::get('affiliate_commission_percent', 0))) / 100;
    }

    /** Free-plan card cap (0 = unlimited). */
    public static function freeCardLimit(): int
    {
        return max(0, (int) static::get('free_card_limit', 1));
    }

    /** Free-plan guest cap per card (0 = unlimited). */
    public static function freeGuestLimit(): int
    {
        return max(0, (int) static::get('free_guest_limit', 30));
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
