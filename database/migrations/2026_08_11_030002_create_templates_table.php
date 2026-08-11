<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('templates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('key')->unique();        // maps to a React component (floral, curtain, khat, songket)
            $table->string('name');
            $table->string('category');             // floral | motion | khat | songket | modern
            $table->text('description')->nullable();
            $table->string('thumbnail')->nullable();
            $table->string('tier')->default('free'); // free | premium
            $table->decimal('price_myr', 8, 2)->default(0);
            $table->json('palette')->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->unsignedInteger('usage_count')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('templates');
    }
};
