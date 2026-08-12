<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Idempotent guard — safe to re-run even if a partial table exists.
        Schema::dropIfExists('template_favorites');

        Schema::create('template_favorites', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('template_key');
            $table->timestamps();

            // A user can only save a given design once.
            $table->unique(['user_id', 'template_key']);
            $table->index('template_key');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('template_favorites');
    }
};
