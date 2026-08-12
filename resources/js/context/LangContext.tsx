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
}

const Ctx = createContext<LangCtx>(null as unknown as LangCtx);

const isLang = (v: unknown): v is Lang => v === 'bm' || v === 'en' || v === 'zh';

export function LangProvider({ children }: { children: ReactNode }) {
    const [lang, setLangState] = useState<Lang>(() => {
        const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('pk_lang') : null;
        return isLang(saved) ? saved : 'bm'; // Malay-first
    });

    const setLang = (l: Lang) => {
        localStorage.setItem('pk_lang', l);
        setLangState(l);
        if (typeof document !== 'undefined') document.documentElement.lang = LOCALE[l];
    };

    // Kept for the few callers that just want the next language.
    const toggle = () => {
        const i = LANGS.findIndex((x) => x.id === lang);
        setLang(LANGS[(i + 1) % LANGS.length].id);
    };

    return <Ctx.Provider value={{ lang, setLang, toggle }}>{children}</Ctx.Provider>;
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
