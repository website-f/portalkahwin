<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Pay-per-entry money is an audit trail: deleting a vendor (or their event card)
 * must NOT destroy the collections/payouts that already happened. The original
 * FKs cascadeOnDelete, so we:
 *   1. add denormalised snapshot columns (vendor name/email, event label) so a
 *      row stays meaningful once its vendor / invitation is gone, and
 *   2. re-point the FKs to nullOnDelete + make them nullable.
 * (No doctrine/dbal in this project, so the nullable change is a raw MODIFY.)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('entry_payments', function (Blueprint $t) {
            if (! Schema::hasColumn('entry_payments', 'vendor_name')) {
                $t->string('vendor_name')->nullable()->after('vendor_id');
            }
            if (! Schema::hasColumn('entry_payments', 'vendor_email')) {
                $t->string('vendor_email')->nullable()->after('vendor_name');
            }
            if (! Schema::hasColumn('entry_payments', 'event_label')) {
                $t->string('event_label')->nullable()->after('invitation_id');
            }
        });
        Schema::table('vendor_payouts', function (Blueprint $t) {
            if (! Schema::hasColumn('vendor_payouts', 'vendor_name')) {
                $t->string('vendor_name')->nullable()->after('vendor_id');
            }
            if (! Schema::hasColumn('vendor_payouts', 'vendor_email')) {
                $t->string('vendor_email')->nullable()->after('vendor_name');
            }
        });

        // entry_payments: cascade -> null-on-delete for vendor_id + invitation_id.
        Schema::table('entry_payments', function (Blueprint $t) {
            $t->dropForeign(['vendor_id']);
            $t->dropForeign(['invitation_id']);
        });
        DB::statement('ALTER TABLE entry_payments MODIFY vendor_id BIGINT UNSIGNED NULL');
        DB::statement('ALTER TABLE entry_payments MODIFY invitation_id CHAR(36) NULL');
        Schema::table('entry_payments', function (Blueprint $t) {
            $t->foreign('vendor_id')->references('id')->on('users')->nullOnDelete();
            $t->foreign('invitation_id')->references('id')->on('invitations')->nullOnDelete();
        });

        // vendor_payouts: cascade -> null-on-delete for vendor_id.
        Schema::table('vendor_payouts', function (Blueprint $t) {
            $t->dropForeign(['vendor_id']);
        });
        DB::statement('ALTER TABLE vendor_payouts MODIFY vendor_id BIGINT UNSIGNED NULL');
        Schema::table('vendor_payouts', function (Blueprint $t) {
            $t->foreign('vendor_id')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        // Best-effort reverse (won't run in practice; leaves snapshots harmlessly).
        Schema::table('entry_payments', function (Blueprint $t) {
            $t->dropForeign(['vendor_id']);
            $t->dropForeign(['invitation_id']);
            $t->foreign('vendor_id')->references('id')->on('users')->cascadeOnDelete();
            $t->foreign('invitation_id')->references('id')->on('invitations')->cascadeOnDelete();
        });
        Schema::table('vendor_payouts', function (Blueprint $t) {
            $t->dropForeign(['vendor_id']);
            $t->foreign('vendor_id')->references('id')->on('users')->cascadeOnDelete();
        });
    }
};
