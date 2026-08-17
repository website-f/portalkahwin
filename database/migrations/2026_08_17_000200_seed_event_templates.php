<?php

use Database\Seeders\EventTemplateSeeder;
use Illuminate\Database\Migrations\Migration;

/**
 * Seed / re-theme the event templates. The EventTemplateSeeder was previously
 * orphaned (never wired in); this runs it so the event catalogue actually exists
 * and every event template carries its distinct theme. Idempotent (updateOrCreate).
 */
return new class extends Migration
{
    public function up(): void
    {
        (new EventTemplateSeeder())->run();
    }

    public function down(): void
    {
        // Non-destructive: leave the event templates in place.
    }
};
