// ============================================================
//  Art direction, one entry per design.
//
//  The catalogue had a sameness problem with a measurable cause: nine of the
//  twenty palettes used the same gold (#d4af37 / #c9a24b) on a near-white or
//  near-black ground. Different fonts, same card.
//
//  This table gives every design its own colour story, its own ornament, its
//  own ground texture and its own motion personality. It is applied at the data
//  boundary — the same seam the font, section order and contrast fixes use — so
//  all 21 templates change without 21 edits, and a host's own palette still
//  wins over ours.
//
//  Budget, because a card is opened on a phone at a venue:
//   • textures are CSS gradients — 0 bytes
//   • ornaments are inline SVG — 2-8 KB, and they recolour
//   • at most ONE Lottie per design, lazy, off under reduced-motion
// ============================================================

import type { OrnamentKey } from './ornaments';

/** Ground textures. Pure CSS — cost nothing, never block paint. */
export type TextureKey =
    | 'none' | 'paper' | 'linen' | 'silk' | 'marble'
    | 'nightSky' | 'velvet' | 'wash' | 'kraft' | 'tile';

/** How a design introduces itself. Drives easing and stagger, not layout. */
export type RevealKey = 'bloom' | 'rise' | 'drape' | 'fade' | 'unfold' | 'shimmer';

export interface TemplateArt {
    /**
     * A few designs read `primary` as the page ground and `bg` as the card
     * surface — the inverse of the rest. Their palette is authored in that
     * convention, and contrast is checked against `bg` as the surface.
     */
    groundIsPrimary?: boolean;
    /** Refined palette. A host's own choice overrides this. */
    palette: { primary: string; secondary: string; accent: string; bg: string; text: string };
    /** Ground treatment behind everything. */
    texture: TextureKey;
    /** Corner / border ornament, drawn from the palette. */
    ornament: OrnamentKey | null;
    /** Second ornament, used as a band or divider. */
    ornamentAlt?: OrnamentKey;
    /** Entrance personality. */
    reveal: RevealKey;
    /** Lottie file in public/lottie, or null for a still card. */
    motion: string | null;
    /** Playback speed — wedding cards want drift, not energy. */
    motionSpeed: number;
    /** How present the motion is. Text sits over this. */
    motionOpacity: number;
    /** Retint the animation onto the palette. Off when its own colours are the point. */
    motionTint: boolean;
}

/**
 * Palettes are chosen so that no two neighbouring designs in the gallery share
 * a colour story, and every one clears WCAG once `readablePalette` has run.
 */
