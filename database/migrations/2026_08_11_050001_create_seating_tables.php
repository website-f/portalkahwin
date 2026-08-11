<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invitations', function (Blueprint $table) {
            $table->boolean('auto_seat')->default(false)->after('rsvp_enabled');
        });

        Schema::create('seating_tables', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('invitation_id')->constrained()->cascadeOnDelete();
            $table->string('label');
            $table->string('shape')->default('round'); // round | rect
            $table->unsignedInteger('capacity')->default(8);
            $table->float('pos_x')->default(120);
            $table->float('pos_y')->default(120);
            $table->integer('sort')->default(0);
            $table->timestamps();
        });

        Schema::create('seats', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('seating_table_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('seat_index');
            $table->foreignUuid('rsvp_guest_id')->nullable()->constrained('rsvp_guests')->nullOnDelete();
            $table->timestamps();

            $table->unique(['seating_table_id', 'seat_index']);
            $table->index('rsvp_guest_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('seats');
        Schema::dropIfExists('seating_tables');
        Schema::table('invitations', function (Blueprint $table) {
            $table->dropColumn('auto_seat');
        });
    }
};
