import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, clearToken, getToken, setToken } from '../lib/api';

export type UserRole = 'user' | 'vendor' | 'affiliate' | 'admin' | 'superadmin';

export interface AuthUser {
    id: number;
    name: string;
    email: string;
    role: UserRole;
    status?: 'active' | 'pending' | 'rejected';
    plan?: 'free' | 'premium';
    phone?: string | null;
    company_name?: string | null;
    company_logo?: string | null;
    must_change_password?: boolean;
    /** Template keys this user has purchased (per-template ownership). */
    owned_templates?: string[];
    /** Unspent credits per design (consumable model): { templateKey: count }. */
    template_credits?: Record<string, number>;
    /** True if the user bought ≥1 design (or is premium/admin) — unlocks paid features like seating. */
    has_paid_access?: boolean;
    /** Vendor/affiliate subscribe; normal users only buy templates. */
    needs_subscription?: boolean;
    /** An admin has published a package targeting this account's role — show the plans nav. */
    has_purchasable_package?: boolean;
    storage_used_mb?: number;
    storage_quota_mb?: number;
    /** Admin-configurable capabilities for this account's role. */
    features?: Partial<Record<FeatureKey, boolean>>;
    /** Vendor may charge guests per RSVP entry (master switch on + vendor role). */
    can_pay_per_entry?: boolean;
}

export type FeatureKey = 'seating' | 'checkin' | 'qr_passes' | 'company_branding' | 'designer';

/**
 * Can this account use a capability? Mirrors User::hasFeature() on the server —
 * staff always can, everyone else follows the admin matrix. Defaults to false so
 * a stale session can never reveal a tool it no longer has.
 */
export function can(user: AuthUser | null | undefined, feature: FeatureKey): boolean {
    if (!user) return false;
    if (isStaff(user)) return true;
    return user.features?.[feature] === true;
}

/** True for admin + superadmin (staff who can reach the admin panel). */
export function isStaff(user?: AuthUser | null): boolean {
    return user?.role === 'admin' || user?.role === 'superadmin';
}

interface AuthCtx {
    user: AuthUser | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<AuthUser>;
    register: (payload: { name: string; email: string; phone?: string; password: string; role?: UserRole; company_name?: string; ref?: string }) => Promise<AuthUser>;
    logout: () => Promise<void>;
    refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>(null as unknown as AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!getToken()) {
            setLoading(false);
            return;
        }
        api.get<AuthUser>('/me')
            .then((r) => setUser(r.data))
            .catch(() => clearToken())
            .finally(() => setLoading(false));
    }, []);

    // Keep capabilities fresh: when the tab regains focus, re-fetch /me so admin
    // changes to the feature matrix, plan or quota reach an open session without a
    // re-login (this is why "enable table management" now takes effect live).
    // Throttled so rapid tab-switches don't spam the endpoint.
    useEffect(() => {
        if (!getToken()) return;
        let last = 0;
        const sync = () => {
            if (document.visibilityState !== 'visible') return;
            const now = Date.now();
            if (now - last < 20000) return;
            last = now;
            api.get<AuthUser>('/me').then((r) => setUser(r.data)).catch(() => { /* keep current session */ });
        };
        document.addEventListener('visibilitychange', sync);
        window.addEventListener('focus', sync);
        return () => {
            document.removeEventListener('visibilitychange', sync);
            window.removeEventListener('focus', sync);
        };
    }, [user?.id]);

    async function login(email: string, password: string) {
        const r = await api.post('/login', { email, password });
        setToken(r.data.token);
        setUser(r.data.user);
        return r.data.user as AuthUser;
    }

    async function register(payload: { name: string; email: string; phone?: string; password: string }) {
        const r = await api.post('/register', payload);
        setToken(r.data.token);
        setUser(r.data.user);
        return r.data.user as AuthUser;
    }

    async function logout() {
        try {
            await api.post('/logout');
        } catch {
            // ignore
        }
        clearToken();
        setUser(null);
    }

    async function refresh() {
        const r = await api.get<AuthUser>('/me');
        setUser(r.data);
    }

    return <Ctx.Provider value={{ user, loading, login, register, logout, refresh }}>{children}</Ctx.Provider>;
}

export function useAuth() {
    return useContext(Ctx);
}