export const TEMPLATE_ART: Record<string, TemplateArt> = {
    /* ---------- Floral: botanical, soft, no gold ---------- */
    floral: {
        palette: { primary: '#4a5c43', secondary: '#5f6e57', accent: '#b9756b', bg: '#f7f4ed', text: '#3d4438' },
        texture: 'paper', ornament: 'floralCorner', ornamentAlt: 'divider',
        reveal: 'bloom', motion: 'flowers.json', motionSpeed: 0.45, motionOpacity: 0.4, motionTint: true,
    },
    bungaraya: {
        palette: { primary: '#8c1c26', secondary: '#a8474a', accent: '#c8642f', bg: '#fdf6ef', text: '#4a2320' },
        texture: 'wash', ornament: 'floralCorner', ornamentAlt: 'awanLarat',
        reveal: 'bloom', motion: 'flowers.json', motionSpeed: 0.5, motionOpacity: 0.32, motionTint: true,
    },
    greenery: {
        palette: { primary: '#28453a', secondary: '#4d6b57', accent: '#7d9464', bg: '#f3f6f1', text: '#2c3b32' },
        texture: 'linen', ornament: 'floralCorner', ornamentAlt: 'divider',
        reveal: 'rise', motion: 'sparkle-stars.json', motionSpeed: 0.3, motionOpacity: 0.2, motionTint: true,
    },
    pastel: {
        palette: { primary: '#6d5b7d', secondary: '#736180', accent: '#c07a8f', bg: '#faf5f8', text: '#4e4356' },
        texture: 'wash', ornament: 'floralCorner', ornamentAlt: 'divider',
        reveal: 'bloom', motion: 'cherry-blossom.json', motionSpeed: 0.5, motionOpacity: 0.38, motionTint: false,
    },
    boho: {
        palette: { primary: '#8a4526', secondary: '#7b5d3f', accent: '#b07f3f', bg: '#f6ece0', text: '#4c3524' },
        texture: 'kraft', ornament: 'floralCorner', ornamentAlt: 'awanLarat',
        reveal: 'rise', motion: null, motionSpeed: 1, motionOpacity: 0.3, motionTint: true,
    },

    /* ---------- Motion: cinematic ---------- */
    curtain: {
        palette: { primary: '#f3e5c0', secondary: '#c9a961', accent: '#d9b45c', bg: '#120d14', text: '#ece2d0' },
        texture: 'velvet', ornament: 'halo', ornamentAlt: 'divider',
        reveal: 'drape', motion: 'sparkle-stars.json', motionSpeed: 0.5, motionOpacity: 0.5, motionTint: true,
    },
    tirai: {
        palette: { primary: '#6b2440', secondary: '#8a4a63', accent: '#b06a86', bg: '#fbf1f4', text: '#4a2434' },
        texture: 'silk', ornament: 'halo', ornamentAlt: 'divider',
        reveal: 'drape', motion: 'flowers.json', motionSpeed: 0.4, motionOpacity: 0.3, motionTint: true,
    },

    /* ---------- Khat & Islamic geometry ---------- */
    khat: {
        palette: { primary: '#f2ecd4', secondary: '#c7b98a', accent: '#cfa94a', bg: '#0d3b2e', text: '#e8f0e6' },
        texture: 'silk', ornament: 'geometricLattice', ornamentAlt: 'awanLarat',
        reveal: 'shimmer', motion: 'sparkle-stars.json', motionSpeed: 0.35, motionOpacity: 0.34, motionTint: true,
    },
    seri: {
        palette: { primary: '#f0ead2', secondary: '#bcae86', accent: '#d0a24a', bg: '#123f46', text: '#e6efee' },
        texture: 'silk', ornament: 'geometricLattice', ornamentAlt: 'pucukRebung',
        reveal: 'shimmer', motion: null, motionSpeed: 1, motionOpacity: 0.3, motionTint: true,
    },

    /* ---------- Malay textile ---------- */
    songket: {
        // Inverted contract: `primary` is the maroon ground, `bg` the cream surface.
        groundIsPrimary: true,
        palette: { primary: '#54121d', secondary: '#8a4a3a', accent: '#b07a1e', bg: '#f7ecd6', text: '#43241f' },
        texture: 'silk', ornament: 'songketWeave', ornamentAlt: 'pucukRebung',
        reveal: 'unfold', motion: 'sparkle-stars.json', motionSpeed: 0.3, motionOpacity: 0.26, motionTint: true,
    },
    batik: {
        // Inverted contract, as Songket.
        groundIsPrimary: true,
        palette: { primary: '#1b2c45', secondary: '#5a6a80', accent: '#d08a4a', bg: '#f4efe2', text: '#2c3446' },
        texture: 'linen', ornament: 'batikParang', ornamentAlt: 'awanLarat',
        reveal: 'unfold', motion: 'envelope.json', motionSpeed: 0.7, motionOpacity: 0.5, motionTint: true,
    },
    pelamin: {
        palette: { primary: '#efd08a', secondary: '#c9a267', accent: '#d8a0c0', bg: '#2a1236', text: '#ede3ef' },
        texture: 'velvet', ornament: 'awanLarat', ornamentAlt: 'pucukRebung',
        reveal: 'drape', motion: 'sparkle-stars.json', motionSpeed: 0.4, motionOpacity: 0.4, motionTint: true,
    },
    peranakan: {
        palette: { primary: '#f4b23f', secondary: '#f0a988', accent: '#4bb3a8', bg: '#0c4f4d', text: '#f0efe4' },
        texture: 'tile', ornament: 'batikParang', ornamentAlt: 'divider',
        reveal: 'unfold', motion: null, motionSpeed: 1, motionOpacity: 0.3, motionTint: true,
    },

    /* ---------- Modern ---------- */
    minimalis: {
        palette: { primary: '#1e1e22', secondary: '#5a5a62', accent: '#8a7d5a', bg: '#fbfaf8', text: '#2c2c31' },
        texture: 'none', ornament: 'divider', reveal: 'fade',
        motion: null, motionSpeed: 1, motionOpacity: 0.3, motionTint: true,
    },
    typografi: {
        palette: { primary: '#121212', secondary: '#4d4d4d', accent: '#b8442c', bg: '#f8f6f2', text: '#1c1c1c' },
        texture: 'none', ornament: 'divider', reveal: 'rise',
        motion: 'confetti.json', motionSpeed: 0.55, motionOpacity: 0.3, motionTint: true,
    },
    sampul: {
        palette: { primary: '#4f4128', secondary: '#7a6a4c', accent: '#a8763c', bg: '#f5efe2', text: '#413526' },
        texture: 'paper', ornament: 'awanLarat', ornamentAlt: 'divider',
        // An envelope design earns the envelope animation.
        reveal: 'unfold', motion: 'love-letter.json', motionSpeed: 0.7, motionOpacity: 0.55, motionTint: true,
    },
    kraf: {
        palette: { primary: '#413324', secondary: '#6d5b41', accent: '#6b7d4a', bg: '#efe6d5', text: '#3b3125' },
        texture: 'kraft', ornament: 'floralCorner', ornamentAlt: 'divider',
        reveal: 'rise', motion: null, motionSpeed: 1, motionOpacity: 0.3, motionTint: true,
    },

    /* ---------- Luxe ---------- */
    marble: {
        palette: { primary: '#26251f', secondary: '#5c584d', accent: '#96783f', bg: '#f6f5f2', text: '#2b2a25' },
        texture: 'marble', ornament: 'geometricLattice', ornamentAlt: 'divider',
        reveal: 'fade', motion: null, motionSpeed: 1, motionOpacity: 0.3, motionTint: true,
    },
    artdeco: {
        palette: { primary: '#e9d49a', secondary: '#b99a5e', accent: '#cbb173', bg: '#0d0d0f', text: '#e8e3d6' },
        texture: 'velvet', ornament: 'geometricLattice', ornamentAlt: 'divider',
        reveal: 'shimmer', motion: 'sparkle-stars.json', motionSpeed: 0.45, motionOpacity: 0.42, motionTint: true,
    },
    celestial: {
        palette: { primary: '#efd68f', secondary: '#8fa3cc', accent: '#c3a6e0', bg: '#080d20', text: '#e4e8f5' },
        texture: 'nightSky', ornament: 'halo', ornamentAlt: 'divider',
        reveal: 'shimmer', motion: 'sparkle-stars.json', motionSpeed: 0.3, motionOpacity: 0.55, motionTint: false,
    },
};

