import { createContext, useContext, useState, type ReactNode } from 'react';

export type Lang = 'bm' | 'en';

interface LangCtx {
    lang: Lang;
    setLang: (l: Lang) => void;
    toggle: () => void;
}

const Ctx = createContext<LangCtx>(null as unknown as LangCtx);

export function LangProvider({ children }: { children: ReactNode }) {
    const [lang, setLangState] = useState<Lang>(() => {
        const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('pk_lang') : null;
        return saved === 'en' ? 'en' : 'bm'; // Malay-first
    });

    const setLang = (l: Lang) => {
        localStorage.setItem('pk_lang', l);
        setLangState(l);
    };

    return (
        <Ctx.Provider value={{ lang, setLang, toggle: () => setLang(lang === 'bm' ? 'en' : 'bm') }}>
            {children}
        </Ctx.Provider>
    );
}

export function useLang() {
    return useContext(Ctx);
}

/** Pick from a { bm, en } pair. Usage: const c = pick(lang, COPY) */
export function pick<T>(lang: Lang, pair: { bm: T; en: T }): T {
    return pair[lang];
}
