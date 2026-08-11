<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rsvp_guests', function (Blueprint $table) {
            $table->boolean('attended')->default(false)->after('status');
            $table->timestamp('checked_in_at')->nullable()->after('attended');
        });
    }

    public function down(): void
    {
        Schema::table('rsvp_guests', function (Blueprint $table) {
            $table->dropColumn(['attended', 'checked_in_at']);
        });
    }
};
