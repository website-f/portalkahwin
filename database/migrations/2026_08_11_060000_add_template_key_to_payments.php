<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            // Which template this payment bought (per-template ownership). Null for other purposes.
            $table->string('template_key')->nullable()->after('purpose');
            $table->index(['user_id', 'template_key', 'status']);
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'template_key', 'status']);
            $table->dropColumn('template_key');
        });
    }
};
