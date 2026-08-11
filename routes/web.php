<?php

use Illuminate\Support\Facades\Route;

// SPA catch-all: every non-API path returns the React shell so client-side
// routing (deep links like /e/aisyah-danial) works on artisan serve and cPanel.
Route::view('/{any?}', 'app')->where('any', '^(?!api).*$');
