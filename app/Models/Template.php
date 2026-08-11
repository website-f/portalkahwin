<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Template extends Model
{
    use HasUuids;

    protected $fillable = [
        'key', 'name', 'category', 'description', 'thumbnail',
        'tier', 'price_myr', 'palette', 'is_active', 'sort_order', 'usage_count',
    ];

    protected function casts(): array
    {
        return [
            'palette' => 'array',
            'is_active' => 'boolean',
            'price_myr' => 'decimal:2',
        ];
    }
}
