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

/* ---------------------------------------------------------------------------
 * Run-of-show times
 * ------------------------------------------------------------------------- */

/**
 * Parse whatever a host has typed into an `<input type="time">` value.
 *
 * The run of show used to be free text — "11:00 pagi", "1.30 petang", "11am" —
 * so a plain time input would have shown those rows blank and quietly discarded
 * them on the next save. Anything recognisable is converted; anything else
 * returns null and stays a text field.
 */
export function toTimeInputValue(raw: string | null | undefined): string | null {
    const v = (raw ?? '').trim().toLowerCase();
    if (!v) return '';

    const m = v.match(/^(\d{1,2})\s*[:.]?\s*(\d{2})?/);
    if (!m) return null;

    let h = Number(m[1]);
    const min = Number(m[2] ?? 0);
    if (!Number.isFinite(h) || h > 23 || min > 59) return null;

    // Malay and English meridiems both appear in existing cards.
    const pm = /petang|malam|pm/.test(v);
    const am = /pagi|am/.test(v);
    const noon = /tengah hari/.test(v);
    const midnight = /tengah malam/.test(v);

    if (noon) h = 12;
    else if (midnight) h = 0;
    else if (pm && h < 12) h += 12;
    else if (am && h === 12) h = 0;

    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/**
 * Render an `HH:MM` run-of-show time the way a card should read it.
 *
 * Malay does not use am/pm — it names the part of the day — so this cannot be
 * left to Intl. A value that is not `HH:MM` is a legacy hand-typed string and
 * is passed through untouched.
 */
export function formatProgramTime(raw: string | null | undefined, lang: Lang): string {
    const v = (raw ?? '').trim();
    const m = v.match(/^(\d{2}):(\d{2})$/);
    if (!m) return v;

    const h = Number(m[1]);
    const min = m[2];

    if (lang === 'bm') {
        // 12:00 is "tengah hari", 00:00 "tengah malam"; the rest take the part
        // of the day a Malaysian reader expects.
        const hour12 = h % 12 === 0 ? 12 : h % 12;
        const part =
            h === 12 ? 'tengah hari'
                : h === 0 ? 'tengah malam'
                    : h < 12 ? 'pagi'
                        : h < 19 ? 'petang'
                            : 'malam';
        return `${hour12}:${min} ${part}`;
    }

    const d = new Date(2000, 0, 1, h, Number(min));
    return new Intl.DateTimeFormat(LOCALE[lang], { hour: 'numeric', minute: '2-digit' }).format(d);
}

/* ---------------------------------------------------------------------------
 * Hijri (Umm al-Qura)
 * ------------------------------------------------------------------------- */

/**
 * Month names per language.
 *
 * Intl can format the Hijri calendar natively, but it returns academic
 * transliterations — "Rabiʻ I", "Jumada II", "Dhuʻl-Hijjah". Malaysian wedding
 * cards use the local spellings, so the month number is taken from Intl and the
 * name from here.
 */
const HIJRI_MONTHS: Record<Lang, string[]> = {
    bm: [
        'Muharram', 'Safar', 'Rabiulawal', 'Rabiulakhir', 'Jamadilawal', 'Jamadilakhir',
        'Rejab', 'Syaaban', 'Ramadan', 'Syawal', 'Zulkaedah', 'Zulhijjah',
    ],
    en: [
        'Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani', 'Jumada al-Ula', 'Jumada al-Akhirah',
        'Rajab', 'Shaban', 'Ramadan', 'Shawwal', 'Dhul-Qadah', 'Dhul-Hijjah',
    ],
    zh: [
        '穆哈兰姆月', '色法尔月', '赖比尔一月', '赖比尔二月', '主马达一月', '主马达二月',
        '赖哲卜月', '舍尔邦月', '赖买丹月', '闪瓦鲁月', '都尔喀尔德月', '都尔黑哲月',
    ],
};

/** Numeric Hijri parts for a date, via the Umm al-Qura calendar. */
function hijriParts(d: Date): { day: number; month: number; year: number } | null {
    try {
        const parts = new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', {
            day: 'numeric', month: 'numeric', year: 'numeric',
        }).formatToParts(d);
        const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
        const day = get('day');
        const month = get('month');
        const year = get('year');
        if (!day || !month || !year) return null;
        return { day, month, year };
    } catch {
        // Very old engines without the islamic-umalqura calendar.
        return null;
    }
}

/**
 * "22 Jamadilakhir 1448H" — the Hijri companion line on a wedding card.
 *
 * Returns the host's own typed label when one exists (they may have a specific
 * reading they want), and an empty string when neither is available, so callers
 * can simply omit the line rather than print something wrong.
 */
export function formatHijri(iso: string | null | undefined, lang: Lang, fallback?: string | null): string {
    if (fallback) return fallback;
    const d = parse(iso);
    if (!d) return '';
    const h = hijriParts(d);
    if (!h) return '';
    const name = HIJRI_MONTHS[lang][h.month - 1] ?? String(h.month);
    return lang === 'zh'
        ? `伊斯兰历 ${h.year} 年 ${name} ${h.day} 日`
        : `${h.day} ${name} ${h.year}H`;
}
