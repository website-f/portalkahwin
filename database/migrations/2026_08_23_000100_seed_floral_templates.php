<?php

use App\Models\Template;
use Database\Seeders\FloralTemplateSeeder;
use Illuminate\Database\Migrations\Migration;

/**
 * Seed five additional wedding designs (config-driven `custom` engine) — three
 * floral, one songket, one lace. Idempotent (updateOrCreate on key).
 */
return new class extends Migration
{
    public function up(): void
    {
        (new FloralTemplateSeeder())->run();
    }

    public function down(): void
    {
        // Reversible: drop exactly the keys this seeder owns.
        Template::whereIn('key', (new FloralTemplateSeeder())->keys())->forceDelete();
    }
};
