<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Snapshot the itemised platform charges on each entry payment (commission, FPX
 * fee, …) so a receipt and the finance breakdown can always be reconstructed
 * exactly as they were when the guest paid — even if the admin later edits the
 * charge list. `platform_fee` remains the total of these lines.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('entry_payments', function (Blueprint $table) {
            $table->json('charges')->nullable()->after('vendor_net');
        });
    }

    public function down(): void
    {
        Schema::table('entry_payments', function (Blueprint $table) {
            $table->dropColumn('charges');
        });
    }
};
