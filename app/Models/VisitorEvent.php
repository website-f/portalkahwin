<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class VisitorEvent extends Model
{
    use HasUuids;

    public $timestamps = false;

    protected $fillable = ['path', 'referrer', 'session_id', 'ip', 'user_agent', 'created_at'];

    protected function casts(): array
    {
        return ['created_at' => 'datetime'];
    }
}
