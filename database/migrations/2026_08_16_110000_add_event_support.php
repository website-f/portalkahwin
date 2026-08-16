<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Non-wedding EVENT support. A card is now either a wedding or an event
 * (`kind`), and events carry their own generic fields (name / subtitle /
 * description / poster / organizer) instead of the couple-centric ones. Same
 * card infra, RSVP and pay-per-entry (= tickets) — just a different field set.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invitations', function (Blueprint $table) {
            $table->string('kind')->default('wedding')->after('template_key'); // wedding | event
            $table->string('event_type')->nullable()->after('kind');           // concert | gala | seminar | ...
            $table->string('event_name')->nullable()->after('event_type');
            $table->string('event_subtitle')->nullable()->after('event_name');
            $table->text('event_description')->nullable()->after('event_subtitle');
            $table->string('poster_image')->nullable()->after('event_description');
            $table->string('organizer')->nullable()->after('poster_image');
        });

        Schema::table('templates', function (Blueprint $table) {
            $table->string('kind')->default('wedding')->after('category'); // wedding | event
        });

        Schema::table('users', function (Blueprint $table) {
            // Which template kinds this user may browse/use: all | wedding | event.
            $table->string('template_scope')->default('all')->after('role');
        });
    }

    public function down(): void
    {
        Schema::table('invitations', function (Blueprint $table) {
            $table->dropColumn(['kind', 'event_type', 'event_name', 'event_subtitle', 'event_description', 'poster_image', 'organizer']);
        });
        Schema::table('templates', function (Blueprint $table) {
            $table->dropColumn('kind');
        });
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('template_scope');
        });
    }
};
