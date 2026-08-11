<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Template;
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
}
