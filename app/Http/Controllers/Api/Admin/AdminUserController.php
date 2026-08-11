<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AdminUserController extends Controller
{
    /** Full profile for the admin user-detail page. */
    public function show(User $user)
    {
        return response()->json([
            'user' => $user,
            'stats' => [
                'cards' => $user->invitations()->count(),
                'published' => $user->invitations()->where('status', 'published')->count(),
                'rsvps' => $user->invitations()->withCount('guests')->get()->sum('guests_count'),
            ],
            'cards' => $user->invitations()->withCount('guests')->latest()
                ->get(['id', 'slug', 'template_key', 'status', 'bride_name', 'groom_name', 'views', 'created_at']),
            'payments' => Payment::where('user_id', $user->id)->latest()->limit(20)->get(),
        ]);
    }

    /** Reset to a temporary password; user must set a new one on next login. */
    public function resetPassword(User $user)
    {
        $temp = 'Pk-'.Str::upper(Str::random(6));
        $user->update(['password' => $temp, 'must_change_password' => true]);

        return response()->json(['temp_password' => $temp]);
    }

    public function index(Request $request)
    {
        return User::withCount('invitations')
            ->when($request->query('q'), fn ($query, $q) => $query->where(function ($w) use ($q) {
                $w->where('name', 'like', "%$q%")->orWhere('email', 'like', "%$q%");
            }))
            ->latest()
            ->paginate(20);
    }

    public function toggleActive(User $user)
    {
        $user->update(['is_active' => ! $user->is_active]);

        return response()->json($user);
    }

    /** Admin "set up on behalf" — mint a token to act as this user. */
    public function impersonate(User $user)
    {
        return response()->json([
            'user' => $user,
            'token' => $user->createToken('impersonation')->plainTextToken,
        ]);
    }
}
