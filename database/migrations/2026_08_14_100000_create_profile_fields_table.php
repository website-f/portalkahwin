<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('profile_fields', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('group_key');            // machine key of the tab, e.g. 'business'
            $table->string('group_label');          // display label of the tab
            $table->string('key')->unique();        // machine key of the field
            $table->string('label');
            $table->string('type')->default('text'); // text|textarea|tel|email|number|select|logo
            $table->json('options')->nullable();     // for select
            $table->json('roles');                   // which roles fill it: user/vendor/affiliate
            $table->boolean('required')->default(false);
            $table->integer('sort')->default(0);
            $table->boolean('is_active')->default(true);
            // System fields ship with the app and back the receipt renderer — the
            // superadmin may relabel/reorder them but not delete them or change their key.
            $table->boolean('system')->default(false);
            $table->timestamps();
        });

        // Seed the built-in "Business & Receipt" group. company_logo/company_name reuse
        // the existing user columns; the rest are stored in users.profile_data.
        $now = now();
        $seed = [
            ['key' => 'company_logo',   'label' => 'Business logo',   'type' => 'logo',     'roles' => ['vendor', 'affiliate'], 'required' => false, 'sort' => 0],
            ['key' => 'company_name',   'label' => 'Business name',   'type' => 'text',     'roles' => ['vendor', 'affiliate'], 'required' => true,  'sort' => 1],
            ['key' => 'receipt_address', 'label' => 'Address',        'type' => 'textarea', 'roles' => ['vendor', 'affiliate'], 'required' => false, 'sort' => 2],
            ['key' => 'receipt_phone',  'label' => 'Phone',           'type' => 'tel',      'roles' => ['vendor', 'affiliate'], 'required' => false, 'sort' => 3],
            ['key' => 'receipt_email',  'label' => 'Email',           'type' => 'email',    'roles' => ['vendor', 'affiliate'], 'required' => false, 'sort' => 4],
            ['key' => 'receipt_tax',    'label' => 'Tax / SST No.',   'type' => 'text',     'roles' => ['vendor'],              'required' => false, 'sort' => 5],
        ];
        foreach ($seed as $f) {
            DB::table('profile_fields')->insert([
                'id' => (string) Str::uuid(),
                'group_key' => 'business',
                'group_label' => 'Business & Receipt',
                'key' => $f['key'],
                'label' => $f['label'],
                'type' => $f['type'],
                'options' => null,
                'roles' => json_encode($f['roles']),
                'required' => $f['required'],
                'sort' => $f['sort'],
                'is_active' => true,
                'system' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('profile_fields');
    }
};
