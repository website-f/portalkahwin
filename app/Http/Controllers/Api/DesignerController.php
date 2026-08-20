<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\Setting;
use App\Models\Template;
use App\Support\ThumbnailStore;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * The no-code template DESIGNER — creates/edits `base_key = 'custom'` designs
 * stored as a JSON config. Shared by users (contribute → pending review) and
 * admins (publish directly). Drafts stay private until submitted/published.
 */
class DesignerController extends Controller
{
    private function enabled(Request $request): bool
    {
        // Two gates must both allow a non-admin: the global "user templates" master
        // switch AND the per-role `designer` capability (so the plan feature shown in
        // Subscriptions is actually enforced, not just a UI label).
        $user = $request->user();

        return $user->isAdmin()
            || (Setting::get('allow_user_templates', 'false') === 'true' && $user->hasFeature('designer'));
    }

    private function ownDesign(Request $request, Template $template): void
    {
        // An admin may edit ANY catalogue design in the Designer — a no-code
        // (custom) design fully, or a built-in template's palette + listing.
        if ($request->user()->isAdmin()) {
            return;
        }
        abort_unless($template->base_key === 'custom', 404);
        abort_unless($template->submitted_by === $request->user()->id, 403, 'Rekaan ini bukan milik anda.');
    }

    private function data(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'category' => ['nullable', 'string', 'max:40'],
            'description' => ['nullable', 'string', 'max:200'],
            'config' => ['required', 'array'],
            'thumbnail' => ['nullable', 'string', 'max:300'],
        ]);
    }

    /**
     * Catalogue pricing/visibility — admin only. A contributing user never sets
     * price, tier or active state (those default to free / inactive until an
     * admin approves), so the fields are simply ignored for a non-admin.
     *
     * @return array<string,mixed>
     */
    private function pricingData(Request $request): array
    {
        if (! $request->user()->isAdmin()) {
            return [];
        }
        $p = $request->validate([
            'tier' => ['sometimes', 'in:free,premium'],
            'price_myr' => ['sometimes', 'numeric', 'min:0'],
            'discount_price_myr' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
            // A built-in design is recoloured via the `palette` column (its config
            // is ignored); a custom design sends colours inside `config` instead.
            'palette' => ['sometimes', 'nullable', 'array'],
        ]);

        return array_intersect_key($p, array_flip(['tier', 'price_myr', 'discount_price_myr', 'is_active', 'palette']));
    }

    /** The signed-in user's own designs (drafts + submissions), newest first. */
    public function mine(Request $request)
    {
        return Template::where('base_key', 'custom')
            ->where('submitted_by', $request->user()->id)
            ->orderByDesc('updated_at')
            ->get();
    }

    /** Load one design for editing. */
    public function show(Request $request, Template $template)
    {
        $this->ownDesign($request, $template);

        return response()->json($template);
    }

    /** Create a new draft design. */
    public function store(Request $request)
    {
        abort_unless($this->enabled($request), 403, 'Ciri reka rekaan belum dibuka.');

        $d = $this->data($request);
        $key = 'd-'.Str::slug($d['name'] ?: 'rekaan').'-'.Str::lower(Str::random(4));
        while (Template::where('key', $key)->exists()) {
            $key = 'd-'.Str::slug($d['name'] ?: 'rekaan').'-'.Str::lower(Str::random(4));
        }

        $template = Template::create(array_merge([
            'key' => $key,
            'base_key' => 'custom',
            'name' => $d['name'],
            'category' => $d['category'] ?? 'custom',
            'description' => $d['description'] ?? null,
            'thumbnail' => $d['thumbnail'] ?? null,
            'tier' => 'free',
            'price_myr' => 0,
            'config' => $d['config'],
            'is_active' => false,
            'status' => 'draft',
            'submitted_by' => $request->user()->id,
            'sort_order' => 800,
        ], $this->pricingData($request)));

        return response()->json($template, 201);
    }

    /** Save changes to a draft / pending / rejected design (approved edits: admin only). */
    public function update(Request $request, Template $template)
    {
        $this->ownDesign($request, $template);
        abort_if($template->status === 'approved' && ! $request->user()->isAdmin(), 403, 'Rekaan yang telah diluluskan tidak boleh diubah.');

        $d = $this->data($request);
        $template->update(array_merge([
            'name' => $d['name'],
            'category' => $d['category'] ?? $template->category,
            'description' => $d['description'] ?? $template->description,
            'config' => $d['config'],
            'thumbnail' => $d['thumbnail'] ?? $template->thumbnail,
        ], $this->pricingData($request)));

        return response()->json($template->fresh());
    }

    /** Publish: admins go live immediately; users submit for review. */
    public function submit(Request $request, Template $template)
    {
        $this->ownDesign($request, $template);

        if ($request->user()->isAdmin()) {
            $template->update(['status' => 'approved', 'is_active' => true]);
        } else {
            $template->update(['status' => 'pending', 'is_active' => false]);
        }

        return response()->json($template->fresh());
    }

    public function destroy(Request $request, Template $template)
    {
        $this->ownDesign($request, $template);
        $template->delete();

        return response()->json(['ok' => true]);
    }

    /**
     * Upload a designer asset (section background image or a custom heading
     * font) and return a host-agnostic URL. Not tied to any invitation — the
     * asset belongs to the designing user and counts against their quota.
     */
    public function upload(Request $request)
    {
        abort_unless($this->enabled($request), 403, 'Ciri reka rekaan belum dibuka.');

        $request->validate([
            'file' => ['required', 'file', 'max:'.Setting::maxUploadKb()], // superadmin-configurable
        ]);

        $user = $request->user();
        $file = $request->file('file');

        // Accept images (by mime) and font files (by extension / font-ish mime).
        $ext = strtolower((string) $file->getClientOriginalExtension());
        $mime = (string) $file->getMimeType();
        $isImage = str_starts_with($mime, 'image/');
        $isFont = in_array($ext, ['ttf', 'otf', 'woff', 'woff2'], true)
            || str_contains($mime, 'font')
            || $mime === 'application/octet-stream';
        abort_unless($isImage || $isFont, 422, 'Jenis fail tidak disokong. Muat naik imej atau fail fon (ttf/otf/woff/woff2).');

        $size = (int) $file->getSize();
        $kind = $isImage ? 'image' : 'font';

        // Enforce the uploader's quota (remaining MB → bytes) before storing.
        if ($user->storageRemainingMb() * 1_048_576 < $size) {
            return response()->json([
                'message' => 'Storan tidak mencukupi. Sila mohon tambah storan.',
            ], 422);
        }

        $path = $file->store("designs/{$user->id}", 'public');

        Asset::create([
            'user_id' => $user->id,
            'invitation_id' => null,
            'path' => $path,
            'size_bytes' => $size,
            'kind' => $kind,
        ]);

        return response()->json(['url' => '/storage/'.$path]);
    }

    /**
     * Store a browser-captured cover for this design.
     *
     * The capture happens client-side against the real template component, so a
     * card's cover always matches what a guest actually sees — including for a
     * contributed design, whose look exists only in its saved config.
     */
    public function thumbnail(Request $request, Template $template)
    {
        $this->ownDesign($request, $template);

        $data = $request->validate([
            'image' => ['required', 'string'],
        ]);

        try {
            $path = ThumbnailStore::put($data['image'], $template->key);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        // Drop the previous capture so regenerating does not pile up files.
        ThumbnailStore::forget($template->thumbnail);
        $template->update(['thumbnail' => $path]);

        return response()->json(['thumbnail' => $path]);
    }
}
