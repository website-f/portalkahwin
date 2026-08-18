<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invitations', function (Blueprint $table) {
            // The doa / prayer block shown before the countdown. Host-editable;
            // hidden via the `prayer` section toggle. Null = use nothing.
            $table->text('prayer')->nullable()->after('opening_line');
        });
    }

    public function down(): void
    {
        Schema::table('invitations', function (Blueprint $table) {
            $table->dropColumn('prayer');
        });
    }
};
