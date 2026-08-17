<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Per-affiliate commission override. Null = use the universal
 * `affiliate_commission_percent` setting; a value here wins for that affiliate.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $t) {
            if (! Schema::hasColumn('users', 'commission_percent')) {
                $t->decimal('commission_percent', 5, 2)->nullable()->after('referred_by');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $t) {
            if (Schema::hasColumn('users', 'commission_percent')) {
                $t->dropColumn('commission_percent');
            }
        });
    }
};
