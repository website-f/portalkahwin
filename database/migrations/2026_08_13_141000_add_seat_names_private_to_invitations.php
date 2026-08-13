<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invitations', function (Blueprint $table) {
            // Per-card: hide other guests' names in the guest-facing seating view.
            // Previously a platform-wide admin setting, which was the wrong owner —
            // whose names to show is the host's decision, per wedding.
            $table->boolean('seat_names_private')->default(false)->after('auto_seat');
        });
    }

    public function down(): void
    {
        Schema::table('invitations', function (Blueprint $table) {
            $table->dropColumn('seat_names_private');
        });
    }
};
