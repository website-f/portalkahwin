{{--
    Marketing / analytics tags for the Laravel app at /app — the same stack the
    WordPress site at the domain root runs, so /app stops being a measurement
    blind spot. IDs come from config/analytics.php; see that file to override or
    disable any of them.

    Two things differ from the copy-paste snippets Google and Meta hand you,
    because this is a single-page app: React Router changes the URL without ever
    reloading the document, so the vanilla snippets would record exactly one page
    view per session — the landing page — and nothing after it.

      1. Every gtag target is configured with `send_page_view: false`, and
      2. page views are sent by hand from window.pkTrackPageView(), which
         AppRouter calls on the first render and on every route change after it.

    Firing every view through one function is what keeps it from double counting:
    the snippet no longer sends its own view, so there is exactly one per route.

    Clarity is left alone — it follows History API changes by itself.
--}}
@if (config('analytics.enabled'))
    @php
        $ga4 = config('analytics.ga4');
        $googleAds = config('analytics.google_ads');
        $clarity = config('analytics.clarity');
        $metaPixel = config('analytics.meta_pixel');
        $adsense = config('analytics.adsense');
        $gtagIds = array_values(array_filter([$ga4, $googleAds]));
    @endphp

    @if ($gtagIds)
        {{-- Google tag (gtag.js) — GA4 and/or Google Ads share one library. --}}
        <script async src="https://www.googletagmanager.com/gtag/js?id={{ $gtagIds[0] }}"></script>
        <script>
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            @foreach ($gtagIds as $id)
                gtag('config', @json($id), { send_page_view: false });
            @endforeach
        </script>
    @endif

    @if ($clarity)
        {{-- Microsoft Clarity — session replay + heatmaps. SPA-aware on its own. --}}
        <script type="text/javascript">
            (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", @json($clarity));
        </script>
    @endif

    @if ($metaPixel)
        {{-- Meta Pixel. init only: the PageView is sent by pkTrackPageView below,
             so a client-side route change is counted like a real page load. --}}
        <script>
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', @json($metaPixel));
        </script>
        <noscript><img height="1" width="1" style="display:none" alt=""
            src="https://www.facebook.com/tr?id={{ urlencode($metaPixel) }}&ev=PageView&noscript=1"></noscript>
    @endif

    {{-- The one entry point the React app calls. Kept here rather than in the
         bundle so the IDs stay server-side and the committed production build
         never needs rebuilding to change a tag. Safe to call when a tag is
         absent or still loading: gtag/fbq queue calls until their script lands,
         and the typeof guards cover a blocked or ad-filtered request. --}}
    <script>
        window.pkTrackPageView = function (path) {
            var url = path || (window.location.pathname + window.location.search);

            try {
                if (typeof window.gtag === 'function') {
                    window.gtag('event', 'page_view', {
                        page_title: document.title,
                        page_location: window.location.href,
                        page_path: url,
                    });
                }

                if (typeof window.fbq === 'function') {
                    window.fbq('track', 'PageView');
                }
            } catch (e) {
                // Analytics must never take the app down with it.
            }
        };
    </script>

    @if ($adsense)
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client={{ urlencode($adsense) }}"
            crossorigin="anonymous"></script>
    @endif
@endif
