<?php

use Database\Seeders\FloralTemplateSeeder;
use Illuminate\Database\Migrations\Migration;

/**
 * Re-run the floral seeder after varying the cover reveals across the five new
 * designs — 2 envelope ("open the letter"), 1 curtain, 1 door, 1 split — so the
 * set feels distinct rather than all opening the same way. Idempotent.
 */
return new class extends Migration
{
    public function up(): void
    {
        (new FloralTemplateSeeder())->run();
    }

    public function down(): void
    {
        // Non-destructive: templates are dropped by 2026_08_23_000100's down().
    }
};
