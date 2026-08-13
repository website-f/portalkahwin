<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invitations', function (Blueprint $table) {
            // Who is doing the inviting. A Malay wedding card is sent by one
            // side, both sides, or two couples together — and that decides
            // whose parents are named on the card.
            $table->string('invite_side', 16)->default('two_couples')->after('bride_parents');
        });
    }

    public function down(): void
    {
        Schema::table('invitations', function (Blueprint $table) {
            $table->dropColumn('invite_side');
        });
    }
};
