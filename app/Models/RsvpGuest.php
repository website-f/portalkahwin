<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RsvpGuest extends Model
{
    use HasUuids;

    protected $fillable = ['invitation_id', 'name', 'phone', 'email', 'pax', 'status', 'pass_token', 'pass_expires_at', 'attended', 'checked_in_at', 'message', 'responded_at', 'seat_notified_table_id', 'seat_notified_at'];

    protected function casts(): array
    {
        return [
            'responded_at' => 'datetime',
            'checked_in_at' => 'datetime',
            'seat_notified_at' => 'datetime',
            'pass_expires_at' => 'datetime',
            'attended' => 'boolean',
        ];
    }

    public function invitation(): BelongsTo
    {
        return $this->belongsTo(Invitation::class);
    }

    /** A paid QR pass is usable while it has a token and hasn't passed its expiry. */
    public function passActive(): bool
    {
        return $this->pass_token !== null
            && ($this->pass_expires_at === null || $this->pass_expires_at->isFuture());
    }
}