/**
 * CSS `background-image` recipes — the ground each design sits on. Layered under
 * the template's own painting, pure gradients (0 bytes, painted once to a fixed
 * layer, never re-painted on scroll), richer than a flat wash so a card reads as
 * a material — silk, marble, a night sky — not a coloured rectangle.
 */
export function textureCss(texture: TextureKey, accent: string, bg: string): string | undefined {
    const a = (o: number) => hexA(accent, o);
    switch (texture) {
        case 'paper':
            // Soft foxing stains over a barely-there fibre grain.
            return `radial-gradient(circle at 18% 12%, ${a(0.06)} 0, transparent 42%),
                    radial-gradient(circle at 84% 66%, ${a(0.05)} 0, transparent 40%),
                    radial-gradient(circle at 58% 94%, ${a(0.04)} 0, transparent 46%)`;
        case 'linen':
            // Tight over-and-under weave — two crossed thread grids.
            return `repeating-linear-gradient(90deg, ${a(0.055)} 0 1px, transparent 1px 5px),
                    repeating-linear-gradient(0deg, ${a(0.05)} 0 1px, transparent 1px 5px)`;
        case 'silk':
            // Crossing sheen bands, so light seems to travel across the weave.
            return `linear-gradient(115deg, ${a(0.13)} 0%, transparent 26%, ${a(0.07)} 50%, transparent 74%, ${a(0.11)} 100%),
                    linear-gradient(245deg, ${a(0.06)} 0%, transparent 42%, ${a(0.05)} 100%)`;
        case 'marble':
            // Two soft pools plus crossing veins.
            return `radial-gradient(ellipse 60% 30% at 22% 18%, ${a(0.09)} 0, transparent 60%),
                    radial-gradient(ellipse 50% 24% at 78% 60%, ${a(0.07)} 0, transparent 55%),
                    linear-gradient(150deg, transparent 38%, ${a(0.05)} 50%, transparent 62%),
                    linear-gradient(28deg, transparent 62%, ${a(0.035)} 72%, transparent 82%)`;
        case 'nightSky':
            // A crown of aurora and a scattering of fixed stars.
            return `radial-gradient(ellipse 78% 50% at 50% -6%, ${a(0.22)} 0, transparent 72%),
                    radial-gradient(circle at 84% 20%, ${a(0.12)} 0, transparent 30%),
                    radial-gradient(1.4px 1.4px at 12% 20%, ${a(0.75)} 50%, transparent 51%),
                    radial-gradient(1.4px 1.4px at 27% 44%, ${a(0.55)} 50%, transparent 51%),
                    radial-gradient(1px 1px at 45% 16%, ${a(0.6)} 50%, transparent 51%),
                    radial-gradient(1.6px 1.6px at 65% 33%, ${a(0.6)} 50%, transparent 51%),
                    radial-gradient(1px 1px at 88% 50%, ${a(0.5)} 50%, transparent 51%),
                    radial-gradient(1.4px 1.4px at 36% 68%, ${a(0.5)} 50%, transparent 51%),
                    radial-gradient(1px 1px at 72% 74%, ${a(0.5)} 50%, transparent 51%),
                    radial-gradient(1.3px 1.3px at 54% 88%, ${a(0.45)} 50%, transparent 51%)`;
        case 'velvet':
            // A deep top glow, a plush vertical nap, and a settled floor.
            return `radial-gradient(ellipse 82% 56% at 50% -2%, ${a(0.16)} 0, transparent 68%),
                    repeating-linear-gradient(90deg, ${a(0.022)} 0 2px, transparent 2px 6px),
                    linear-gradient(180deg, transparent 52%, ${hexA(bg, 0.6)} 100%)`;
        case 'wash':
            // Loose watercolour blooms, wet-into-wet.
            return `radial-gradient(ellipse 65% 42% at 10% 6%, ${a(0.14)} 0, transparent 60%),
                    radial-gradient(ellipse 55% 40% at 90% 76%, ${a(0.11)} 0, transparent 58%),
                    radial-gradient(ellipse 42% 32% at 54% 42%, ${a(0.06)} 0, transparent 60%)`;
        case 'kraft':
            // Crossed paper fibres — a warm hand-made grain.
            return `repeating-linear-gradient(42deg, ${a(0.045)} 0 1px, transparent 1px 6px),
                    repeating-linear-gradient(-42deg, ${a(0.03)} 0 1px, transparent 1px 6px)`;
        case 'tile':
            // Peranakan floor tile: a four-fold pinwheel with a centred boss.
            return `repeating-conic-gradient(from 45deg at 50% 50%, ${a(0.07)} 0deg 90deg, transparent 90deg 180deg),
                    radial-gradient(circle at 50% 50%, ${a(0.06)} 0 16%, transparent 18%)`;
        default:
            return undefined;
    }
}

