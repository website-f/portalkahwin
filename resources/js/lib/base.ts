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

/**
 * Fix up a path that came out of the DATABASE.
 *
 * Stored media is root-relative — `/thumbnails/floral.png`, `/storage/logos/3/x.png`
 * — because it was written without knowing where the app would be mounted. Served
 * from /app those resolve against the domain root and 404.
 *
 * Left alone: absolute URLs, data:/blob: URIs (local previews before upload), and
 * anything already carrying the base. Safe to apply twice.
 */
export function mediaUrl(path?: string | null): string | undefined {
    if (!path) return undefined;
    if (/^(https?:)?\/\//i.test(path) || /^(data|blob):/i.test(path)) return path;
    if (!path.startsWith('/')) return path;
    if (BASE && (path === BASE || path.startsWith(`${BASE}/`))) return path;
    return `${BASE}${path}`;
}

/** mediaUrl() across a list, dropping anything that resolves to nothing. */
export const mediaUrls = (paths?: (string | null)[] | null): string[] =>
    (paths ?? []).map((p) => mediaUrl(p)).filter((p): p is string => !!p);
