<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\PasswordResetCode;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Self-service password recovery, mirroring the admin reset but driven by the
 * user: request a code by email, prove you received it, get a temporary password,
 * then get forced to choose a real one at next login (must_change_password).
 */
class PasswordResetController extends Controller
{
    private const TTL_MINUTES = 5;

    private const MAX_ATTEMPTS = 5;

    /** Step 1 — email a 6-digit code. */
    public function requestCode(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:190'],
        ]);

        $user = User::where('email', $data['email'])->first();

        // Always answer the same way. A different response for "no such account"
        // turns this endpoint into a membership oracle for any email address.
        $response = response()->json([
            'ok' => true,
            'expires_in_minutes' => self::TTL_MINUTES,
        ]);

        if (! $user || ! $user->is_active) {
            return $response;
        }

        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        // One live code per address — requesting again invalidates the previous.
        DB::table('password_reset_codes')->where('email', $user->email)->delete();
        DB::table('password_reset_codes')->insert([
            'email' => $user->email,
            'code_hash' => Hash::make($code),
            'expires_at' => now()->addMinutes(self::TTL_MINUTES),
            'attempts' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        try {
            Mail::to($user->email)->send(new PasswordResetCode($user, $code, self::TTL_MINUTES));
            Log::info('Password reset code sent', ['email' => $user->email]);
        } catch (\Throwable $e) {
            report($e);
        }

        return $response;
    }

    /** Step 2 — exchange a valid code for a temporary password. */
    public function verifyCode(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:190'],
            'code' => ['required', 'string', 'size:6'],
        ]);

        $row = DB::table('password_reset_codes')->where('email', $data['email'])->first();

        if (! $row) {
            throw ValidationException::withMessages([
                'code' => 'Kod tidak sah. Sila minta kod baharu.',
            ]);
        }

        if (now()->greaterThan($row->expires_at)) {
            DB::table('password_reset_codes')->where('id', $row->id)->delete();
            throw ValidationException::withMessages([
                'code' => 'Kod telah tamat tempoh. Sila minta kod baharu.',
            ]);
        }

        // Bound guessing: 6 digits is only a million combinations, and an
        // unthrottled endpoint would fall to a script in minutes.
        if ($row->attempts >= self::MAX_ATTEMPTS) {
            DB::table('password_reset_codes')->where('id', $row->id)->delete();
            throw ValidationException::withMessages([
                'code' => 'Terlalu banyak percubaan. Sila minta kod baharu.',
            ]);
        }

        if (! Hash::check($data['code'], $row->code_hash)) {
            DB::table('password_reset_codes')->where('id', $row->id)->increment('attempts');
            throw ValidationException::withMessages([
                'code' => 'Kod tidak sah. Sila semak semula.',
            ]);
        }

        $user = User::where('email', $data['email'])->first();
        if (! $user || ! $user->is_active) {
            throw ValidationException::withMessages([
                'code' => 'Akaun tidak ditemui.',
            ]);
        }

        $temp = 'Pk-'.Str::upper(Str::random(6));
        $user->update(['password' => $temp, 'must_change_password' => true]);

        // Single use, and every existing session dies with the old password.
        DB::table('password_reset_codes')->where('id', $row->id)->delete();
        $user->tokens()->delete();

        return response()->json(['temp_password' => $temp]);
    }
}
