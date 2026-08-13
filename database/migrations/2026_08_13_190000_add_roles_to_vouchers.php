<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vouchers', function (Blueprint $table) {
            // Roles this code may be redeemed by. Null = everyone, which is what
            // every existing voucher was, so the default preserves behaviour.
            $table->json('roles')->nullable()->after('once_per_user');
        });
    }

    public function down(): void
    {
        Schema::table('vouchers', function (Blueprint $table) {
            $table->dropColumn('roles');
        });
    }
};
