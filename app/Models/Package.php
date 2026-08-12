<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Package extends Model
{
    use HasUuids;

    protected $fillable = ['name', 'role_target', 'price_myr', 'interval', 'features', 'is_active', 'sort'];

    protected function casts(): array
    {
        return ['features' => 'array', 'is_active' => 'boolean', 'price_myr' => 'decimal:2'];
    }
}
