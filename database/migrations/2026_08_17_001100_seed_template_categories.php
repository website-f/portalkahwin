<?php

use App\Models\Setting;
use App\Models\Template;
use Illuminate\Database\Migrations\Migration;

/**
 * Seed the superadmin-managed template category list from the categories already
 * in use, so the picker starts populated. Idempotent: only seeds when empty.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! empty(Setting::get('template_categories'))) {
            return;
        }
        $cats = Template::query()
            ->whereNotNull('category')->where('category', '!=', '')
            ->distinct()->pluck('category')
            ->map(fn ($c) => trim((string) $c))->filter()->unique()->sort()->values()->all();

        // Fall back to the shipped set if the table is somehow empty.
        if (empty($cats)) {
            $cats = ['floral', 'motion', 'khat', 'songket', 'batik', 'modern', 'luxe', 'celestial', 'boho', 'peranakan', 'event'];
        }

        Setting::put('template_categories', array_values($cats));
    }

    public function down(): void
    {
        // Non-destructive.
    }
};
