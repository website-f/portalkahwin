<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Template extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'key', 'base_key', 'name', 'category', 'kind', 'languages', 'description', 'thumbnail',
        'tier', 'price_myr', 'palette', 'config', 'is_active', 'status', 'submitted_by', 'sort_order', 'usage_count',
    ];

    protected function casts(): array
    {
        return [
            'palette' => 'array',
            'config' => 'array',
            'languages' => 'array',
            'is_active' => 'boolean',
            'price_myr' => 'decimal:2',
        ];
    }

    /** The registry key of the React component that actually renders this design. */
    public function renderKey(): string
    {
        return $this->base_key ?: $this->key;
    }

    public function submittedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }
}
