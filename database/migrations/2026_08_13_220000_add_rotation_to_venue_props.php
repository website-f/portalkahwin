<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('venue_props', function (Blueprint $table) {
            // Degrees clockwise. A hall is rarely a neat grid — a stage sits at an
            // angle, a walkway runs diagonally — so a fixture has to be turnable.
            $table->unsignedSmallInteger('rotation')->default(0)->after('height');
        });
    }

    public function down(): void
    {
        Schema::table('venue_props', function (Blueprint $table) {
            $table->dropColumn('rotation');
        });
    }
};
