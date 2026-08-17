<?php

use Database\Seeders\EventTemplateSeeder;
use Illuminate\Database\Migrations\Migration;

/**
 * Re-run the event seeder so every event template gains its `config.eventType`
 * (concert/openhouse/birthday/aqiqah/corporate/gala) + refreshed name. Idempotent.
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
