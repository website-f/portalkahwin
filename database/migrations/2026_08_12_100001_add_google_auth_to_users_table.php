<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Google's stable subject id. Unique so two accounts can never claim
            // the same Google identity; nullable because most users sign up with
            // a password and never link Google at all.
            $table->string('google_id')->nullable()->unique()->after('email');
            $table->string('avatar', 500)->nullable()->after('google_id');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['google_id']);
            $table->dropColumn(['google_id', 'avatar']);
        });
    }
};
