<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A rejected vendor/affiliate can appeal the decision: they log in but are locked
 * to a single Appeal page where they state their case + attach proof. The superadmin
 * reviews the appeal and either activates the account or upholds the rejection.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appeals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->text('reason');                          // why they should be reconsidered
            $table->string('attachment')->nullable();        // supporting document (image/pdf)
            $table->string('status')->default('pending');    // pending | approved | rejected
            $table->text('review_note')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appeals');
    }
};
