<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // The payment row created when an admin banks an approval receipt.
            // Its presence is what marks an approval as "recorded in finance", so
            // the same receipt can never be booked to revenue twice.
            $table->uuid('approval_payment_id')->nullable()->after('approval_note');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('approval_payment_id');
        });
    }
};
