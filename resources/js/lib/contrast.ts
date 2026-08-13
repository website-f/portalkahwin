/**
 * Keeping card text readable, whatever palette it lands on.
 *
 * A wedding palette is chosen for mood, not legibility: gold on cream is the
 * house style of the whole category, and it measures around 2:1 — far below the
 * 4.5:1 WCAG asks of body text. An audit of the shipped palettes found 13 of 20
 * failing, which is why some cards were genuinely hard to read.
 *
 * Rather than repaint every template by hand (and lose the fix the moment a
 * host picks their own colours), the palette is corrected on its way into the
 * templates: the hue is kept, the lightness is walked until it clears the bar.
 */

export interface Rgb { r: number; g: number; b: number }

/** WCAG AA: body text. */
export const AA_TEXT = 4.5;
/** WCAG AA: text at 18.66px bold / 24px regular, and decorative labels. */
export const AA_LARGE = 3;

export function parseColor(input: string): Rgb | null {
    const s = input.trim();

    const hex = s.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (hex) {
        const h = hex[1].length === 3 ? hex[1].split('').map((c) => c + c).join('') : hex[1];
        return {
            r: parseInt(h.slice(0, 2), 16),
            g: parseInt(h.slice(2, 4), 16),
            b: parseInt(h.slice(4, 6), 16),
        };
    }

    const rgb = s.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
    if (rgb) return { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]) };

    return null;
}

export const toHex = ({ r, g, b }: Rgb): string =>
    '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');

const channel = (c: number): number => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

export function luminance(c: Rgb): number {
    return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
}

/** WCAG contrast ratio, 1 (identical) to 21 (black on white). */
export function contrastRatio(a: string, b: string): number {
    const ca = parseColor(a);
    const cb = parseColor(b);
    if (!ca || !cb) return 21; // unparseable: assume fine rather than mangle it
    const la = luminance(ca);
    const lb = luminance(cb);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Move a colour towards black (or white) by `amount`, 0..1. */
function shift(c: Rgb, towards: 'dark' | 'light', amount: number): Rgb {
    const target = towards === 'dark' ? 0 : 255;
    return {
        r: c.r + (target - c.r) * amount,
        g: c.g + (target - c.g) * amount,
        b: c.b + (target - c.b) * amount,
    };
}

/**
 * Return `fg` if it already reads on `bg`, otherwise the nearest version of it
 * that does.
 *
 * Darkens on a light background and lightens on a dark one, in small steps, so
 * the result stays recognisably the colour the designer picked — gold stays
 * gold, it just stops being the same brightness as the paper behind it.
 * Returns the original when nothing in range clears the bar, since an
 * unreadable brand colour beats a black smudge.
 */
export function ensureReadable(fg: string, bg: string, min: number = AA_TEXT): string {
    if (contrastRatio(fg, bg) >= min) return fg;

    const from = parseColor(fg);
    const back = parseColor(bg);
    if (!from || !back) return fg;

    // Push away from the background: darker text on light paper, lighter on dark.
    const towards: 'dark' | 'light' = luminance(back) > 0.35 ? 'dark' : 'light';

    for (let step = 1; step <= 20; step++) {
        const candidate = toHex(shift(from, towards, step / 20));
        if (contrastRatio(candidate, bg) >= min) return candidate;
    }

    return fg;
}

export interface CardPalette {
    primary?: string;
    secondary?: string;
    accent?: string;
    bg?: string;
    text?: string;
}

/**
 * Correct a card palette so every colour that carries words is readable on the
 * card's own background.
 *
 * Applied at the data boundary, so all 21 templates, every host-customised
 * palette and every contributed design are covered by one pass.
 *
 * `accent` is held to the large-text bar rather than the body-text one: it is
 * mostly eyebrow labels, rules and ornament, and forcing it to 4.5 turns every
 * gold in the product to bronze.
 */
export function readablePalette<T extends CardPalette | undefined | null>(palette: T): T {
    if (!palette || !palette.bg) return palette;

    const bg = palette.bg;

    return {
        ...palette,
        primary: palette.primary ? ensureReadable(palette.primary, bg, AA_LARGE) : palette.primary,
        secondary: palette.secondary ? ensureReadable(palette.secondary, bg, AA_TEXT) : palette.secondary,
        text: palette.text ? ensureReadable(palette.text, bg, AA_TEXT) : palette.text,
        accent: palette.accent ? ensureReadable(palette.accent, bg, AA_LARGE) : palette.accent,
    } as T;
}
