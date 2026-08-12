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
    /** True if the user bought ≥1 design (or is premium/admin) — unlocks paid features like seating. */
    has_paid_access?: boolean;
    /** Vendor/affiliate subscribe; normal users only buy templates. */
    needs_subscription?: boolean;
    storage_used_mb?: number;
    storage_quota_mb?: number;
    /** Admin-configurable capabilities for this account's role. */
    features?: Partial<Record<FeatureKey, boolean>>;
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
    register: (payload: { name: string; email: string; phone?: string; password: string; role?: UserRole; company_name?: string }) => Promise<AuthUser>;
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
