import { api } from './api';

const SID_KEY = 'pk_sid';

declare global {
    interface Window {
        /**
         * Sends one page view to every marketing tag (GA4, Google Ads, Meta
         * Pixel). Defined by resources/views/partials/analytics.blade.php, so it
         * is absent whenever analytics are disabled — local, testing, or a
         * blocked/ad-filtered request. Always call it through a typeof guard.
         */
        pkTrackPageView?: (path: string) => void;
    }
}

function sessionId(): string {
    let sid = localStorage.getItem(SID_KEY);
    if (!sid) {
        sid = 'sess-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem(SID_KEY, sid);
    }
    return sid;
}

/**
 * Record one page view — in our own traffic table AND in the external tags.
 *
 * Called by RouteTracker on first render and on every route change after it.
 * That second part is the load-bearing bit for the external tags: React Router
 * changes the URL without reloading the document, so gtag/fbq would otherwise
 * only ever see the landing page. Their snippets are configured NOT to send
 * their own view (send_page_view: false) precisely so this is the single place
 * a view is counted.
 */
export function trackPageView(path: string): void {
    // Fire-and-forget; never block the UI. Skip internal admin routes — staff
    // clicking around the back office isn't site traffic, in our table or in GA.
    if (path.startsWith('/admin')) return;

    api.post('/track', {
        path,
        referrer: document.referrer || null,
        session_id: sessionId(),
    }).catch(() => {});

    if (typeof window.pkTrackPageView === 'function') {
        window.pkTrackPageView(path);
    }
}
