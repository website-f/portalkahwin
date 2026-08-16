<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Flexible event content: a host-defined list of custom detail fields (Dress
 * code, Parking, RSVP-by, …) plus a closing (outro) message. The custom fields
 * are what make the event format open-ended — any label/value the host needs.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invitations', function (Blueprint $table) {
            $table->json('custom_fields')->nullable()->after('event_description'); // [{label, value}]
            $table->text('event_outro')->nullable()->after('custom_fields');
        });
    }

    public function down(): void
    {
        Schema::table('invitations', function (Blueprint $table) {
            $table->dropColumn(['custom_fields', 'event_outro']);
        });
    }
};
