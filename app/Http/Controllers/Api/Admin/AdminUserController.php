<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\ProfileField;
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
                ->get(['id', 'slug', 'template_key', 'status', 'bride_name', 'groom_name', 'views', 'trial_views', 'edit_count', 'is_trial', 'is_paid', 'created_at']),
            'payments' => Payment::where('user_id', $user->id)->latest()->limit(20)->get(),
            // Field definitions for this user's role, so the detail page can label the
            // stored profile_data / receipt values it monitors.
            'profile_fields' => ProfileField::forRole($user->role ?? 'user')->values(),
            // Role-change requests this user has raised (pending ones are actionable here).
            'role_requests' => \App\Models\RoleRequest::where('user_id', $user->id)->latest()->get(),
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
            ->when($request->query('role'), fn ($query, $role) => $query->where('role', $role))
            ->latest()
            // The admin table filters/sorts/searches client-side, so hand it the
            // whole list (capped) rather than a 20-row first page.
            ->paginate((int) min(max($request->integer('per_page', 20), 1), 5000));
    }

    public function toggleActive(User $user)
    {
        $user->update(['is_active' => ! $user->is_active]);

        return response()->json($user);
    }

    /** Which template kinds this user may browse/use: all | wedding | event. */
    public function setTemplateScope(Request $request, User $user)
    {
        $data = $request->validate(['template_scope' => ['required', 'in:all,wedding,event']]);
        $user->update($data);

        return response()->json(['ok' => true, 'template_scope' => $user->template_scope]);
    }

    /**
     * Admin opt-out of pay-per-entry for a specific vendor. The master switch in
     * Settings enables the feature for every vendor; this withholds it from one.
     */
    public function setPayPerEntry(Request $request, User $user)
    {
        $data = $request->validate(['pay_per_entry_disabled' => ['required', 'boolean']]);
        $user->update($data);

        return response()->json(['ok' => true, 'pay_per_entry_disabled' => $user->pay_per_entry_disabled]);
    }

    /**
     * Archive an account. Soft delete, never a hard one: an account owns cards,
     * guest lists and payment records, and an admin misclicking a row should not
     * be able to destroy any of it.
     */
    public function destroy(Request $request, User $user)
    {
        abort_if($user->id === $request->user()->id, 422, 'Anda tidak boleh memadam akaun sendiri.');
        abort_if($user->role === 'superadmin', 422, 'Akaun superadmin tidak boleh dipadam.');

        $user->delete();

        return response()->json(['ok' => true]);
    }

    /** Archived accounts, newest first. */
    public function archived(Request $request)
    {
        return User::onlyTrashed()
            ->withCount('invitations')
            ->when($request->query('q'), fn ($query, $q) => $query->where(function ($w) use ($q) {
                $w->where('name', 'like', "%$q%")->orWhere('email', 'like', "%$q%");
            }))
            ->orderByDesc('deleted_at')
            ->paginate(20);
    }

    public function restore(string $id)
    {
        $user = User::onlyTrashed()->findOrFail($id);
        $user->restore();

        return response()->json($user);
    }

    /**
     * The irreversible one — only ever reachable from the archive. Preserves the
     * audit trail: financial records (pay-per-entry collections, payouts, payments)
     * and any templates this account contributed SURVIVE — their identity is
     * snapshotted first, then the FKs null out. Only the account's own event data
     * (cards, guest lists, seating, media) is removed.
     */
    public function forceDestroy(Request $request, string $id)
    {
        $user = User::onlyTrashed()->findOrFail($id);
        abort_if($user->role === 'superadmin', 422, 'Akaun superadmin tidak boleh dipadam.');

        $user->snapshotFinancialsForDeletion();
        $user->invitations()->get()->each(fn ($inv) => $inv->delete()); // cascades guests/seats/media
        $user->forceDelete();

        return response()->json(['ok' => true]);
    }
}
