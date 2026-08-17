<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * A "Payout Details" profile group for affiliates so the superadmin can pay their
 * commission into a real bank account. These render on the affiliate's account
 * profile (ProfileFields mode=custom) and save through the normal /me/profile
 * flow; the affiliate payout flow reads them via profileFieldValue().
 */
return new class extends Migration
{
    public function up(): void
    {
        $now = now();
        $fields = [
            ['key' => 'payout_bank_name', 'label' => 'Bank', 'type' => 'text', 'sort' => 20],
            ['key' => 'payout_bank_account_name', 'label' => 'Account holder name', 'type' => 'text', 'sort' => 21],
            ['key' => 'payout_bank_account_no', 'label' => 'Account number', 'type' => 'text', 'sort' => 22],
        ];
        foreach ($fields as $f) {
            if (DB::table('profile_fields')->where('key', $f['key'])->exists()) {
                continue;
            }
            DB::table('profile_fields')->insert([
                'id' => (string) Str::uuid(),
                'group_key' => 'payout',
                'group_label' => 'Payout Details',
                'key' => $f['key'],
                'label' => $f['label'],
                'type' => $f['type'],
                'options' => null,
                'roles' => json_encode(['affiliate']),
                'required' => false,
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
        DB::table('profile_fields')->whereIn('key', [
            'payout_bank_name', 'payout_bank_account_name', 'payout_bank_account_no',
        ])->delete();
    }
};
