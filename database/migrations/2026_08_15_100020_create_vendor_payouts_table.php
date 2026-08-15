<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A manual release of collected entry money to one vendor. The platform holds all
 * guest payments (see entry_payments) and the superadmin pays each vendor out
 * offline, recording the release here — the receipt printed for the vendor.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vendor_payouts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('vendor_id')->constrained('users')->cascadeOnDelete();
            $table->string('reference')->unique();          // receipt no, e.g. PO-XXXXXX
            $table->decimal('gross', 10, 2)->default(0);    // total the guests paid
            $table->decimal('fee_total', 10, 2)->default(0);// platform commission withheld
            $table->decimal('adjustment', 10, 2)->default(0); // manual +/- correction
            $table->decimal('net', 10, 2)->default(0);      // actually released to the vendor
            $table->unsignedInteger('entries_count')->default(0);
            $table->string('method')->nullable();           // bank transfer / cash / e-wallet
            $table->text('note')->nullable();
            $table->foreignId('released_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('released_at')->nullable();
            $table->string('status', 12)->default('released'); // released | void
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vendor_payouts');
    }
};
