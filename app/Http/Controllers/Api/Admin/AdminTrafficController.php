<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\VisitorEvent;
use Illuminate\Http\Request;

class AdminTrafficController extends Controller
{
    public function index(Request $request)
    {
        $days = (int) $request->query('days', 30);
        $days = max(7, min(90, $days));
        $since = now()->subDays($days - 1)->startOfDay();

        $rows = VisitorEvent::where('created_at', '>=', $since)
            ->selectRaw('DATE(created_at) as d, COUNT(*) as visits, COUNT(DISTINCT session_id) as visitors')
            ->groupBy('d')->get()->keyBy('d');

        $series = collect(range(0, $days - 1))->map(function ($i) use ($rows, $days) {
            $day = now()->subDays($days - 1 - $i)->toDateString();
            $r = $rows->get($day);

            return ['date' => $day, 'visits' => (int) ($r->visits ?? 0), 'visitors' => (int) ($r->visitors ?? 0)];
        });

        $topPaths = VisitorEvent::where('created_at', '>=', $since)
            ->selectRaw('path, COUNT(*) as hits')->groupBy('path')->orderByDesc('hits')->limit(10)->get();

        $referrers = VisitorEvent::where('created_at', '>=', $since)
            ->whereNotNull('referrer')->where('referrer', '!=', '')
            ->selectRaw('referrer, COUNT(*) as hits')->groupBy('referrer')->orderByDesc('hits')->limit(8)->get();

        return response()->json([
            'range_days' => $days,
            'totals' => [
                'visits' => VisitorEvent::where('created_at', '>=', $since)->count(),
                'visitors' => VisitorEvent::where('created_at', '>=', $since)->distinct('session_id')->count('session_id'),
                'today' => VisitorEvent::whereDate('created_at', today())->count(),
            ],
            'series' => $series,
            'top_paths' => $topPaths,
            'referrers' => $referrers,
        ]);
    }
}
