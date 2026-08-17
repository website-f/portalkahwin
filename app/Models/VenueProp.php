<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A fixture on the hall floorplan that is not a guest table — the pelamin, the
 * entrance, the buffet line, a vendor booth.
 *
 * Props carry no seats and no guests: they exist so the host (and anyone
 * reading the plan) can see the room, not just the tables floating in space.
 */
class VenueProp extends Model
{
    use HasUuids;

    /** kind => [default label, default width, default height] */
    public const KINDS = [
        'stage' => ['Pelamin', 260, 120],
        'entrance' => ['Pintu Masuk', 150, 60],
        'reception' => ['Meja Pendaftaran', 180, 70],
        'catering' => ['Meja Katering', 300, 80],
        'gift' => ['Kaunter Salam Kaut', 170, 70],
        'vendor_booth' => ['Booth Vendor', 160, 100],
        'photo' => ['Photo Booth', 160, 110],
        'dancefloor' => ['Ruang Tarian', 220, 180],
        'vip' => ['Meja VIP', 200, 90],
        'restroom' => ['Tandas', 130, 80],
        'walkway' => ['Laluan', 340, 60],
        'parking' => ['Tempat Letak Kereta', 240, 120],
        // Host-named fixture (speakers, mic setup, …) with its own colour.
        'custom' => ['Prop', 200, 90],
    ];

    protected $fillable = ['invitation_id', 'kind', 'label', 'color', 'details', 'pos_x', 'pos_y', 'width', 'height', 'rotation', 'sort'];

    protected function casts(): array
    {
        return [
            'pos_x' => 'float',
            'pos_y' => 'float',
            'width' => 'integer',
            'height' => 'integer',
            'rotation' => 'integer',
            'sort' => 'integer',
        ];
    }

    public function invitation(): BelongsTo
    {
        return $this->belongsTo(Invitation::class);
    }
}
