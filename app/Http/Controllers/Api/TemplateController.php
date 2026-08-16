<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Template;

class TemplateController extends Controller
{
    /**
     * Public catalog for the gallery — only approved, active designs.
     *
     * `usage_count` (incremented whenever a card is created from a design) and
     * `created_at` come along so the gallery's Popular / Latest tabs sort on real
     * data instead of guessing from the price tier.
     */
    public function index()
    {
        // A signed-in user may be scoped to one kind (e.g. an events-only vendor);
        // guests and 'all' users see everything. `template_scope` is set by a
        // superadmin on the user-detail page.
        $scope = optional(auth('sanctum')->user())->template_scope;

        return Template::where('is_active', true)
            ->where('status', 'approved')
            ->when(in_array($scope, ['wedding', 'event'], true), fn ($q) => $q->where('kind', $scope))
            ->orderBy('sort_order')
            ->get();
    }

    /**
     * A single design. Public callers only ever see approved, active ones.
     *
     * Staff are exempt: an admin has to be able to open a *pending* submission
     * to judge it before deciding, and the preview page is the only place that
     * renders a design at full size. The route stays unauthenticated, so the
     * guard reads the optional bearer token rather than assuming a session.
     */
    public function show(string $key)
    {
        $viewer = auth('sanctum')->user();

        return Template::where('key', $key)
            ->unless($viewer && $viewer->isAdmin(), fn ($q) => $q
                ->where('is_active', true)
                ->where('status', 'approved'))
            ->firstOrFail();
    }
}
