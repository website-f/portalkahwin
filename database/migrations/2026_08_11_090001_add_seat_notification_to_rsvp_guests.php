<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rsvp_guests', function (Blueprint $table) {
            // Which table the guest was last told about. Hosts drag guests around the
            // board constantly, so we only email when the destination is news to them.
            $table->uuid('seat_notified_table_id')->nullable()->after('email');
            $table->timestamp('seat_notified_at')->nullable()->after('seat_notified_table_id');
        });
    }

    public function down(): void
    {
        Schema::table('rsvp_guests', function (Blueprint $table) {
            $table->dropColumn(['seat_notified_table_id', 'seat_notified_at']);
        });
    }
};
