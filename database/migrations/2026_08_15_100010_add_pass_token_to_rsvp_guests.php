<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A paid guest gets their own expiring QR-pass link. `pass_token` is the public
 * credential in the /pass/{token} URL; `pass_expires_at` is the event date plus a
 * grace window, after which a scheduled job nulls the token (link stops working).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rsvp_guests', function (Blueprint $table) {
            $table->string('pass_token', 64)->nullable()->unique()->after('status');
            $table->timestamp('pass_expires_at')->nullable()->after('pass_token');
        });
    }

    public function down(): void
    {
        Schema::table('rsvp_guests', function (Blueprint $table) {
            $table->dropColumn(['pass_token', 'pass_expires_at']);
        });
    }
};
