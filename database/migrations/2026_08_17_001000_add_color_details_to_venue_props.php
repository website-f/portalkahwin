<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A 'custom' fixture carries its own name (label, already present) + colour, and
 * every fixture can hold a free-text `details` note (e.g. "PA + 2 wireless mics").
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('venue_props', function (Blueprint $t) {
            if (! Schema::hasColumn('venue_props', 'color')) {
                $t->string('color', 20)->nullable()->after('label');
            }
            if (! Schema::hasColumn('venue_props', 'details')) {
                $t->string('details', 300)->nullable()->after('color');
            }
        });
    }

    public function down(): void
    {
        Schema::table('venue_props', function (Blueprint $t) {
            foreach (['color', 'details'] as $c) {
                if (Schema::hasColumn('venue_props', $c)) {
                    $t->dropColumn($c);
                }
            }
        });
    }
};
