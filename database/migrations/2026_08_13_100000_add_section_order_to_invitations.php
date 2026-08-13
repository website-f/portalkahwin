<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invitations', function (Blueprint $table) {
            // Host-chosen order of the movable card sections, e.g.
            // ["program","location","gallery",...]. Null = the template's own
            // order. Unknown / missing keys fall back to the canonical order.
            $table->json('section_order')->nullable()->after('sections');
        });
    }

    public function down(): void
    {
        Schema::table('invitations', function (Blueprint $table) {
            $table->dropColumn('section_order');
        });
    }
};
