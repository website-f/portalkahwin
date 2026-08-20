/**
 * Build a wa.me link from a human-typed phone number.
 *
 * wa.me wants digits only in full international form (no +, spaces or dashes).
 * Malaysian numbers are usually stored local ("010 - 306 5978"), so a leading
 * 0 is rewritten to the 60 country code. A number the admin already typed in
 * international form (starting with its country code) is left as-is.
 */
export function waNumber(raw?: string | null): string {
    if (!raw) return '';
    let d = raw.replace(/\D/g, '');
    if (!d) return '';
    if (d.startsWith('0')) d = '60' + d.slice(1);
    return d;
}

/** A full https://wa.me/<number> link, optionally with a pre-filled message. */
export function waLink(raw: string | null | undefined, text?: string): string {
    const n = waNumber(raw);
    const base = `https://wa.me/${n}`;
    return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
