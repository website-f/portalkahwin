<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/**
 * A superadmin-defined profile field. Fields sharing a group_key render as one tab
 * in the account/company profile; `system` fields back the receipt renderer and
 * cannot be deleted. Values are stored per user (columns for company_name/logo,
 * else users.profile_data).
 */
class ProfileField extends Model
{
    use HasUuids;

    /** Field keys whose value lives on a user column rather than in profile_data. */
    public const COLUMN_KEYS = ['company_name', 'company_logo'];

    protected $fillable = [
        'group_key', 'group_label', 'key', 'label', 'type', 'options', 'roles',
        'required', 'sort', 'is_active', 'system',
    ];

    protected function casts(): array
    {
        return [
            'options' => 'array',
            'roles' => 'array',
            'required' => 'boolean',
            'is_active' => 'boolean',
            'system' => 'boolean',
        ];
    }

    /** Active fields for a role, ordered for display (group, then sort). */
    public static function forRole(string $role)
    {
        return static::query()
            ->where('is_active', true)
            ->orderBy('sort')
            ->orderBy('created_at')
            ->get()
            ->filter(fn (self $f) => in_array($role, $f->roles ?? [], true))
            ->values();
    }
}
