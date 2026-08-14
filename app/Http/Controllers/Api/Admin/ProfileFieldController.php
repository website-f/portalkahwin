<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ProfileField;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ProfileFieldController extends Controller
{
    private const TYPES = ['text', 'textarea', 'tel', 'email', 'number', 'select', 'logo'];
    private const ROLES = ['user', 'vendor', 'affiliate'];

    /** Every field definition, ordered for the builder (group, then sort). */
    public function index()
    {
        return ProfileField::orderBy('group_key')->orderBy('sort')->orderBy('created_at')->get();
    }

    public function store(Request $request)
    {
        $data = $this->validateData($request);

        // Machine keys are derived from labels when the client doesn't supply one,
        // then de-duplicated so two "Job" fields can't collide.
        $data['group_key'] = ($data['group_key'] ?? '') ?: (Str::slug($data['group_label'], '_') ?: 'group');
        $data['key'] = $this->uniqueKey(($data['key'] ?? '') ?: (Str::slug($data['label'], '_') ?: 'field'));
        $data['system'] = false;

        return response()->json(ProfileField::create($data), 201);
    }

    public function update(Request $request, ProfileField $profileField)
    {
        $data = $this->validateData($request, $profileField);

        // System fields back the receipt renderer: the superadmin may relabel, reorder,
        // re-target and toggle them, but their key/type stay fixed and they stay system.
        if ($profileField->system) {
            unset($data['key'], $data['type'], $data['system']);
        } else {
            $data['group_key'] = ($data['group_key'] ?? '') ?: $profileField->group_key;
            if (! empty($data['key']) && $data['key'] !== $profileField->key) {
                $data['key'] = $this->uniqueKey(Str::slug($data['key'], '_'), $profileField->id);
            } else {
                unset($data['key']);
            }
        }

        $profileField->update($data);

        return response()->json($profileField->fresh());
    }

    public function destroy(ProfileField $profileField)
    {
        abort_if($profileField->system, 403, 'System fields cannot be deleted.');
        $profileField->delete();

        return response()->json(['ok' => true]);
    }

    private function validateData(Request $request, ?ProfileField $existing = null): array
    {
        return $request->validate([
            'group_key' => ['nullable', 'string', 'max:60'],
            'group_label' => ['required', 'string', 'max:80'],
            'key' => ['nullable', 'string', 'max:60'],
            'label' => ['required', 'string', 'max:120'],
            'type' => ['required', Rule::in(self::TYPES)],
            'options' => ['nullable', 'array'],
            'options.*' => ['string', 'max:120'],
            'roles' => ['required', 'array', 'min:1'],
            'roles.*' => [Rule::in(self::ROLES)],
            'required' => ['boolean'],
            'sort' => ['integer'],
            'is_active' => ['boolean'],
        ]);
    }

    /** Ensure a field key is unique, suffixing _2, _3… when needed. */
    private function uniqueKey(string $base, ?string $ignoreId = null): string
    {
        $base = $base ?: 'field';
        $key = $base;
        $n = 2;
        while (ProfileField::where('key', $key)->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))->exists()) {
            $key = $base.'_'.$n++;
        }

        return $key;
    }
}
