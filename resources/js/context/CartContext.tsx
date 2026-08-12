import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

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

const STORAGE_KEY = 'pk_cart';

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
function loadItems(): CartItem[] {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(STORAGE_KEY);
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
    const [items, setItems] = useState<CartItem[]>(() => loadItems());

    useEffect(() => {
        if (typeof localStorage === 'undefined') return;
        if (items.length > 0) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    }, [items]);

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
