<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\MusicPreset;
use Illuminate\Http\Request;

class MusicPresetController extends Controller
{
    public function index()
    {
        return MusicPreset::orderBy('sort')->orderBy('title')->get();
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

    private function validated(Request $request): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:120'],
            'artist' => ['nullable', 'string', 'max:120'],
            'url' => ['required', 'string', 'max:500', 'url'],
            'sort' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['boolean'],
        ]);
    }
}
