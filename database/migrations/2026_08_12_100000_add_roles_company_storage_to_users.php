<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // role now spans: user | vendor | affiliate | admin | superadmin (kept as string).
            // Approval status for vendor/affiliate onboarding.
            $table->string('status')->default('active')->after('role'); // active | pending | rejected
            $table->string('company_name')->nullable()->after('phone');
            $table->string('company_logo')->nullable()->after('company_name');
            $table->unsignedInteger('storage_quota_mb')->default(100)->after('company_logo');
            // Set by admin when approving a vendor/affiliate (proof of the offline payment).
            $table->string('approval_receipt')->nullable()->after('storage_quota_mb');
            $table->text('approval_note')->nullable()->after('approval_receipt');
            $table->timestamp('approved_at')->nullable()->after('approval_note');
            $table->uuid('approved_by')->nullable()->after('approved_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'status', 'company_name', 'company_logo', 'storage_quota_mb',
                'approval_receipt', 'approval_note', 'approved_at', 'approved_by',
            ]);
        });
    }
};
