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
        'user_id', 'template_key', 'slug', 'status',
        'groom_name', 'bride_name', 'groom_short', 'bride_short', 'groom_parents', 'bride_parents',
        'invite_side', 'opening_line', 'bismillah', 'cover_image',
        'akad_at', 'reception_at', 'date_label', 'time_label', 'hijri_label',
        'venue_name', 'venue_address', 'maps_url', 'waze_url',
        'program', 'contacts', 'gift', 'wishlist', 'gallery_images', 'music_url', 'motion_file', 'motion_tint', 'palette', 'font_id',
        'rsvp_enabled', 'rsvp_fields', 'sections', 'section_order', 'auto_seat', 'seat_names_private', 'views',
        'is_paid', 'is_trial', 'trial_views', 'edit_count', 'published_at', 'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'bismillah' => 'boolean',
            'rsvp_enabled' => 'boolean',
            'motion_tint' => 'boolean',
            'auto_seat' => 'boolean',
            'seat_names_private' => 'boolean',
            'akad_at' => 'datetime',
            'reception_at' => 'datetime',
            'is_paid' => 'boolean',
            'is_trial' => 'boolean',
            'trial_views' => 'integer',
            'edit_count' => 'integer',
            'published_at' => 'datetime',
            'expires_at' => 'datetime',
            'program' => 'array',
            'contacts' => 'array',
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
    public const MOVABLE_SECTIONS = ['program', 'location', 'rsvp', 'wishes', 'wishlist', 'contacts', 'gift', 'gallery'];

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
            'galleryImages' => $on('gallery') ? ($this->gallery_images ?? []) : [],
            'musicUrl' => $this->music_url,
            'motionFile' => $this->motion_file,
            'motionTint' => (bool) $this->motion_tint,
            'palette' => $this->palette,
            'fontId' => $this->font_id,
            'sections' => $s,
            'sectionOrder' => $this->sectionOrder(),
        ];
    }
}
