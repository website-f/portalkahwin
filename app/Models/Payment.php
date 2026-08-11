<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    use HasUuids;

    protected $fillable = ['user_id', 'purpose', 'template_key', 'reference', 'bill_code', 'amount_myr', 'status', 'meta', 'paid_at'];

    protected function casts(): array
    {
        return ['meta' => 'array', 'paid_at' => 'datetime', 'amount_myr' => 'decimal:2'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
