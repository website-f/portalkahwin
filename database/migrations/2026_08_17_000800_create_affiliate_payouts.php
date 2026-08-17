<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Recorded affiliate commission payouts (mirrors vendor_payouts). The superadmin
 * releases the commission owed to an affiliate as one payout with a reference the
 * template payments it covers point back to (payments.affiliate_payout_id).
 * affiliate_id nulls on delete but the name/email snapshot keeps the audit trail.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('affiliate_payouts', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->foreignId('affiliate_id')->nullable()->constrained('users')->nullOnDelete();
            $t->string('affiliate_name')->nullable();  // snapshot
            $t->string('affiliate_email')->nullable(); // snapshot
            $t->string('reference');
            $t->decimal('gross', 10, 2)->default(0);      // sum of the sales covered
            $t->decimal('rate_percent', 5, 2)->default(0); // commission rate applied
            $t->decimal('amount', 10, 2)->default(0);      // commission actually paid
            $t->unsignedInteger('payments_count')->default(0);
            $t->string('method')->nullable();
            $t->string('bank_snapshot')->nullable();       // bank details at payout time
            $t->string('note', 500)->nullable();
            $t->string('attachment')->nullable();
            $t->foreignId('released_by')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamp('released_at')->nullable();
            $t->string('status')->default('released'); // released | void
            $t->timestamps();
        });

        Schema::table('payments', function (Blueprint $t) {
            if (! Schema::hasColumn('payments', 'affiliate_payout_id')) {
                $t->uuid('affiliate_payout_id')->nullable()->after('meta')->index();
            }
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $t) {
            if (Schema::hasColumn('payments', 'affiliate_payout_id')) {
                $t->dropColumn('affiliate_payout_id');
            }
        });
        Schema::dropIfExists('affiliate_payouts');
    }
};
