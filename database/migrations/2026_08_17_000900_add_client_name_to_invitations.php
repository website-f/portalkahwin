<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Reseller "billed to": when an affiliate creates a card for a client, this is the
 * client's name that appears as the receipt "Billed to" (instead of the affiliate,
 * who is the paying account). Null for normal self-serve cards.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invitations', function (Blueprint $t) {
            if (! Schema::hasColumn('invitations', 'client_name')) {
                $t->string('client_name')->nullable()->after('user_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('invitations', function (Blueprint $t) {
            if (Schema::hasColumn('invitations', 'client_name')) {
                $t->dropColumn('client_name');
            }
        });
    }
};
