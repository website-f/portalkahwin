<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vouchers', function (Blueprint $table) {
            if (! Schema::hasColumn('vouchers', 'once_per_user')) {
                $table->boolean('once_per_user')->default(false)->after('is_active');
            }
        });

        // One row per (voucher, user) that redeemed it — enforces "one use per user".
        Schema::dropIfExists('voucher_redemptions');
        Schema::create('voucher_redemptions', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('voucher_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['voucher_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('voucher_redemptions');
        Schema::table('vouchers', function (Blueprint $table) {
            if (Schema::hasColumn('vouchers', 'once_per_user')) {
                $table->dropColumn('once_per_user');
            }
        });
    }
};
