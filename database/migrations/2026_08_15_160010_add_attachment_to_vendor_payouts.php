<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * On releasing a payout the superadmin can attach the proof of transfer (bank
 * receipt). The vendor then sees it and acknowledges receipt — that acknowledgement
 * timestamp is the shared record both parties keep for reference.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vendor_payouts', function (Blueprint $table) {
            $table->string('attachment')->nullable()->after('note');
            $table->timestamp('acknowledged_at')->nullable()->after('released_at');
        });
    }

    public function down(): void
    {
        Schema::table('vendor_payouts', function (Blueprint $table) {
            $table->dropColumn(['attachment', 'acknowledged_at']);
        });
    }
};
