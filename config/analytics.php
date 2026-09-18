<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Marketing / analytics tags
    |--------------------------------------------------------------------------
    |
    | The same tag stack the WordPress site at the domain root runs, so /app is
    | measured in the same properties rather than being a blind spot. Rendered by
    | resources/views/partials/analytics.blade.php into the app shell.
    |
    | IDs default to the live values because the committed production build has no
    | npm/.env rewrite step — but each can still be overridden per environment,
    | and setting any of them to an empty string drops that script entirely.
    |
    | Nothing renders at all when `enabled` is false, which is the default
    | anywhere but production: local page views and the test suite must never
    | reach the real properties.
    |
    | (env() rather than app()->environment(): config files are loaded before the
    | container is bootstrapped, so calling the app here fails with
    | "Target class [env] does not exist".)
    |
    */

    'enabled' => (bool) env('ANALYTICS_ENABLED', env('APP_ENV') === 'production'),

    /** GA4 measurement ID. Page views are sent manually — see the partial. */
    'ga4' => env('GA4_MEASUREMENT_ID', 'G-R1HXVFFE27'),

    /** Google Ads conversion/remarketing tag. */
    'google_ads' => env('GOOGLE_ADS_ID', 'AW-16653878030'),

    /** Microsoft Clarity project ID (session replay + heatmaps). */
    'clarity' => env('CLARITY_PROJECT_ID', 'mitx570am1'),

    /** Meta (Facebook) Pixel ID. */
    'meta_pixel' => env('META_PIXEL_ID', '1007280067891277'),

    /** Google AdSense publisher ID. */
    'adsense' => env('ADSENSE_CLIENT_ID', 'ca-pub-6861219348352968'),

];
