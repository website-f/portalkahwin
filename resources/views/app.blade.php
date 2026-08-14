<!DOCTYPE html>
<html lang="ms">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    {{-- Subdirectory the app is mounted at, derived from APP_URL ("" at a domain
         root, "/app" at portalkahwin.com/app). The React bundle reads this at
         runtime so the same committed build works in both places — production
         has no npm to rebuild with. --}}
    <meta name="app-base" content="{{ rtrim(parse_url(config('app.url'), PHP_URL_PATH) ?: '', '/') }}">
    @if (config('app.noindex'))
        <meta name="robots" content="noindex, nofollow">
    @endif
    <title>Portal Kahwin</title>
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
</body>
</html>
