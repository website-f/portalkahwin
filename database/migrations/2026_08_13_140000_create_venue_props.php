<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('venue_props', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('invitation_id')->constrained()->cascadeOnDelete();
            // stage, entrance, catering, vendor_booth, gift, photo, dancefloor,
            // vip, restroom, walkway, parking, reception — see VenueProp::KINDS.
            $table->string('kind', 24);
            $table->string('label', 60);
            $table->decimal('pos_x', 8, 2)->default(0);
            $table->decimal('pos_y', 8, 2)->default(0);
            $table->unsignedSmallInteger('width')->default(200);
            $table->unsignedSmallInteger('height')->default(90);
            $table->unsignedSmallInteger('sort')->default(0);
            $table->timestamps();

            $table->index('invitation_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('venue_props');
    }
};
