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

/** CSS `background-image` recipes. Layered under the template's own painting. */
export function textureCss(texture: TextureKey, accent: string, bg: string): string | undefined {
    const a = (o: number) => hexA(accent, o);
    switch (texture) {
        case 'paper':
            return `radial-gradient(circle at 20% 15%, ${a(0.05)} 0, transparent 45%),
                    radial-gradient(circle at 82% 70%, ${a(0.04)} 0, transparent 40%)`;
        case 'linen':
            return `repeating-linear-gradient(90deg, ${a(0.035)} 0 1px, transparent 1px 4px),
                    repeating-linear-gradient(0deg, ${a(0.03)} 0 1px, transparent 1px 4px)`;
        case 'silk':
            return `linear-gradient(115deg, ${a(0.09)} 0%, transparent 28%, ${a(0.05)} 52%, transparent 74%, ${a(0.08)} 100%)`;
        case 'marble':
            return `radial-gradient(ellipse 60% 30% at 25% 20%, ${a(0.07)} 0, transparent 60%),
                    radial-gradient(ellipse 50% 24% at 75% 62%, ${a(0.05)} 0, transparent 55%),
                    linear-gradient(160deg, transparent 40%, ${a(0.035)} 50%, transparent 60%)`;
        case 'nightSky':
            return `radial-gradient(ellipse 70% 45% at 50% 0%, ${a(0.16)} 0, transparent 70%),
                    radial-gradient(circle at 82% 24%, ${a(0.1)} 0, transparent 32%)`;
        case 'velvet':
            return `radial-gradient(ellipse 80% 55% at 50% 0%, ${a(0.13)} 0, transparent 68%),
                    linear-gradient(180deg, transparent 55%, ${hexA(bg, 0.55)} 100%)`;
        case 'wash':
            return `radial-gradient(ellipse 65% 40% at 12% 8%, ${a(0.1)} 0, transparent 62%),
                    radial-gradient(ellipse 55% 38% at 88% 78%, ${a(0.08)} 0, transparent 58%)`;
        case 'kraft':
            return `repeating-linear-gradient(42deg, ${a(0.03)} 0 2px, transparent 2px 7px),
                    radial-gradient(circle at 70% 30%, ${a(0.05)} 0, transparent 50%)`;
        case 'tile':
            return `repeating-conic-gradient(from 45deg at 50% 50%, ${a(0.05)} 0deg 90deg, transparent 90deg 180deg)`;
        default:
            return undefined;
    }
}

/** Background-size to pair with the texture, so tiles read at the right scale. */
export function textureSize(texture: TextureKey): string | undefined {
    if (texture === 'linen' || texture === 'kraft') return '6px 6px';
    if (texture === 'tile') return '72px 72px';
    return undefined;
}

/** Entrance timing per personality — the difference between designs that feel alike. */
export const REVEAL_TIMING: Record<RevealKey, { duration: number; stagger: number; ease: [number, number, number, number]; y: number }> = {
    bloom: { duration: 1.05, stagger: 0.09, ease: [0.16, 1, 0.3, 1], y: 22 },
    rise: { duration: 0.72, stagger: 0.06, ease: [0.22, 1, 0.36, 1], y: 34 },
    drape: { duration: 1.25, stagger: 0.12, ease: [0.65, 0, 0.35, 1], y: 14 },
    fade: { duration: 0.85, stagger: 0.05, ease: [0.4, 0, 0.2, 1], y: 8 },
    unfold: { duration: 1.1, stagger: 0.1, ease: [0.34, 1.2, 0.44, 1], y: 26 },
    shimmer: { duration: 1.35, stagger: 0.14, ease: [0.16, 1, 0.3, 1], y: 18 },
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
