<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Package extends Model
{
    use HasUuids;

    protected $fillable = ['name', 'role_target', 'kind', 'price_myr', 'interval', 'features', 'feature_keys', 'is_active', 'sort'];

    protected function casts(): array
    {
        return [
            'features' => 'array',
            'feature_keys' => 'array',
            'is_active' => 'boolean',
            'price_myr' => 'decimal:2',
        ];
    }

    /** Does this package target the given role? ('any' = everyone.) */
    public function allowsRole(?string $role): bool
    {
        return $this->role_target === 'any' || $this->role_target === $role;
    }
}
