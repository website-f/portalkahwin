<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('plan')->default('free')->after('role'); // free | premium
            $table->timestamp('plan_expires_at')->nullable()->after('plan');
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('purpose')->default('subscription'); // subscription | template
            $table->string('reference')->unique();              // our external ref
            $table->string('bill_code')->nullable()->index();   // ToyyibPay bill code
            $table->decimal('amount_myr', 8, 2)->default(0);
            $table->string('status')->default('pending');       // pending | paid | failed
            $table->json('meta')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['plan', 'plan_expires_at']);
        });
        Schema::dropIfExists('payments');
    }
};
