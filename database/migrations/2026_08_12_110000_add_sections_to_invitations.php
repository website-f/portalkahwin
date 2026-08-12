<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invitations', function (Blueprint $table) {
            // Per-card section toggles: { opening, program, location, wishes, wishlist,
            // contacts, gift, gallery: bool }. Null = all on. RSVP uses rsvp_enabled.
            $table->json('sections')->nullable()->after('rsvp_enabled');
        });
    }

    public function down(): void
    {
        Schema::table('invitations', function (Blueprint $table) {
            $table->dropColumn('sections');
        });
    }
};
