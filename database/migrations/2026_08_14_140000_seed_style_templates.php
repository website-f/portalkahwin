<?php

use App\Models\Template;
use Database\Seeders\StyleTemplateSeeder;
use Illuminate\Database\Migrations\Migration;

/**
 * Seeds the 20 config-driven "style" designs (6 Chinese, 4 Indian, 10 universal)
 * rendered by the `custom` engine. The actual spec lives in StyleTemplateSeeder
 * so the same source of truth can also be re-applied with `db:seed` after a
 * restyle — this migration just runs it on a fresh install.
 */
return new class extends Migration
{
    public function up(): void
    {
        (new StyleTemplateSeeder())->run();
    }

    public function down(): void
    {
        Template::whereIn('key', (new StyleTemplateSeeder())->keys())->forceDelete();
    }
};