/**
 * A VISIBLE, repeating decorative ground pattern for a template's OWN root
 * background (each template paints an opaque ground that hides the shared
 * atmosphere, so the pattern has to live in the template itself). Pure CSS
 * repeating-gradients — 0 bytes, they tile by their own period so they can be
 * appended straight onto a rootStyle `backgroundImage` with no background-size
 * juggling, and they sit in front of the existing wash.
 */
export function groundPattern(
    kind: 'diamond' | 'trellis' | 'grid' | 'weave' | 'stripe' | 'crosshatch',
    color: string,
    alpha = 0.05,
): string {
    const c = hexA(color, alpha);
    const cf = hexA(color, alpha * 0.7);
    switch (kind) {
        case 'diamond':
            return `repeating-linear-gradient(45deg, ${c} 0 1px, transparent 1px 27px), repeating-linear-gradient(-45deg, ${c} 0 1px, transparent 1px 27px)`;
        case 'trellis':
            return `repeating-linear-gradient(45deg, ${c} 0 1px, transparent 1px 18px), repeating-linear-gradient(-45deg, ${c} 0 1px, transparent 1px 18px)`;
        case 'grid':
            return `repeating-linear-gradient(0deg, ${c} 0 1px, transparent 1px 25px), repeating-linear-gradient(90deg, ${c} 0 1px, transparent 1px 25px)`;
        case 'weave':
            // Two-scale songket-style lattice: a bold diamond over a fine one.
            return `repeating-linear-gradient(45deg, ${c} 0 1px, transparent 1px 32px), repeating-linear-gradient(-45deg, ${c} 0 1px, transparent 1px 32px), repeating-linear-gradient(45deg, ${cf} 0 1px, transparent 1px 11px), repeating-linear-gradient(-45deg, ${cf} 0 1px, transparent 1px 11px)`;
        case 'crosshatch':
            return `repeating-linear-gradient(30deg, ${c} 0 1px, transparent 1px 9px), repeating-linear-gradient(-30deg, ${cf} 0 1px, transparent 1px 9px)`;
        case 'stripe':
            return `repeating-linear-gradient(90deg, ${c} 0 1px, transparent 1px 16px)`;
        default:
            return '';
    }
}

