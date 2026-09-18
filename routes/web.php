<?php

use App\Http\Controllers\ShellController;
use App\Http\Controllers\SitemapController;
use Illuminate\Support\Facades\Route;

// SEO plumbing. Declared before the catch-all so they win over it.
//
// NOTE: a crawler only ever reads robots.txt from the DOMAIN ROOT, so
// /app/robots.txt is ignored — the file that governs this app is WordPress's at
// portalkahwin.com/robots.txt, which is where the Sitemap: line below has to be
// added. public/robots.txt is kept only so a direct request isn't a 404.
Route::get('sitemap.xml', SitemapController::class)->name('sitemap');

// SPA catch-all: every non-API path returns the React shell so client-side
// routing (deep links like /e/aisyah-danial) works on artisan serve and cPanel.
//
// It goes through ShellController rather than Route::view() so the shell's <head>
// and <noscript> fallback are built per path (App\Support\AppSeo). Without that,
// every URL under /app served one empty shell with one title, which is half the
// reason none of it could be crawled — the other half was the blanket
// X-Robots-Tag that used to sit in public/.htaccess.
Route::get('/{any?}', ShellController::class)->where('any', '^(?!api).*$');
