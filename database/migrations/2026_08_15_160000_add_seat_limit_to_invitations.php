<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A flexible seating capacity: a host (esp. a vendor who doesn't want to build a
 * full table layout) can just cap how many seats the event has. When set and no
 * tables are built, RSVP is refused once the attending headcount would exceed it.
 * 0 / null = unlimited (or governed by the table layout if one exists).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invitations', function (Blueprint $table) {
            $table->unsignedInteger('seat_limit')->nullable()->after('auto_seat');
        });
    }

    public function down(): void
    {
        Schema::table('invitations', function (Blueprint $table) {
            $table->dropColumn('seat_limit');
        });
    }
};
