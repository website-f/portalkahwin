import { Globe } from 'lucide-react';
import { useLang, LANGS, type Lang } from '../context/LangContext';

/**
 * Language picker. A native <select> rather than a segmented toggle: with three
 * languages a toggle stops fitting, and a select gets correct keyboard and
 * screen-reader behaviour for free on every platform.
 *
 * The component keeps the LangToggle name so the four existing call sites
 * (SiteNav, AuthShell, AppLayout, AdminLayout) need no changes.
 */
export function LangToggle({ light, compact, block }: { light?: boolean; compact?: boolean; block?: boolean }) {
    const { lang, setLang } = useLang();

    return (
        <label className={`lang-select${light ? ' lang-select--light' : ''}${block ? ' lang-select--block' : ''}`}>
            <Globe size={14} aria-hidden="true" />
            <select
                value={lang}
                onChange={(e) => setLang(e.target.value as Lang)}
                aria-label="Language / Bahasa / 语言"
            >
                {LANGS.map((l) => (
                    <option key={l.id} value={l.id}>
                        {compact ? l.short : l.label}
                    </option>
                ))}
            </select>
        </label>
    );
}

/** Alias so new code can use the accurate name. */
export const LangSelect = LangToggle;
