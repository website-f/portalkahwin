<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = ['name', 'email', 'password', 'role', 'phone', 'is_active', 'plan', 'plan_expires_at', 'must_change_password'];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
            'plan_expires_at' => 'datetime',
            'must_change_password' => 'boolean',
        ];
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isPremium(): bool
    {
        return $this->isAdmin()
            || ($this->plan === 'premium'
                && (! $this->plan_expires_at || $this->plan_expires_at->isFuture()));
    }

    /** Template keys this user has purchased (per-template ownership). */
    public function ownedTemplates(): array
    {
        return $this->payments()
            ->where('purpose', 'template')
            ->where('status', 'paid')
            ->whereNotNull('template_key')
            ->pluck('template_key')
            ->unique()
            ->values()
            ->all();
    }

    /** Can this user use a given template? Free designs, admins/premium, or ones they bought. */
    public function ownsTemplate(string $key): bool
    {
        return $this->isPremium() || in_array($key, $this->ownedTemplates(), true);
    }

    /** Paying customers (bought ≥1 design) or premium/admin get premium FEATURES like seating. */
    public function hasPaidAccess(): bool
    {
        return $this->isPremium() || count($this->ownedTemplates()) > 0;
    }

    /** Access fields appended to the user payload returned by the auth endpoints. */
    public function accessPayload(): array
    {
        $owned = $this->ownedTemplates();

        return [
            'owned_templates' => $owned,
            'has_paid_access' => $this->isPremium() || count($owned) > 0,
        ];
    }

    public function invitations(): HasMany
    {
        return $this->hasMany(Invitation::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }
}
