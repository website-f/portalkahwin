<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Idempotent on retry (a prior partial run may have created some of these).
        Schema::dropIfExists('assets');
        Schema::dropIfExists('storage_requests');
        Schema::dropIfExists('vouchers');
        Schema::dropIfExists('packages');

        // Subscription packages for vendor / affiliate (admin-managed).
        Schema::create('packages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('role_target')->default('any'); // any | vendor | affiliate
            $table->decimal('price_myr', 8, 2)->default(0);
            $table->string('interval')->default('monthly'); // monthly | yearly | once
            $table->json('features')->nullable();           // array of feature strings
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort')->default(0);
            $table->timestamps();
        });

        // Voucher codes the admin hands out (e.g. after a bank transfer).
        Schema::create('vouchers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code')->unique();
            $table->string('kind')->default('full');   // full | percent | amount
            $table->decimal('value', 8, 2)->default(0); // percent (0-100) or RM amount; ignored for full
            $table->unsignedInteger('max_uses')->nullable();
            $table->unsignedInteger('used_count')->default(0);
            $table->timestamp('expires_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->string('note')->nullable();
            $table->timestamps();
        });

        // A user's request to raise their storage quota (admin approves like a mini-approval).
        Schema::create('storage_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('requested_mb');
            $table->text('reason')->nullable();
            $table->string('status')->default('pending'); // pending | approved | rejected
            $table->text('admin_note')->nullable();
            $table->uuid('decided_by')->nullable();
            $table->timestamp('decided_at')->nullable();
            $table->timestamps();
        });

        // Every uploaded asset, so we can list them + total a user's storage usage.
        Schema::create('assets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('invitation_id')->nullable()->constrained()->nullOnDelete();
            $table->string('path');
            $table->unsignedBigInteger('size_bytes')->default(0);
            $table->string('kind')->default('image'); // image | audio
            $table->timestamps();
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assets');
        Schema::dropIfExists('storage_requests');
        Schema::dropIfExists('vouchers');
        Schema::dropIfExists('packages');
    }
};
