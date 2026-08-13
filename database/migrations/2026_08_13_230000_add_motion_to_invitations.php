<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invitations', function (Blueprint $table) {
            // Filename inside public/lottie/, e.g. "petals-fall.json". Null = none.
            $table->string('motion_file', 120)->nullable()->after('music_url');
            // Whether the animation is retinted onto the card's palette.
            $table->boolean('motion_tint')->default(true)->after('motion_file');
        });
    }

    public function down(): void
    {
        Schema::table('invitations', function (Blueprint $table) {
            $table->dropColumn(['motion_file', 'motion_tint']);
        });
    }
};
