<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class AdminUserController extends Controller
{
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
