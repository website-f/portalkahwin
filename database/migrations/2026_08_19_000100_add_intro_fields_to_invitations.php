<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invitations', function (Blueprint $table) {
            // Structured parents for the intro:
            //   { groom: {father, mother, show}, bride: {father, mother, show} }
            // `show` = both | father | mother — the absent one is simply omitted.
            // Legacy groom_parents/bride_parents stay as a free-text fallback.
            $table->json('parents')->nullable()->after('bride_parents');
            // Custom Bismillah text (replaces the default Arabic line when set);
            // the `bismillah` boolean still controls whether it shows at all.
            $table->text('bismillah_text')->nullable()->after('bismillah');
            // The "Jemputan Walimatulurus" heading — editable; '' hides it, null = default.
            $table->string('walimah_label', 120)->nullable()->after('bismillah_text');
        });
    }

    public function down(): void
    {
        Schema::table('invitations', function (Blueprint $table) {
            $table->dropColumn(['parents', 'bismillah_text', 'walimah_label']);
        });
    }
};
