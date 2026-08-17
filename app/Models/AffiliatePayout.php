<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class AffiliatePayout extends Model
{
    use HasUuids;

    protected $fillable = [
        'affiliate_id', 'affiliate_name', 'affiliate_email', 'reference',
        'gross', 'rate_percent', 'amount', 'payments_count', 'method',
        'bank_snapshot', 'note', 'attachment', 'released_by', 'released_at', 'status',
    ];

    protected function casts(): array
    {
        return [
            'gross' => 'decimal:2',
            'rate_percent' => 'decimal:2',
            'amount' => 'decimal:2',
            'released_at' => 'datetime',
        ];
    }

    public function affiliate()
    {
        return $this->belongsTo(User::class, 'affiliate_id');
    }

    public function releasedBy()
    {
        return $this->belongsTo(User::class, 'released_by');
    }
}
