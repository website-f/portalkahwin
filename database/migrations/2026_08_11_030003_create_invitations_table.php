<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invitations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('template_key')->default('floral');
            $table->string('slug')->unique();
            $table->string('status')->default('draft'); // draft | published

            // Couple
            $table->string('groom_name');
            $table->string('bride_name');
            $table->string('groom_short')->nullable();
            $table->string('bride_short')->nullable();
            $table->string('groom_parents')->nullable();
            $table->string('bride_parents')->nullable();

            // Opening
            $table->text('opening_line')->nullable();
            $table->boolean('bismillah')->default(true);

            // Timing
            $table->dateTime('akad_at')->nullable();
            $table->dateTime('reception_at')->nullable();
            $table->string('date_label')->nullable();
            $table->string('time_label')->nullable();
            $table->string('hijri_label')->nullable();

            // Venue
            $table->string('venue_name')->nullable();
            $table->string('venue_address')->nullable();
            $table->string('maps_url')->nullable();
            $table->string('waze_url')->nullable();

            // Blocks
            $table->json('program')->nullable();
            $table->json('contacts')->nullable();
            $table->json('gift')->nullable();
            $table->json('gallery_images')->nullable();
            $table->string('music_url')->nullable();
            $table->json('palette')->nullable();

            $table->boolean('rsvp_enabled')->default(true);
            $table->unsignedInteger('views')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invitations');
    }
};
