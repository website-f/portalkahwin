<!DOCTYPE html>
<html lang="ms">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    {{-- Marketing / analytics tags. Loaded as high in <head> as possible per
         Google's guidance. Skipped on non-indexable builds (staging/local, which
         already carry <meta robots noindex>) so those hits never pollute the
         production analytics + ad-conversion data. --}}
    @unless (config('app.noindex'))
        {{-- Google tag (gtag.js) — GA4 + Google Ads share one loader. --}}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-R1HXVFFE27"></script>
        <script>
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-R1HXVFFE27');
            gtag('config', 'AW-16653878030');
        </script>

        {{-- Microsoft Clarity --}}
        <script type="text/javascript">
            (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "mitx570am1");
        </script>

        {{-- Google AdSense --}}
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6861219348352968"
            crossorigin="anonymous"></script>

        {{-- Meta Pixel --}}
        <script>
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '1007280067891277');
            fbq('track', 'PageView');
        </script>
        <noscript><img height="1" width="1" style="display:none"
            src="https://www.facebook.com/tr?id=1007280067891277&ev=PageView&noscript=1" /></noscript>
    @endunless

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
