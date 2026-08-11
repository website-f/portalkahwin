<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    protected $primaryKey = 'key';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = ['key', 'value'];

    protected function casts(): array
    {
        return ['value' => 'json'];
    }

    /** Editable site settings + their defaults. */
    public static function defaults(): array
    {
        return [
            'site_name' => 'PortalKahwin',
            'support_email' => 'sokongan@portalkahwin.test',
            'currency' => 'MYR',
            'premium_price_myr' => 59,
            'free_card_limit' => 1,
            'free_guest_limit' => 30,
            'premium_guest_limit' => 0, // 0 = unlimited
        ];
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        $row = static::find($key);
        if ($row) {
            return $row->value;
        }

        return $default ?? (static::defaults()[$key] ?? null);
    }

    /** All settings merged over defaults. */
    public static function allMerged(): array
    {
        $overrides = static::all()->pluck('value', 'key')->toArray();

        return array_merge(static::defaults(), $overrides);
    }

    public static function put(string $key, mixed $value): void
    {
        static::updateOrCreate(['key' => $key], ['value' => $value]);
    }
}
