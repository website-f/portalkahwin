<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invitations', function (Blueprint $table) {
            // Which contact details the RSVP form asks a guest for:
            // both | email | phone. Hosts with seating are always email-inclusive,
            // since the seat link is delivered by email.
            $table->string('rsvp_fields', 10)->default('both')->after('rsvp_enabled');
        });
    }

    public function down(): void
    {
        Schema::table('invitations', function (Blueprint $table) {
            $table->dropColumn('rsvp_fields');
        });
    }
};
