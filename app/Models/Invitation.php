<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Invitation extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id', 'client_name', 'template_key', 'slug', 'status',
        'kind', 'event_type', 'event_name', 'event_subtitle', 'event_description', 'custom_fields', 'event_outro', 'poster_image', 'organizer',
        'groom_name', 'bride_name', 'groom_short', 'bride_short', 'groom_parents', 'bride_parents',
        'invite_side', 'opening_line', 'bismillah', 'cover_image',
        'akad_at', 'reception_at', 'date_label', 'time_label', 'hijri_label',
        'venue_name', 'venue_address', 'maps_url', 'waze_url',
        'program', 'contacts', 'gift', 'wishlist', 'wishes_layout', 'gallery_images', 'music_url', 'music_start', 'music_end', 'motion_file', 'motion_tint', 'palette', 'font_id',
        'rsvp_enabled', 'rsvp_fields', 'rsvp_pay_enabled', 'rsvp_price', 'rsvp_tax_percent', 'sections', 'section_order', 'auto_seat', 'seat_limit', 'seat_names_private', 'views',
        'is_paid', 'is_trial', 'trial_views', 'edit_count', 'published_at', 'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'bismillah' => 'boolean',
            'rsvp_enabled' => 'boolean',
            'rsvp_pay_enabled' => 'boolean',
            'rsvp_price' => 'decimal:2',
            'rsvp_tax_percent' => 'decimal:2',
            'motion_tint' => 'boolean',
            'auto_seat' => 'boolean',
            'seat_limit' => 'integer',
            'seat_names_private' => 'boolean',
            'akad_at' => 'datetime',
            'reception_at' => 'datetime',
            'is_paid' => 'boolean',
            'is_trial' => 'boolean',
            'trial_views' => 'integer',
            'edit_count' => 'integer',
            'music_start' => 'integer',
            'music_end' => 'integer',
            'published_at' => 'datetime',
            'expires_at' => 'datetime',
            'program' => 'array',
            'contacts' => 'array',
            'custom_fields' => 'array',
            'gift' => 'array',
            'wishlist' => 'array',
            'gallery_images' => 'array',
            'palette' => 'array',
            'sections' => 'array',
            'section_order' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function guests(): HasMany
    {
        return $this->hasMany(RsvpGuest::class);
    }

    public function entryPayments(): HasMany
    {
        return $this->hasMany(EntryPayment::class);
    }

    /** A non-wedding card (concert, gala, seminar…) — different field set + tickets. */
    public function isEvent(): bool
    {
        return ($this->kind ?? 'wedding') === 'event';
    }

    /**
     * Is this a live ticketed event — i.e. should a guest be charged to RSVP?
     * All three must hold: the master switch is on, the owner is a vendor, and the
     * card itself has per-entry charging enabled with a real price.
     */
    public function payPerEntryActive(): bool
    {
        // canPayPerEntry() bundles: vendor + master switch + not admin-disabled.
        return (bool) $this->user?->canPayPerEntry()
            && (bool) $this->rsvp_pay_enabled
            && (float) $this->rsvp_price > 0;
    }

    /** When a paid QR pass issued now should stop working (event date + grace window). */
    public function passExpiresAt(): \Illuminate\Support\Carbon
    {
        $event = $this->reception_at ?? $this->akad_at;
        $base = $event ? $event->copy() : now()->addDays(30);

        return $base->endOfDay()->addDays(Setting::payPerEntryGraceDays());
    }

    /**
     * Total seats available: the built table layout takes precedence; otherwise the
     * flexible `seat_limit`. Null = uncapped (no layout and no limit set).
     */
    public function seatCapacity(): ?int
    {
        $tableCap = (int) $this->tables()->sum('capacity');
        if ($tableCap > 0) {
            return $tableCap;
        }
        $limit = (int) ($this->seat_limit ?? 0);

        return $limit > 0 ? $limit : null;
    }

    /** Heads already committed (attending). A guest of pax N takes N seats. */
    public function seatsTaken(): int
    {
        return (int) $this->guests()->where('status', 'attending')->sum('pax');
    }

    /** Would admitting `$addPax` more guests exceed the capacity? Uncapped ⇒ never. */
    public function seatingFull(int $addPax = 0): bool
    {
        $cap = $this->seatCapacity();

        return $cap !== null && ($this->seatsTaken() + max(0, $addPax)) > $cap;
    }

    /** Who a would-be guest should contact when the event is full. */
    public function vendorContact(): array
    {
        $owner = $this->user;
        $phone = $owner?->phone;
        if (! $phone && is_array($this->contacts)) {
            foreach ($this->contacts as $c) {
                if (! empty($c['phone'])) {
                    $phone = $c['phone'];
                    break;
                }
            }
        }

        return [
            'name' => $owner?->company_name ?: $owner?->name,
            'phone' => $phone,
            'email' => $owner?->email,
        ];
    }

    public function wishes(): HasMany
    {
        return $this->hasMany(Wish::class);
    }

    public function tables(): HasMany
    {
        return $this->hasMany(SeatingTable::class)->orderBy('sort');
    }

    /** Non-table fixtures on the floorplan (pelamin, entrance, catering…). */
    public function props(): HasMany
    {
        return $this->hasMany(VenueProp::class)->orderBy('sort');
    }

    /**
     * Who is inviting. Decides whose parents are named on the card: a card sent
     * by the groom's side does not list the bride's parents as hosts, and
     * printing both when only one is inviting reads as a mistake to the family.
     */
    public const INVITE_SIDES = ['groom', 'bride', 'both_groom', 'both_bride', 'two_couples'];

    /** Whether the groom's / bride's parents are named, for the chosen side. */
    public function namesGroomSide(): bool
    {
        return $this->invite_side !== 'bride';
    }

    public function namesBrideSide(): bool
    {
        return $this->invite_side !== 'groom';
    }

    /** Contact details the RSVP form may ask for. */
    public const RSVP_FIELD_SETS = ['both', 'email', 'phone'];

    /**
     * The RSVP contact fields actually shown, after the host's own feature set
     * has its say: seating delivers a guest's table by email, so a host who can
     * seat guests always collects an email whatever they picked.
     */
    public function rsvpFieldSet(): string
    {
        $chosen = in_array($this->rsvp_fields, self::RSVP_FIELD_SETS, true) ? $this->rsvp_fields : 'both';

        if ($chosen === 'phone' && $this->user?->hasFeature('seating')) {
            return 'both';
        }

        return $chosen;
    }

    /**
     * The card sections a host may reorder, in the order templates render them
     * by default. The cover, the couple block and the footer are structural and
     * deliberately stay put.
     */
    // Default order (host can reorder/hide in the editor): tentatif(program) →
    // gallery → ucapan(wishes) → gifts(gift/wishlist) → rsvp → contact.
    public const MOVABLE_SECTIONS = ['program', 'location', 'gallery', 'wishes', 'gift', 'wishlist', 'rsvp', 'contacts'];

    /**
     * The stored order, repaired against MOVABLE_SECTIONS: unknown keys are
     * dropped and any section the host never touched is appended in canonical
     * order. Always returns every movable key exactly once.
     */
    public function sectionOrder(): array
    {
        $stored = array_values(array_filter(
            is_array($this->section_order) ? $this->section_order : [],
            fn ($k) => is_string($k) && in_array($k, self::MOVABLE_SECTIONS, true),
        ));

        $seen = array_unique($stored);

        return array_values(array_merge($seen, array_diff(self::MOVABLE_SECTIONS, $seen)));
    }

    /** Default-on section toggles, merged with any per-card overrides. */
    public function sectionFlags(): array
    {
        $defaults = [
            'opening' => true, 'program' => true, 'location' => true, 'wishes' => true,
            'wishlist' => true, 'contacts' => true, 'gift' => true, 'gallery' => true,
        ];

        return array_merge($defaults, $this->sections ?? []);
    }

    /** Shape the invitation into the camelCase InvitationData the React templates expect. */
    public function toCardData(): array
    {
        $s = $this->sectionFlags();
        $on = fn (string $k) => (bool) ($s[$k] ?? true);

        return [
            'kind' => $this->kind ?? 'wedding',
            'eventType' => $this->event_type,
            'eventName' => $this->event_name,
            'eventSubtitle' => $this->event_subtitle,
            'eventDescription' => $this->event_description,
            'customFields' => $this->custom_fields ?? [],
            'eventOutro' => $this->event_outro,
            'posterImage' => $this->poster_image,
            'organizer' => $this->organizer,
            'groomName' => $this->groom_name,
            'brideName' => $this->bride_name,
            'groomShort' => $this->groom_short,
            'brideShort' => $this->bride_short,
            'groomParents' => $this->namesGroomSide() ? $this->groom_parents : null,
            'brideParents' => $this->namesBrideSide() ? $this->bride_parents : null,
            'inviteSide' => $this->invite_side,
            'openingLine' => $on('opening') ? $this->opening_line : null,
            'bismillah' => (bool) $this->bismillah,
            'coverImage' => $this->cover_image,
            'akadAt' => optional($this->akad_at)->toIso8601String(),
            'receptionAt' => optional($this->reception_at)->toIso8601String(),
            'dateLabel' => $this->date_label,
            'timeLabel' => $this->time_label,
            'hijriLabel' => $this->hijri_label,
            'venueName' => $on('location') ? $this->venue_name : null,
            'venueAddress' => $on('location') ? $this->venue_address : null,
            'mapsUrl' => $on('location') ? $this->maps_url : null,
            'wazeUrl' => $on('location') ? $this->waze_url : null,
            'program' => $on('program') ? ($this->program ?? []) : [],
            'contacts' => $on('contacts') ? ($this->contacts ?? []) : [],
            'gift' => $on('gift') ? $this->gift : null,
            'wishlist' => $on('wishlist') ? ($this->wishlist ?? []) : [],
            'wishesLayout' => $this->wishes_layout ?? 'carousel',
            'galleryImages' => $on('gallery') ? ($this->gallery_images ?? []) : [],
            'musicUrl' => $this->music_url,
            'musicStart' => (int) $this->music_start,
            'musicEnd' => $this->music_end,
            'motionFile' => $this->motion_file,
            'motionTint' => (bool) $this->motion_tint,
            'palette' => $this->palette,
            'fontId' => $this->font_id,
            'sections' => $s,
            'sectionOrder' => $this->sectionOrder(),
        ];
    }
}
