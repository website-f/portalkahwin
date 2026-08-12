<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('templates', function (Blueprint $table) {
            // Contributed templates render with a base component + custom palette.
            $table->string('base_key')->nullable()->after('key');
            $table->string('status')->default('approved')->after('is_active'); // approved | pending | rejected
            $table->foreignId('submitted_by')->nullable()->after('status')->constrained('users')->nullOnDelete();
        });

        // Existing (built-in) templates are already approved.
        DB::table('templates')->update(['status' => 'approved']);
    }

    public function down(): void
    {
        Schema::table('templates', function (Blueprint $table) {
            $table->dropConstrainedForeignId('submitted_by');
            $table->dropColumn(['base_key', 'status']);
        });
    }
};
