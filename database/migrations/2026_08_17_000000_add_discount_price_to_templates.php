<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Per-template discount price. `price_myr` stays the ORIGINAL price; when
 * `discount_price_myr` is set (and lower), it is the price actually charged and
 * the gallery shows a "−N%" tag with the original struck through.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('templates', function (Blueprint $table) {
            $table->decimal('discount_price_myr', 8, 2)->nullable()->after('price_myr');
        });
    }

    public function down(): void
    {
        Schema::table('templates', function (Blueprint $table) {
            $table->dropColumn('discount_price_myr');
        });
    }
};
