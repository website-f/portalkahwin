<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * How the guestbook (ucapan) shows its wishes: a horizontal carousel (default)
 * or a vertical scroller in its own section, with a card-themed scrollbar.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invitations', function (Blueprint $table) {
            $table->string('wishes_layout')->default('carousel')->after('wishlist'); // carousel | list
        });
    }

    public function down(): void
    {
        Schema::table('invitations', function (Blueprint $table) {
            $table->dropColumn('wishes_layout');
        });
    }
};
