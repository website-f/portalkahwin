<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * "Sign in with Google" via the OAuth2 authorization-code flow — the same shape
 * OrionDesk uses for Drive, minus refresh tokens (sign-in needs the identity
 * once, not ongoing API access).
 *
 * Normal users only. Vendor and affiliate accounts need admin approval and a
 * subscription, so they must go through the regular form where a role is chosen.
 */
class GoogleAuthController extends Controller
{
    private const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

    private const TOKEN_URL = 'https://oauth2.googleapis.com/token';

    private const USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

    /** How long an in-flight sign-in may take before its state is stale. */
    private const STATE_TTL = 600;

    public function redirect(Request $request)
    {
        if (! $this->configured()) {
            return $this->fail('google_not_configured');
        }

        $query = http_build_query([
            'client_id' => config('services.google.client_id'),
            'redirect_uri' => $this->redirectUri(),
            'response_type' => 'code',
            'scope' => 'openid email profile',
            'state' => $this->makeState(),
            // Always show the picker: users share machines, and silently
            // reusing the last Google session is a surprising way to log in.
            'prompt' => 'select_account',
        ]);

        return redirect()->away(self::AUTH_URL.'?'.$query);
    }

    public function callback(Request $request)
    {
        if ($request->query('error')) {
            // User pressed "Cancel" on Google's consent screen — not an error.
            return $this->fail('google_cancelled');
        }

        if (! $this->configured()) {
            return $this->fail('google_not_configured');
        }

        if (! $this->checkState((string) $request->query('state'))) {
            return $this->fail('google_state');
        }

        $code = (string) $request->query('code');
        if ($code === '') {
            return $this->fail('google_no_code');
        }

        try {
            $token = Http::asForm()->post(self::TOKEN_URL, [
                'code' => $code,
                'client_id' => config('services.google.client_id'),
                'client_secret' => config('services.google.client_secret'),
                'redirect_uri' => $this->redirectUri(),
                'grant_type' => 'authorization_code',
            ])->json();

            $access = $token['access_token'] ?? null;
            if (! $access) {
                Log::warning('Google token exchange failed', ['response' => $token]);

                return $this->fail('google_token');
            }

            $profile = Http::withToken($access)->get(self::USERINFO_URL)->json();
        } catch (\Throwable $e) {
            report($e);

            return $this->fail('google_unreachable');
        }

        $googleId = $profile['sub'] ?? null;
        $email = $profile['email'] ?? null;

        if (! $googleId || ! $email) {
            return $this->fail('google_profile');
        }

        // Google verifies its own addresses; an unverified one could be someone
        // else's inbox, which would let an attacker claim an existing account.
        if (($profile['email_verified'] ?? false) !== true) {
            return $this->fail('google_unverified');
        }

        $user = User::where('google_id', $googleId)->first()
            ?? User::where('email', $email)->first();

        if ($user) {
            if (! $user->is_active) {
                return $this->fail('account_disabled');
            }
            // Link Google to a pre-existing password account on first use.
            $user->forceFill([
                'google_id' => $googleId,
                'avatar' => $profile['picture'] ?? $user->avatar,
            ])->save();
        } else {
            $user = User::create([
                'name' => $profile['name'] ?? Str::before($email, '@'),
                'email' => $email,
                'google_id' => $googleId,
                'avatar' => $profile['picture'] ?? null,
                // Unguessable filler: this account signs in through Google, and
                // a null password column would break Hash::check on the form.
                'password' => Str::random(48),
                'role' => 'user',
                'status' => 'active',
            ]);
        }

        $plain = $user->createToken('google')->plainTextToken;

        // Hand the token back in the URL *fragment*: fragments are never sent to
        // servers or leaked in Referer headers, unlike a query string. The SPA
        // consumes it and immediately clears it from the address bar.
        return redirect()->away($this->spaUrl().'/login#token='.urlencode($plain));
    }

    private function configured(): bool
    {
        return filled(config('services.google.client_id'))
            && filled(config('services.google.client_secret'));
    }

    private function spaUrl(): string
    {
        return rtrim(config('app.url'), '/');
    }

    private function redirectUri(): string
    {
        return config('services.google.redirect')
            ?: $this->spaUrl().'/api/auth/google/callback';
    }

    private function fail(string $reason)
    {
        return redirect()->away($this->spaUrl().'/login?auth_error='.$reason);
    }

    /**
     * Stateless CSRF state: a random nonce plus timestamp, signed with the app
     * key. API routes carry no session, so there is nowhere to stash a nonce —
     * signing it means we can verify our own state without storing anything.
     */
    private function makeState(): string
    {
        $payload = base64_encode(json_encode(['t' => time(), 'n' => Str::random(16)]));

        return $payload.'.'.hash_hmac('sha256', $payload, (string) config('app.key'));
    }

    private function checkState(string $state): bool
    {
        $parts = explode('.', $state, 2);
        if (count($parts) !== 2) {
            return false;
        }
        [$payload, $sig] = $parts;

        if (! hash_equals(hash_hmac('sha256', $payload, (string) config('app.key')), $sig)) {
            return false;
        }

        $data = json_decode((string) base64_decode($payload, true), true);

        return is_array($data)
            && isset($data['t'])
            && (time() - (int) $data['t']) < self::STATE_TTL;
    }
}
