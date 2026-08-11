import { api } from './api';

const SID_KEY = 'pk_sid';

function sessionId(): string {
    let sid = localStorage.getItem(SID_KEY);
    if (!sid) {
        sid = 'sess-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem(SID_KEY, sid);
    }
    return sid;
}

export function trackPageView(path: string): void {
    // Fire-and-forget; never block the UI. Skip internal admin routes.
    if (path.startsWith('/admin')) return;
    api.post('/track', {
        path,
        referrer: document.referrer || null,
        session_id: sessionId(),
    }).catch(() => {});
}
