<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RsvpGuest extends Model
{
    use HasUuids;

    protected $fillable = ['invitation_id', 'name', 'phone', 'pax', 'status', 'attended', 'checked_in_at', 'message', 'responded_at'];

    protected function casts(): array
    {
        return ['responded_at' => 'datetime', 'checked_in_at' => 'datetime', 'attended' => 'boolean'];
    }

    public function invitation(): BelongsTo
    {
        return $this->belongsTo(Invitation::class);
    }
}
