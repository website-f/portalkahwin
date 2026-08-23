<?php

use Database\Seeders\FloralTemplateSeeder;
use Illuminate\Database\Migrations\Migration;

/**
 * Re-run the floral seeder after refining the designs (envelope "open the letter"
 * reveal + richer corner florals). Idempotent (updateOrCreate on key), so this is
 * a no-op on any environment that seeded the final specs first time round.
 */
return new class extends Migration
{
    public function up(): void
    {
        (new FloralTemplateSeeder())->run();
    }

    public function down(): void
    {
        // Non-destructive: the templates are dropped by 2026_08_23_000100's down().
    }
};
