<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('music_presets', function (Blueprint $table) {
            // Trim window in whole seconds. end_sec null = play to the natural end.
            $table->unsignedInteger('start_sec')->default(0)->after('url');
            $table->unsignedInteger('end_sec')->nullable()->after('start_sec');
            // Trimmed length (end - start), stored for quick display to hosts.
            $table->unsignedInteger('duration_sec')->nullable()->after('end_sec');
        });

        Schema::table('invitations', function (Blueprint $table) {
            // The trim carried onto a card when a host picks a preset (or trims their
            // own upload). Playback loops only this window.
            $table->unsignedInteger('music_start')->default(0)->after('music_url');
            $table->unsignedInteger('music_end')->nullable()->after('music_start');
        });
    }

    public function down(): void
    {
        Schema::table('music_presets', function (Blueprint $table) {
            $table->dropColumn(['start_sec', 'end_sec', 'duration_sec']);
        });
        Schema::table('invitations', function (Blueprint $table) {
            $table->dropColumn(['music_start', 'music_end']);
        });
    }
};
