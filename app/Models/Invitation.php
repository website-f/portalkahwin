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
        'opening_line', 'bismillah', 'cover_image',
        'akad_at', 'reception_at', 'date_label', 'time_label', 'hijri_label',
        'venue_name', 'venue_address', 'maps_url', 'waze_url',
        'program', 'contacts', 'gift', 'wishlist', 'gallery_images', 'music_url', 'palette',
        'rsvp_enabled', 'sections', 'auto_seat', 'views',
        'is_paid', 'published_at', 'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'bismillah' => 'boolean',
            'rsvp_enabled' => 'boolean',
            'auto_seat' => 'boolean',
            'akad_at' => 'datetime',
            'reception_at' => 'datetime',
            'is_paid' => 'boolean',
            'published_at' => 'datetime',
            'expires_at' => 'datetime',
            'program' => 'array',
            'contacts' => 'array',
            'gift' => 'array',
            'wishlist' => 'array',
            'gallery_images' => 'array',
            'palette' => 'array',
            'sections' => 'array',
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
            'groomParents' => $this->groom_parents,
            'brideParents' => $this->bride_parents,
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
            'palette' => $this->palette,
            'sections' => $s,
        ];
    }
}
