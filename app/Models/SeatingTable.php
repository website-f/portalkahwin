<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SeatingTable extends Model
{
    use HasUuids;

    protected $fillable = ['invitation_id', 'label', 'shape', 'capacity', 'pos_x', 'pos_y', 'sort'];

    protected function casts(): array
    {
        return ['capacity' => 'integer', 'pos_x' => 'float', 'pos_y' => 'float', 'sort' => 'integer'];
    }

    public function invitation(): BelongsTo
    {
        return $this->belongsTo(Invitation::class);
    }

    public function seats(): HasMany
    {
        return $this->hasMany(Seat::class)->orderBy('seat_index');
    }

    /** Create/trim seat rows so their count matches capacity. */
    public function syncSeats(): void
    {
        $existing = $this->seats()->count();
        if ($existing < $this->capacity) {
            for ($i = $existing; $i < $this->capacity; $i++) {
                $this->seats()->create(['seat_index' => $i]);
            }
        } elseif ($existing > $this->capacity) {
            $this->seats()->where('seat_index', '>=', $this->capacity)->delete();
        }
    }
}
