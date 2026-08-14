<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('templates', function (Blueprint $table) {
            // Which UI languages a design suits (['bm'],['zh'],['bm','en','zh']…).
            // null / empty = universal, shown for every language.
            $table->json('languages')->nullable()->after('category');
        });
    }

    public function down(): void
    {
        Schema::table('templates', function (Blueprint $table) {
            $table->dropColumn('languages');
        });
    }
};
