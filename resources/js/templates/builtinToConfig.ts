// ============================================================
// Built-in template  →  full no-code CustomTemplateConfig.
//
// The 42 premade designs are hand-coded React components, not config-driven.
// When an admin COPIES a premade to customise it, we translate it into a
// complete CustomTemplateConfig so the copy is fully editable in the Designer
// (Theme / Background / Cover / Effect / Decoration / Sections / Details) with
// the SAME colours and a matching style — a faithful, fully-customisable start,
// not a pixel clone (the no-code engine and the hand-coded component differ).
// ============================================================

import { artFor } from './templateArt';
import { parseColor, toHex, luminance, readablePalette } from '../lib/contrast';
import {
    normalizeConfig,
    type CustomTemplateConfig, type CoverReveal, type AmbientEffect, type DecorationStyle,
} from './customConfig';
import type { Palette } from './types';

/** Blend two hex colours: t=0 → a, t=1 → b. */
function mixHex(a: string, b: string, t: number): string {
    const ca = parseColor(a); const cb = parseColor(b);
    if (!ca || !cb) return a;
    const m = (x: number, y: number) => Math.round(x + (y - x) * t);
    return toHex({ r: m(ca.r, cb.r), g: m(ca.g, cb.g), b: m(ca.b, cb.b) });
}

function isDark(hex: string): boolean {
    const c = parseColor(hex);
    return c ? luminance(c) < 0.4 : false;
}

/** Cover entrance, from the design's key (most specific) then its art reveal. */
const KEY_COVER: Record<string, CoverReveal> = {
    curtain: 'curtain', tirai: 'curtain', pelamin: 'curtain',
    sampul: 'envelope', batik: 'envelope',
};
const REVEAL_COVER: Record<string, CoverReveal> = {
    drape: 'curtain', unfold: 'envelope', shimmer: 'zoom', bloom: 'plain', rise: 'plain', fade: 'plain',
};

/** Ambient effect, from the design's Lottie motion then its category. */
function effectFor(motion: string | null | undefined, category?: string | null): AmbientEffect {
    switch (motion) {
        case 'flowers.json': return 'petals';
        case 'cherry-blossom.json': return 'sakura';
        case 'confetti.json': return 'confetti';
        case 'sparkle-stars.json': return (category === 'celestial' || category === 'luxe') ? 'stars' : 'sparkles';
    }
    switch (category) {
        case 'floral': return 'petals';
        case 'celestial': return 'stars';
        case 'chinese': return 'sparkles';
        case 'motion': return 'sparkles';
        default: return 'none';
    }
}

/** Side / corner decoration, from the design's ornament then its category. */
const ORNAMENT_DECO: Record<string, DecorationStyle> = {
    floralCorner: 'floralCorners',
    geometricLattice: 'geometric',
    halo: 'ovalFrame',
    songketWeave: 'geometric',
    batikParang: 'moroccan',
    awanLarat: 'arch',
    pucukRebung: 'arch',
    divider: 'none',
};
function decoFor(ornament: string | null | undefined, category?: string | null): DecorationStyle {
    if (category === 'chinese') return 'doubleHappiness';
    if (ornament && ORNAMENT_DECO[ornament]) return ORNAMENT_DECO[ornament];
    switch (category) {
        case 'floral': return 'floralCorners';
        case 'songket': case 'batik': return 'geometric';
        case 'khat': return 'arch';
        case 'luxe': return 'goldFrame';
        default: return 'cornerFloral';
    }
}

/**
 * Translate a built-in template into a complete, editable config.
 * `rowPalette` is the template row's palette override (wins over the art palette),
 * exactly as the live card resolves colours.
 */
export function builtinToConfig(
    baseKey: string,
    rowPalette?: Record<string, string> | null,
    category?: string | null,
): CustomTemplateConfig {
    const art = artFor(baseKey);
    const palette = readablePalette({
        ...(art?.palette ?? {}),
        ...(rowPalette ?? {}),
    } as Palette) as Palette;

    const dark = isDark(palette.bg);
    const cover = KEY_COVER[baseKey] ?? (art ? REVEAL_COVER[art.reveal] : 'plain');

    return normalizeConfig({
        palette,
        heading: 'serif',
        // A subtle full-card gradient off the design's ground — deeper on a dark
        // card, a soft primary tint on a light one — so the copy reads rich, not flat.
        background: {
            type: 'gradient',
            color: palette.bg,
            color2: dark ? mixHex(palette.bg, '#000000', 0.45) : mixHex(palette.bg, palette.primary, 0.12),
            angle: 160,
        },
        cover: { reveal: cover ?? 'plain', accentColor: palette.accent },
        effect: { type: effectFor(art?.motion, category), color: palette.accent, density: 12 },
        decoration: { style: decoFor(art?.ornament, category), color: palette.accent },
        motion: 'calm',
    });
}
