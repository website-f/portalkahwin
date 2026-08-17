<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A role-upgrade request now carries the same onboarding details a vendor/affiliate
 * gives at sign-up (company name + contact phone), plus the admin's decision
 * artefacts (uploaded receipt), so the request can be reviewed and settled with the
 * exact same flow as a direct vendor/affiliate application.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('role_requests', function (Blueprint $table) {
            $table->string('company_name')->nullable()->after('requested_role');
            $table->string('phone', 30)->nullable()->after('company_name');
            // Payment receipt the admin uploads when approving (settled offline).
            $table->string('receipt')->nullable()->after('review_note');
        });
    }

    public function down(): void
    {
        Schema::table('role_requests', function (Blueprint $table) {
            $table->dropColumn(['company_name', 'phone', 'receipt']);
        });
    }
};
