<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invitations', function (Blueprint $table) {
            // Affiliate cards go live for 24h then auto-disable until paid.
            $table->boolean('is_paid')->default(false)->after('status');
            $table->timestamp('published_at')->nullable()->after('is_paid');
            $table->timestamp('expires_at')->nullable()->after('published_at');
        });
    }

    public function down(): void
    {
        Schema::table('invitations', function (Blueprint $table) {
            $table->dropColumn(['is_paid', 'published_at', 'expires_at']);
        });
    }
};
