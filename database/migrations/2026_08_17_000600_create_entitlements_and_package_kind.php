<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Packages become either a subscription PLAN or an add-ON, and can now actually
 * unlock capabilities (feature_keys map to the role×feature gate). A purchase
 * grants a dated `entitlement` per user (pay-once, expires per interval); the
 * gate reads active entitlements on top of the role defaults.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('packages', function (Blueprint $t) {
            if (! Schema::hasColumn('packages', 'kind')) {
                $t->string('kind')->default('plan')->after('role_target'); // plan | addon
            }
            if (! Schema::hasColumn('packages', 'feature_keys')) {
                // Gating keys this package unlocks (seating/checkin/qr_passes/…).
                $t->json('feature_keys')->nullable()->after('features');
            }
        });

        Schema::create('entitlements', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->foreignUuid('package_id')->nullable()->constrained('packages')->nullOnDelete();
            $t->string('name');                       // snapshot of the package name
            $t->string('kind')->default('addon');     // plan | addon
            $t->json('feature_keys')->nullable();     // snapshot of unlocked gating keys
            $t->string('interval')->default('monthly'); // monthly | yearly | once
            $t->decimal('price_myr', 8, 2)->default(0);
            $t->string('status')->default('active');  // active | expired | cancelled
            $t->timestamp('starts_at')->nullable();
            $t->timestamp('expires_at')->nullable();  // null = never (a 'once' grant)
            $t->uuid('payment_id')->nullable();       // the payment that bought it
            $t->timestamps();
            $t->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('entitlements');
        Schema::table('packages', function (Blueprint $t) {
            if (Schema::hasColumn('packages', 'kind')) {
                $t->dropColumn('kind');
            }
            if (Schema::hasColumn('packages', 'feature_keys')) {
                $t->dropColumn('feature_keys');
            }
        });
    }
};
