import { LOCALE, type Lang } from '../context/LangContext';

/**
 * Locale-aware rendering of a card's date/time.
 *
 * Hosts type a display string ("Sabtu, 12 Disember 2026") which is Malay by
 * definition and cannot be translated. But cards also store real timestamps
 * (akad_at / reception_at), so when a guest switches language we reformat from
 * those and only fall back to the typed string when no timestamp exists.
 */

const parse = (iso?: string | null): Date | null => {
    if (!iso) return null;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
};

/** "Saturday, 12 December 2026" / "Sabtu, 12 Disember 2026" / "2026年12月12日星期六" */
export function formatCardDate(iso: string | null | undefined, lang: Lang, fallback?: string | null): string {
    const d = parse(iso);
    if (!d) return fallback ?? '';
    return new Intl.DateTimeFormat(LOCALE[lang], {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(d);
}

/** "12:00 pm" / "下午12:00" — falls back to the host's typed time label. */
export function formatCardTime(iso: string | null | undefined, lang: Lang, fallback?: string | null): string {
    const d = parse(iso);
    if (!d) return fallback ?? '';
    return new Intl.DateTimeFormat(LOCALE[lang], { hour: 'numeric', minute: '2-digit' }).format(d);
}

/** Short numeric form for compact spots, e.g. "12/12/2026". */
export function formatShortDate(iso: string | null | undefined, lang: Lang, fallback?: string | null): string {
    const d = parse(iso);
    if (!d) return fallback ?? '';
    return new Intl.DateTimeFormat(LOCALE[lang], { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
}
