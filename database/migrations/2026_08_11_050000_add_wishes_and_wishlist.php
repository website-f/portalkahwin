<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Guestbook: speeches / ucapan left by guests on the live card (no RSVP needed).
        Schema::create('wishes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('invitation_id')->constrained()->cascadeOnDelete();
            $table->string('name', 120);
            $table->text('message');
            $table->timestamps();
            $table->index(['invitation_id', 'created_at']);
        });

        // Bride/couple-side gift registry shown on the card.
        Schema::table('invitations', function (Blueprint $table) {
            $table->json('wishlist')->nullable()->after('gift');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wishes');
        Schema::table('invitations', function (Blueprint $table) {
            $table->dropColumn('wishlist');
        });
    }
};
