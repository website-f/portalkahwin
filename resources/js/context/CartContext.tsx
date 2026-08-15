import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';

/** A single chosen template sitting in the cart. */
export interface CartItem {
    key: string;
    name: string;
    price: number;
    thumbnail?: string | null;
}

interface CartCtx {
    items: CartItem[];
    add: (x: CartItem) => void;
    remove: (key: string) => void;
    clear: () => void;
    has: (key: string) => boolean;
    count: number;
    total: number;
}

// The cart is namespaced PER ACCOUNT so one user's cart can never surface in
// another's after a re-login (and a guest's cart never lands in an account).
const keyFor = (uid: string | number) => `pk_cart_${uid}`;

const Ctx = createContext<CartCtx>(null as unknown as CartCtx);

/** Type guard for a single well-formed cart item — guards against stale / corrupt shapes. */
function isCartItem(v: unknown): v is CartItem {
    return (
        !!v &&
        typeof v === 'object' &&
        typeof (v as CartItem).key === 'string' &&
        typeof (v as CartItem).name === 'string' &&
        typeof (v as CartItem).price === 'number'
    );
}

/** Read a persisted cart, guarding against malformed JSON / legacy single-item / stale shapes. */
function loadItems(key: string): CartItem[] {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return []; // legacy single-item object or corrupt payload — start fresh
        const seen = new Set<string>();
        const out: CartItem[] = [];
        for (const p of parsed) {
            if (isCartItem(p) && !seen.has(p.key)) {
                seen.add(p.key);
                out.push({ key: p.key, name: p.name, price: p.price, thumbnail: p.thumbnail ?? null });
            }
        }
        return out;
    } catch {
        // corrupt payload — treat as empty cart
    }
    return [];
}

export function CartProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const uid = user?.id ?? 'guest';

    // Clean up the old shared key once — its contents are exactly the leak we're fixing.
    useEffect(() => {
        try { localStorage.removeItem('pk_cart'); } catch { /* ignore */ }
    }, []);

    const [items, setItems] = useState<CartItem[]>(() => loadItems(keyFor(uid)));

    // Switch carts when the signed-in account changes (login / logout / switch user).
    const prevUid = useRef(uid);
    useEffect(() => {
        if (prevUid.current === uid) return;
        prevUid.current = uid;
        setItems(loadItems(keyFor(uid)));
    }, [uid]);

    // Persist to THIS account's key only.
    useEffect(() => {
        if (typeof localStorage === 'undefined') return;
        const key = keyFor(uid);
        if (items.length > 0) {
            localStorage.setItem(key, JSON.stringify(items));
        } else {
            localStorage.removeItem(key);
        }
    }, [items, uid]);

    // Idempotent by key — re-adding an item already in the cart is a no-op.
    const add = useCallback((x: CartItem) => {
        setItems((prev) =>
            prev.some((i) => i.key === x.key)
                ? prev
                : [...prev, { key: x.key, name: x.name, price: x.price, thumbnail: x.thumbnail ?? null }],
        );
    }, []);
    const remove = useCallback((key: string) => {
        setItems((prev) => prev.filter((i) => i.key !== key));
    }, []);
    const clear = useCallback(() => setItems([]), []);
    const has = useCallback((key: string) => items.some((i) => i.key === key), [items]);

    const count = items.length;
    const total = useMemo(() => items.reduce((sum, i) => sum + i.price, 0), [items]);

    const value = useMemo<CartCtx>(
        () => ({ items, add, remove, clear, has, count, total }),
        [items, add, remove, clear, has, count, total],
    );

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
    return useContext(Ctx);
}
