<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Invitation;
use App\Models\RsvpGuest;
use App\Models\Template;
use App\Models\User;
use App\Models\VisitorEvent;
use Illuminate\Support\Facades\DB;

class AdminDashboardController extends Controller
{
    public function index()
    {
        // 7-day traffic (visits per day)
        $since = now()->subDays(6)->startOfDay();
        $rows = VisitorEvent::where('created_at', '>=', $since)
            ->selectRaw('DATE(created_at) as d, COUNT(*) as visits, COUNT(DISTINCT session_id) as visitors')
            ->groupBy('d')->pluck('visits', 'd');

        $traffic = collect(range(0, 6))->map(function ($i) use ($rows) {
            $day = now()->subDays(6 - $i)->toDateString();

            return ['date' => $day, 'visits' => (int) ($rows[$day] ?? 0)];
        });

        // Most-used templates
        $mostUsed = Invitation::select('template_key', DB::raw('COUNT(*) as uses'))
            ->groupBy('template_key')->orderByDesc('uses')->limit(6)->get()
            ->map(fn ($r) => [
                'key' => $r->template_key,
                'name' => optional(Template::where('key', $r->template_key)->first())->name ?? $r->template_key,
                'uses' => (int) $r->uses,
            ]);

        return response()->json([
            'stats' => [
                'users' => User::where('role', 'user')->count(),
                'invitations' => Invitation::count(),
                'published' => Invitation::where('status', 'published')->count(),
                'templates' => Template::count(),
                'rsvps' => RsvpGuest::count(),
                'visits_total' => VisitorEvent::count(),
                'visits_today' => VisitorEvent::whereDate('created_at', today())->count(),
            ],
            'traffic' => $traffic,
            'most_used_templates' => $mostUsed,
            'recent_invitations' => Invitation::with('user:id,name')->latest()->limit(8)
                ->get(['id', 'user_id', 'bride_name', 'groom_name', 'template_key', 'status', 'views', 'created_at']),
        ]);
    }
}
