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
        return $request->user()->isAdmin() || Setting::get('allow_user_templates', 'false') === 'true';
    }

    private function ownDesign(Request $request, Template $template): void
    {
        abort_unless($template->base_key === 'custom', 404);
        abort_unless(
            $request->user()->isAdmin() || $template->submitted_by === $request->user()->id,
            403, 'Rekaan ini bukan milik anda.'
        );
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

        $template = Template::create([
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
        ]);

        return response()->json($template, 201);
    }

    /** Save changes to a draft / pending / rejected design (approved edits: admin only). */
    public function update(Request $request, Template $template)
    {
        $this->ownDesign($request, $template);
        abort_if($template->status === 'approved' && ! $request->user()->isAdmin(), 403, 'Rekaan yang telah diluluskan tidak boleh diubah.');

        $d = $this->data($request);
        $template->update([
            'name' => $d['name'],
            'category' => $d['category'] ?? $template->category,
            'description' => $d['description'] ?? $template->description,
            'config' => $d['config'],
            'thumbnail' => $d['thumbnail'] ?? $template->thumbnail,
        ]);

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
