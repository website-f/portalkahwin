<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * One guest's pay-per-entry RSVP payment. The platform collects every one of these
 * (into the superadmin HitPay account); each row is stamped with its vendor and a
 * frozen fee split (platform_fee kept by the platform, vendor_net owed to the
 * vendor) so nothing has to be recomputed at payout time and no two vendors clash.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('entry_payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('invitation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('vendor_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('guest_id')->nullable()->constrained('rsvp_guests')->nullOnDelete();

            $table->string('reference')->unique();  // ENT-XXXXXXXX (our local ref)
            $table->string('bill_code')->nullable()->index(); // HitPay payment-request id

            $table->string('payer_name')->nullable();
            $table->string('payer_email')->nullable();
            $table->string('payer_phone')->nullable();

            $table->unsignedInteger('pax')->default(1);
            $table->decimal('unit_price', 8, 2)->default(0);   // price per head
            $table->decimal('tax_percent', 5, 2)->default(0);
            $table->decimal('tax_amount', 8, 2)->default(0);
            $table->decimal('amount', 8, 2)->default(0);       // total the guest paid

            // Frozen commission split (computed at payment time from settings).
            $table->string('fee_type', 10)->default('percent'); // percent | fixed
            $table->decimal('fee_value', 8, 2)->default(0);
            $table->decimal('platform_fee', 8, 2)->default(0);  // platform keeps this
            $table->decimal('vendor_net', 8, 2)->default(0);    // vendor is owed this

            $table->string('status', 12)->default('pending')->index(); // pending | paid | failed
            $table->timestamp('paid_at')->nullable();

            // Set when the superadmin releases this payment to the vendor.
            $table->uuid('payout_id')->nullable()->index();

            $table->json('meta')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('entry_payments');
    }
};
