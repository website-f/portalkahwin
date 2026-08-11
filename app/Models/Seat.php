<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Seat extends Model
{
    use HasUuids;

    protected $fillable = ['seating_table_id', 'seat_index', 'rsvp_guest_id'];

    protected function casts(): array
    {
        return ['seat_index' => 'integer'];
    }

    public function table(): BelongsTo
    {
        return $this->belongsTo(SeatingTable::class, 'seating_table_id');
    }

    public function guest(): BelongsTo
    {
        return $this->belongsTo(RsvpGuest::class, 'rsvp_guest_id');
    }
}
