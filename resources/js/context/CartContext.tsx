import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

/** A single chosen template sitting in the cart. Only ever one at a time. */
export interface CartItem {
    key: string;
    name: string;
    price: number;
    thumbnail?: string | null;
}

interface CartCtx {
    item: CartItem | null;
    setItem: (x: CartItem) => void;
    clear: () => void;
}

const STORAGE_KEY = 'pk_cart';

const Ctx = createContext<CartCtx>(null as unknown as CartCtx);

/** Read a persisted cart item, guarding against malformed JSON / stale shapes. */
function loadItem(): CartItem | null {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as unknown;
        if (
            parsed &&
            typeof parsed === 'object' &&
            typeof (parsed as CartItem).key === 'string' &&
            typeof (parsed as CartItem).name === 'string' &&
            typeof (parsed as CartItem).price === 'number'
        ) {
            const p = parsed as CartItem;
            return { key: p.key, name: p.name, price: p.price, thumbnail: p.thumbnail ?? null };
        }
    } catch {
        // corrupt payload — treat as empty cart
    }
    return null;
}

export function CartProvider({ children }: { children: ReactNode }) {
    const [item, setItemState] = useState<CartItem | null>(() => loadItem());

    useEffect(() => {
        if (typeof localStorage === 'undefined') return;
        if (item) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(item));
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    }, [item]);

    const setItem = useCallback((x: CartItem) => setItemState(x), []);
    const clear = useCallback(() => setItemState(null), []);

    return <Ctx.Provider value={{ item, setItem, clear }}>{children}</Ctx.Provider>;
}

export function useCart() {
    return useContext(Ctx);
}
