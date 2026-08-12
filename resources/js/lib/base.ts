/**
 * Where the app is mounted, read at runtime from a meta tag Laravel renders out
 * of APP_URL. Empty string at a domain root, "/app" when served from
 * portalkahwin.com/app.
 *
 * This is deliberately runtime rather than a build-time env var: production has
 * no npm, so the committed bundle in public/build has to work unchanged at both
 * paths. Anything that builds a URL by hand must go through url()/absoluteUrl()
 * — React Router's basename only covers <Link>, not plain <a href>.
 */
export const BASE: string = (
    document.querySelector('meta[name="app-base"]')?.getAttribute('content') ?? ''
).replace(/\/+$/, '');

/** Root-relative path for a route: url('/e/abc') → '/app/e/abc'. */
export const url = (path: string): string => `${BASE}${path.startsWith('/') ? path : `/${path}`}`;

/** Full URL including origin — for sharing, QR codes, copy-to-clipboard. */
export const absoluteUrl = (path: string): string => `${window.location.origin}${url(path)}`;
