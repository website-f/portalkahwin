<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A normal user asks a superadmin to be promoted to vendor or affiliate.
 * The superadmin reviews it on the user-detail page and approves/rejects.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('role_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('requested_role');            // vendor | affiliate
            $table->text('note')->nullable();            // why they want it
            $table->string('status')->default('pending'); // pending | approved | rejected
            $table->text('review_note')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('role_requests');
    }
};
