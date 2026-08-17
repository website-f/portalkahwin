<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Per-vendor opt-OUT of pay-per-entry. The master switch turns the feature on
 * for ALL vendors by default; an admin flips this flag on a specific vendor to
 * withhold it from them. Default false = every vendor may use it while the
 * master switch is on.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('pay_per_entry_disabled')->default(false)->after('template_scope');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('pay_per_entry_disabled');
        });
    }
};
