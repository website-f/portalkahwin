import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, clearToken, getToken, setToken } from '../lib/api';

export interface AuthUser {
    id: number;
    name: string;
    email: string;
    role: 'user' | 'admin';
    plan?: 'free' | 'premium';
    phone?: string | null;
    must_change_password?: boolean;
    /** Template keys this user has purchased (per-template ownership). */
    owned_templates?: string[];
    /** True if the user bought ≥1 design (or is premium/admin) — unlocks paid features like seating. */
    has_paid_access?: boolean;
}

interface AuthCtx {
    user: AuthUser | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<AuthUser>;
    register: (payload: { name: string; email: string; phone?: string; password: string }) => Promise<AuthUser>;
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
