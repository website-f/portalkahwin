<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invitations', function (Blueprint $table) {
            // Display font for headings, chosen from CARD_FONTS on the client.
            // Null keeps whatever the template itself specifies.
            $table->string('font_id', 40)->nullable()->after('palette');
        });
    }

    public function down(): void
    {
        Schema::table('invitations', function (Blueprint $table) {
            $table->dropColumn('font_id');
        });
    }
};
