<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Housekeeping pass for the affiliate 24-hour link window (the public endpoint
// already gates lapsed cards; this keeps the count visible in logs).
Schedule::command('cards:expire-affiliate')->hourly();

// Retire paid QR entry passes once the event (plus grace window) has passed.
Schedule::command('passes:expire')->daily();

// Lapse package entitlements (plans + add-ons) the day after they expire.
Schedule::command('entitlements:expire')->daily();
