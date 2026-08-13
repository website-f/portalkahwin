<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/**
 * A background track the admin offers hosts to choose from.
 *
 * Most couples do not have a track in mind, and pasting a YouTube link is a
 * step they often get wrong. A curated list makes the common case one tap,
 * while their own URL stays available for anyone who wants it.
 */
class MusicPreset extends Model
{
    use HasUuids;

    protected $fillable = ['title', 'artist', 'url', 'sort', 'is_active'];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'sort' => 'integer',
        ];
    }
}
