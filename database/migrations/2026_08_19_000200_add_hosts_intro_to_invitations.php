<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invitations', function (Blueprint $table) {
            // Greeting/lead-in shown ABOVE the inviting parents, e.g.
            // "Assalamualaikum W.B.T & Salam Sejahtera / Dengan penuh kesyukuran
            // ke hadrat Ilahi dan izin Allah SWT, kami". Editable; '' hides it.
            $table->text('hosts_intro')->nullable()->after('parents');
        });
    }

    public function down(): void
    {
        Schema::table('invitations', function (Blueprint $table) {
            $table->dropColumn('hosts_intro');
        });
    }
};
