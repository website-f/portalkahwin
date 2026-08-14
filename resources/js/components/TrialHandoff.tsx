import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

/**
 * Turns a guest's saved trial-editor content (localStorage `pk_trial`) into a real
 * trial card once they log in.
 *
 * The trial editor saves `pk_trial` then navigates to /register?trial=1 (or
 * /login?trial=1). This watcher remembers that flag, waits for the user to appear,
 * POSTs the content to /me/trial-cards, then redirects to My Cards. It's one-shot
 * (guarded by a sessionStorage marker) so it never fires for a normal login.
 */
export function TrialHandoff() {
    const { user } = useAuth();
    const loc = useLocation();
    const nav = useNavigate();
    const running = useRef(false);

    // Persist the intent across the auth navigation (the ?trial=1 URL is lost after login).
    useEffect(() => {
        const p = new URLSearchParams(loc.search);
        if (p.get('trial') === '1' && localStorage.getItem('pk_trial')) {
            sessionStorage.setItem('pk_trial_go', '1');
        }
    }, [loc.search]);

    useEffect(() => {
        if (!user || running.current) return;
        if (sessionStorage.getItem('pk_trial_go') !== '1') return;

        const raw = localStorage.getItem('pk_trial');
        if (!raw) {
            sessionStorage.removeItem('pk_trial_go');
            return;
        }
        running.current = true;

        void (async () => {
            try {
                const parsed = JSON.parse(raw) as { template_key?: string; data?: Record<string, unknown> };
                if (parsed.template_key) {
                    await api.post('/me/trial-cards', { template_key: parsed.template_key, ...(parsed.data ?? {}) });
                }
            } catch {
                /* worst case they just land on the panel with no new card */
            } finally {
                localStorage.removeItem('pk_trial');
                sessionStorage.removeItem('pk_trial_go');
                nav('/panel', { replace: true });
            }
        })();
    }, [user, nav]);

    return null;
}
