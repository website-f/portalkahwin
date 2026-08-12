<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TemplateFavorite extends Model
{
    // Plain auto-incrementing id (user_id is a bigint FK) — no HasUuids here.
    protected $fillable = ['user_id', 'template_key'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
