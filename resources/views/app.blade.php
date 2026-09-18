<!DOCTYPE html>
<html lang="ms">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    {{-- Marketing / analytics tags: GA4, Google Ads, Clarity, Meta Pixel,
         AdSense. Loaded as high in <head> as possible per Google's guidance.

         These used to be pasted inline here. They now live in
         partials/analytics.blade.php reading config/analytics.php, for two
         reasons:
           * the IDs became overridable per environment, and the whole stack is
             gated on its own `analytics.enabled` rather than on
             config('app.noindex') — those are different questions, and now that
             /app is meant to BE indexed, tying one to the other would have
             turned the tags on and off with an SEO setting;
           * the snippets were counting one page view per session. This is a
             client-routed SPA, so React Router changes the URL without ever
             reloading the document: the landing page was recorded and nothing
             after it. The partial sets send_page_view:false and sends a view per
             route instead (see resources/js/lib/tracking.ts). --}}
    @include('partials.analytics')

    <meta name="csrf-token" content="{{ csrf_token() }}">
    {{-- Subdirectory the app is mounted at, derived from APP_URL ("" at a domain
         root, "/app" at portalkahwin.com/app). The React bundle reads this at
         runtime so the same committed build works in both places — production
         has no npm to rebuild with. --}}
    <meta name="app-base" content="{{ rtrim(parse_url(config('app.url'), PHP_URL_PATH) ?: '', '/') }}">

    {{-- Server-rendered SEO, built per path by App\Support\AppSeo. The app is a
         client-rendered SPA, so without this every URL under /app returned the
         same empty shell and the same one title — nothing for a crawler to read.
         $title etc. come from ShellController; the ?? fallbacks keep this view
         renderable from a plain `view('app')` call. APP_NOINDEX is handled in
         AppSeo, which is why there is no separate noindex block here. --}}
    <title>{{ $title ?? 'Portal Kahwin' }}</title>
    @if (! empty($description))
        <meta name="description" content="{{ $description }}">
    @endif
    <meta name="robots" content="{{ $robots ?? 'noindex, nofollow' }}">
    @if (! empty($canonical))
        <link rel="canonical" href="{{ $canonical }}">
    @endif

    {{-- Open Graph / Twitter: what WhatsApp and Facebook show when a host shares
         their card link, which is how nearly every guest arrives. --}}
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Portal Kahwin">
    <meta property="og:locale" content="ms_MY">
    <meta property="og:title" content="{{ $title ?? 'Portal Kahwin' }}">
    @if (! empty($description))
        <meta property="og:description" content="{{ $description }}">
    @endif
    @if (! empty($canonical))
        <meta property="og:url" content="{{ $canonical }}">
    @endif
    @if (! empty($image))
        <meta property="og:image" content="{{ $image }}">
        <meta name="twitter:image" content="{{ $image }}">
    @endif
    <meta name="twitter:card" content="{{ empty($image) ? 'summary' : 'summary_large_image' }}">
    <meta name="twitter:title" content="{{ $title ?? 'Portal Kahwin' }}">
    @if (! empty($description))
        <meta name="twitter:description" content="{{ $description }}">
    @endif

    @if (! empty($schema))
        {{-- JSON-LD, already encoded by App\Support\AppSeo::jsonLd().

             It is built in PHP and only echoed here on purpose: "@context" is a
             real Blade DIRECTIVE, so encoding the array in this view compiled
             the array key into PHP source and shipped JSON-LD with no @context
             — which Google discards without a word. --}}
        <script type="application/ld+json">{!! $schema !!}</script>
    @endif

    {{-- asset() honours ASSET_URL, so these resolve under /app in production. --}}
    <link rel="icon" type="image/webp" sizes="32x32" href="{{ asset('cropped-Portal-Kahwin-New-Logo-Website-32x32.webp') }}">
    <link rel="icon" type="image/webp" sizes="192x192" href="{{ asset('cropped-Portal-Kahwin-New-Logo-Website-192x192.webp') }}">
    <link rel="apple-touch-icon" href="{{ asset('cropped-Portal-Kahwin-New-Logo-Website-192x192.webp') }}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap" rel="stylesheet">
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/app.tsx'])
</head>
<body>
    <div id="app"></div>

    {{-- Crawlable content fallback. There's no Node/SSR on this host, so the
         page's text is emitted here for crawlers that don't run JavaScript;
         real visitors get the React version and never see it. Only ever set for
         indexable pages — see App\Support\AppSeo::page(). --}}
    @if (! empty($body))
        <noscript>{!! $body !!}</noscript>
    @endif
</body>
</html>
