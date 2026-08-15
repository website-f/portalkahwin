<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Per-event pay-per-entry RSVP settings (vendor events). When a vendor turns this
 * on for a card, guests must pay `rsvp_price` (× pax, plus optional tax) through
 * the platform gateway before their RSVP + QR pass is issued. Off = the normal
 * free RSVP, unchanged.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invitations', function (Blueprint $table) {
            $table->boolean('rsvp_pay_enabled')->default(false)->after('rsvp_fields');
            $table->decimal('rsvp_price', 8, 2)->nullable()->after('rsvp_pay_enabled');
            $table->decimal('rsvp_tax_percent', 5, 2)->default(0)->after('rsvp_price');
        });
    }

    public function down(): void
    {
        Schema::table('invitations', function (Blueprint $table) {
            $table->dropColumn(['rsvp_pay_enabled', 'rsvp_price', 'rsvp_tax_percent']);
        });
    }
};
