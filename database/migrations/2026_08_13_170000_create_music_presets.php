<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('music_presets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('title', 120);
            $table->string('artist', 120)->nullable();
            // A YouTube link or a direct audio URL — the player handles both.
            $table->string('url', 500);
            $table->unsignedSmallInteger('sort')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('music_presets');
    }
};
