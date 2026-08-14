<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\MusicPreset;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class MusicPresetController extends Controller
{
    public function index()
    {
        return MusicPreset::orderBy('sort')->orderBy('title')->get();
    }

    /** PUBLIC — the tracks a host may pick from in the card editor. */
    public function published()
    {
        return MusicPreset::where('is_active', true)
            ->orderBy('sort')
            ->orderBy('title')
            ->get(['id', 'title', 'artist', 'url', 'start_sec', 'end_sec', 'duration_sec']);
    }

    public function store(Request $request)
    {
        return response()->json(MusicPreset::create($this->validated($request)), 201);
    }

    public function update(Request $request, MusicPreset $preset)
    {
        $preset->update($this->validated($request));

        return response()->json($preset->fresh());
    }

    public function destroy(MusicPreset $preset)
    {
        $preset->delete();

        return response()->json(['ok' => true]);
    }

    /**
     * Store an uploaded track and return its URL.
     *
     * Hosts overwhelmingly have an MP3 rather than a link they trust, and asking
     * an admin to find hosting for it before they can offer it is a dead end.
     */
    public function upload(Request $request)
    {
        $request->validate([
            'file' => ['required', 'file', 'mimetypes:audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/x-m4a,audio/mp4', 'max:20480'],
        ]);

        $path = $request->file('file')->store('music', 'public');

        return response()->json(['url' => '/storage/'.$path]);
    }

    private function validated(Request $request): array
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:120'],
            'artist' => ['nullable', 'string', 'max:120'],
            // Either an external link or a path to a track uploaded above, so
            // this cannot be a plain `url` rule.
            'url' => ['required', 'string', 'max:500'],
            // Trim window (whole seconds). end_sec null = play to the natural end.
            'start_sec' => ['nullable', 'integer', 'min:0'],
            'end_sec' => ['nullable', 'integer', 'min:0'],
            'duration_sec' => ['nullable', 'integer', 'min:0'],
            'sort' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['boolean'],
        ]);

        $isLocal = Str::startsWith($data['url'], '/storage/');
        if (! $isLocal && ! filter_var($data['url'], FILTER_VALIDATE_URL)) {
            abort(422, 'Pautan lagu tidak sah.');
        }

        // Normalise the trim: a non-positive/backwards end means "no end" (full track),
        // and the stored duration is always the trimmed length.
        $data['start_sec'] = max(0, (int) ($data['start_sec'] ?? 0));
        $end = isset($data['end_sec']) ? (int) $data['end_sec'] : 0;
        $data['end_sec'] = $end > $data['start_sec'] ? $end : null;
        $data['duration_sec'] = $data['end_sec'] ? $data['end_sec'] - $data['start_sec'] : ($data['duration_sec'] ?? null);

        return $data;
    }
}
