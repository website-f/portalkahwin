<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Values for superadmin-defined custom profile fields, keyed by field key.
            $table->json('profile_data')->nullable()->after('company_logo');
            // Vendor/affiliate opt-in: put their own business on receipts (else platform brand).
            $table->boolean('use_own_receipt_branding')->default(false)->after('profile_data');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['profile_data', 'use_own_receipt_branding']);
        });
    }
};
