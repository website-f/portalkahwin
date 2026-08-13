<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Invitation;
use App\Models\Template;
use App\Support\ThumbnailStore;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminTemplateController extends Controller
{
    public function index()
    {
        return Template::orderBy('sort_order')->get();
    }

    public function store(Request $request)
    {
        $data = $this->validateData($request);
        $template = Template::create($data);

        return response()->json($template, 201);
    }

    public function update(Request $request, Template $template)
    {
        $data = $this->validateData($request, $template->id);
        $template->update($data);

        return response()->json($template);
    }

    public function destroy(Template $template)
    {
        $template->delete();

        return response()->json(['ok' => true]);
    }

    /** Archived designs, newest first. */
    public function archived()
    {
        return Template::onlyTrashed()->orderByDesc('deleted_at')->get();
    }

    public function restore(string $id)
    {
        $template = Template::onlyTrashed()->findOrFail($id);
        $template->restore();

        return response()->json($template);
    }

    /**
     * Erase a design for good.
     *
     * Refused while any card still renders it: those cards would lose their
     * design with no way to get it back, which is not a trade an admin should be
     * able to make by accident.
     */
    public function forceDestroy(string $id)
    {
        $template = Template::onlyTrashed()->findOrFail($id);

        $inUse = Invitation::where('template_key', $template->key)->count();
        abort_if($inUse > 0, 422, "Rekaan ini masih digunakan oleh {$inUse} kad. Padam atau tukar kad tersebut dahulu.");

        ThumbnailStore::forget($template->thumbnail);
        $template->forceDelete();

        return response()->json(['ok' => true]);
    }

    private function validateData(Request $request, ?string $ignoreId = null): array
    {
        return $request->validate([
            'key' => ['required', 'string', 'max:60', Rule::unique('templates', 'key')->ignore($ignoreId)],
            'name' => ['required', 'string', 'max:120'],
            'category' => ['required', 'string', 'max:40'],
            'description' => ['nullable', 'string', 'max:500'],
            'thumbnail' => ['nullable', 'string', 'max:300'],
            'tier' => ['required', 'in:free,premium'],
            'price_myr' => ['required', 'numeric', 'min:0'],
            'palette' => ['nullable', 'array'],
            'is_active' => ['boolean'],
            'sort_order' => ['integer'],
        ]);
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
        // Route is already behind the admin middleware group.

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
