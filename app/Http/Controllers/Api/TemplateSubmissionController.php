<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Models\Template;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class TemplateSubmissionController extends Controller
{
    /** Is community template contribution switched on by the admin? */
    private function enabled(): bool
    {
        return Setting::get('allow_user_templates', 'false') === 'true';
    }

    /** PUBLIC-ish gate check for the frontend (also exposed via /settings). */
    public function status()
    {
        return response()->json(['allow_user_templates' => $this->enabled()]);
    }

    /** A user contributes a design: a base template re-skinned with a custom palette. */
    public function store(Request $request)
    {
        abort_unless($this->enabled(), 403, 'Ciri sumbangan rekaan belum dibuka oleh admin.');

        $data = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'category' => ['required', 'string', 'max:40'],
            'description' => ['nullable', 'string', 'max:200'],
            'base_key' => ['required', 'string', 'exists:templates,key'],
            'palette' => ['required', 'array'],
            'palette.primary' => ['required', 'string', 'max:9'],
            'palette.secondary' => ['nullable', 'string', 'max:9'],
            'palette.accent' => ['required', 'string', 'max:9'],
            'palette.bg' => ['required', 'string', 'max:9'],
            'palette.text' => ['nullable', 'string', 'max:9'],
            'thumbnail' => ['nullable', 'string', 'max:300'],
        ]);

        $base = Template::where('key', $data['base_key'])->firstOrFail();

        $key = 'c-'.Str::slug($data['name']).'-'.Str::lower(Str::random(4));
        while (Template::where('key', $key)->exists()) {
            $key = 'c-'.Str::slug($data['name']).'-'.Str::lower(Str::random(4));
        }

        $template = Template::create([
            'key' => $key,
            'base_key' => $base->key,           // render with the chosen base component
            'name' => $data['name'],
            'category' => $data['category'],
            'description' => $data['description'] ?? null,
            'thumbnail' => $data['thumbnail'] ?? $base->thumbnail,
            'tier' => 'free',                    // contributed designs are free
            'price_myr' => 0,
            'palette' => $data['palette'],
            'is_active' => false,
            'status' => 'pending',
            'submitted_by' => $request->user()->id,
            'sort_order' => 900,
        ]);

        return response()->json($template, 201);
    }

    /** The signed-in user's own submissions + statuses. */
    public function mine(Request $request)
    {
        return Template::where('submitted_by', $request->user()->id)
            ->orderByDesc('created_at')
            ->get();
    }

    // ---------------- Admin ----------------

    /**
     * All community/design submissions (any template with a submitter), newest first.
     * Optional ?status=pending|approved|rejected filter; absent or "all" returns everything.
     */
    public function adminIndex(Request $request)
    {
        // Submitted designs only — never a user's private (unsubmitted) draft.
        $query = Template::whereNotNull('submitted_by')
            ->whereIn('status', ['pending', 'approved', 'rejected'])
            ->with('submittedBy:id,name,email')
            ->orderByDesc('created_at');

        $status = $request->query('status');
        if (is_string($status) && in_array($status, ['pending', 'approved', 'rejected'], true)) {
            $query->where('status', $status);
        }

        return $query->get();
    }

    public function approve(Template $template)
    {
        $template->update(['status' => 'approved', 'is_active' => true]);

        return response()->json($template);
    }

    public function reject(Template $template)
    {
        $template->update(['status' => 'rejected', 'is_active' => false]);

        return response()->json($template);
    }

    /**
     * Bulk-delete community submissions. The whereNotNull('submitted_by') guard
     * makes it impossible to delete core catalog templates via this endpoint.
     */
    public function bulkDestroy(Request $request)
    {
        $data = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['string'],
        ]);

        $count = Template::whereIn('id', $data['ids'])
            ->whereNotNull('submitted_by')
            ->delete();

        return response()->json(['ok' => true, 'deleted' => $count]);
    }

    /** Delete a single community submission (core catalog templates are protected). */
    public function destroy(Request $request, Template $template)
    {
        abort_unless($template->submitted_by !== null, 404);

        $template->delete();

        return response()->json(['ok' => true]);
    }
}