/** Background-size to pair with the texture, so tiles read at the right scale. */
export function textureSize(texture: TextureKey): string | undefined {
    if (texture === 'linen' || texture === 'kraft') return '6px 6px';
    if (texture === 'tile') return '72px 72px';
    return undefined;
}

/** Entrance timing per personality — the difference between designs that feel alike. */
/**
 * Every personality is a smooth fade + gentle rise — no spring, no overshoot, no
 * scale/blur "opening". They differ only in pace and travel so designs still feel
 * distinct, but nothing ever pops or bounces (which read as a "window opening").
 * All eases are monotonic decelerations (end at 1,1), so a card settles, never
 * springs past and snaps back.
 */
export const REVEAL_TIMING: Record<RevealKey, { duration: number; stagger: number; ease: [number, number, number, number]; y: number }> = {
    bloom: { duration: 0.9, stagger: 0.08, ease: [0.22, 1, 0.36, 1], y: 20 },
    rise: { duration: 0.72, stagger: 0.06, ease: [0.22, 1, 0.36, 1], y: 28 },
    drape: { duration: 0.9, stagger: 0.09, ease: [0.22, 1, 0.36, 1], y: 16 },
    fade: { duration: 0.8, stagger: 0.05, ease: [0.33, 0, 0.2, 1], y: 8 },
    unfold: { duration: 0.85, stagger: 0.08, ease: [0.22, 1, 0.36, 1], y: 22 },
    shimmer: { duration: 1.0, stagger: 0.1, ease: [0.22, 1, 0.36, 1], y: 16 },
};

export function hexA(hex: string, alpha: number): string {
    const m = hex.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (!m) return hex;
    const h = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1];
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const artFor = (key?: string | null): TemplateArt | null =>
    (key && TEMPLATE_ART[key]) || null;
