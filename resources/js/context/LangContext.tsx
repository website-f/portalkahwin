import { createContext, useContext, useState, type ReactNode } from 'react';

export type Lang = 'bm' | 'en' | 'zh';

export const LANGS: { id: Lang; label: string; short: string }[] = [
    { id: 'bm', label: 'Bahasa Melayu', short: 'BM' },
    { id: 'en', label: 'English', short: 'EN' },
    { id: 'zh', label: '中文', short: '中文' },
];

/** BCP-47 tags, for Intl date/number formatting. */
export const LOCALE: Record<Lang, string> = {
    bm: 'ms-MY',
    en: 'en-GB',
    zh: 'zh-CN',
};

interface LangCtx {
    lang: Lang;
    setLang: (l: Lang) => void;
    toggle: () => void;
    /** False until the visitor has picked a language — drives the first-visit gate. */
    chosen: boolean;
}

const Ctx = createContext<LangCtx>(null as unknown as LangCtx);

const isLang = (v: unknown): v is Lang => v === 'bm' || v === 'en' || v === 'zh';

const COOKIE = 'pk_lang';

/** Read the language cookie. Cookies (not just localStorage) so the choice is
 *  visible to the server and shared across the whole domain. */
function readCookie(): string | null {
    if (typeof document === 'undefined') return null;
    const m = document.cookie.match(new RegExp(`(?:^|; )${COOKIE}=([^;]*)`));
    return m ? decodeURIComponent(m[1]) : null;
}

function writeCookie(l: Lang): void {
    if (typeof document === 'undefined') return;
    // One year, site-wide, and SameSite=Lax so it survives normal navigation.
    document.cookie = `${COOKIE}=${l}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

export function LangProvider({ children }: { children: ReactNode }) {
    // The cookie is authoritative; localStorage is kept in step for older sessions.
    const initial = (() => {
        const c = readCookie();
        if (isLang(c)) return { lang: c, chosen: true };
        const ls = typeof localStorage !== 'undefined' ? localStorage.getItem(COOKIE) : null;
        if (isLang(ls)) return { lang: ls, chosen: true };
        return { lang: 'bm' as Lang, chosen: false }; // Malay-first until asked
    })();

    const [lang, setLangState] = useState<Lang>(initial.lang);
    const [chosen, setChosen] = useState(initial.chosen);

    const setLang = (l: Lang) => {
        localStorage.setItem(COOKIE, l);
        writeCookie(l);
        setLangState(l);
        setChosen(true);
        if (typeof document !== 'undefined') document.documentElement.lang = LOCALE[l];
    };

    // Kept for the few callers that just want the next language.
    const toggle = () => {
        const i = LANGS.findIndex((x) => x.id === lang);
        setLang(LANGS[(i + 1) % LANGS.length].id);
    };

    return <Ctx.Provider value={{ lang, setLang, toggle, chosen }}>{children}</Ctx.Provider>;
}

export function useLang() {
    return useContext(Ctx);
}

/**
 * Read a copy dictionary for the active language.
 *
 * Falls back zh → en → bm rather than returning undefined, so a screen whose
 * Chinese strings have not been written yet renders in English instead of
 * crashing on `C.title`. Malay is required; the others are optional.
 */
export function dict<T>(d: { bm: T; en?: T; zh?: T }, lang: Lang): T {
    return d[lang] ?? d.en ?? d.bm;
}

/** Pick from a { bm, en } pair. Usage: const c = pick(lang, COPY) */
export function pick<T>(lang: Lang, pair: { bm: T; en?: T; zh?: T }): T {
    return dict(pair, lang);
}
