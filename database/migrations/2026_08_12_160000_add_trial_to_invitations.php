<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invitations', function (Blueprint $table) {
            // A trial/test card (Logic 2): editable + shareable but watermarked and
            // view-limited until the host pays to publish.
            if (! Schema::hasColumn('invitations', 'is_trial')) {
                $table->boolean('is_trial')->default(false)->after('is_paid');
            }
            // How many times the trial preview link has been opened (the trial cap).
            if (! Schema::hasColumn('invitations', 'trial_views')) {
                $table->unsignedInteger('trial_views')->default(0)->after('is_trial');
            }
            // How many times this card has been edited/saved (edit-limit + monitoring).
            if (! Schema::hasColumn('invitations', 'edit_count')) {
                $table->unsignedInteger('edit_count')->default(0)->after('trial_views');
            }
        });
    }

    public function down(): void
    {
        Schema::table('invitations', function (Blueprint $table) {
            foreach (['is_trial', 'trial_views', 'edit_count'] as $col) {
                if (Schema::hasColumn('invitations', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
