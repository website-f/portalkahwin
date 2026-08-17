<?php

use Database\Seeders\EventTemplateSeeder;
use Illuminate\Database\Migrations\Migration;

/**
 * Re-run the event seeder so every event template gains its `config.eventStage`
 * (the bespoke animated cover layout) + refreshed theme/palette. Idempotent.
 */
return new class extends Migration
{
    public function up(): void
    {
        (new EventTemplateSeeder())->run();
    }

    public function down(): void
    {
        // Non-destructive.
    }
};
