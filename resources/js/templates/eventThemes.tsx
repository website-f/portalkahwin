// ============================================================
//  Event theme engine — genuinely distinct looks for event cards.
//
//  One EventPoster component renders MANY bespoke designs by reading a theme
//  spec (carried in the template's config as `eventTheme`). A theme controls the
//  ground (dark / light + texture + glows), ink, display font, hero layout, a
//  corner/edge motif and an ambient particle effect — so no two event templates
//  look alike, unlike the old palette-only approach. All CSS/inline-SVG, 0 net.
// ============================================================

import type { CSSProperties, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { hexA, groundPattern } from './templateArt';

export type EventGround = 'dark' | 'light';
export type EventMotifKey = 'neonGrid' | 'goldFrame' | 'floralCorners' | 'confetti' | 'geoArch' | 'sunRays' | 'marbleVeil' | 'none';
export type EventEffectKey = 'sparkles' | 'confetti' | 'petals' | 'dust' | 'bokeh' | 'balloons' | 'none';
export type EventHero = 'poster' | 'centered' | 'framed';

export type EventReveal = 'fade' | 'curtain' | 'door' | 'box';

export interface EventTheme {
    label: string;
    ground: EventGround;
    display: string;
    hero: EventHero;
    motif: EventMotifKey;
    effect: EventEffectKey;
    pattern: 'grid' | 'weave' | 'diamond' | 'trellis' | 'crosshatch' | 'none';
    glow: boolean;
    /** Opening reveal played after the guest taps the welcome gate. */
    reveal: EventReveal;
    /** Default palette — the template row's palette still overrides per-colour. */
    palette: { primary: string; secondary: string; accent: string; bg: string; text: string };
}

const DISPLAY_SANS = "'Archivo', 'Helvetica Neue', 'Segoe UI', sans-serif";
const DISPLAY_SERIF = "'Playfair Display', 'Cormorant Garamond', Georgia, serif";
const DISPLAY_ROUND = "'Baloo 2', 'Fredoka', 'Segoe UI', sans-serif";

/**
 * The theme library. Add a key here + reference it from EventTemplateSeeder to
 * get a brand-new distinct event design (no component work).
 */
export const EVENT_THEMES: Record<string, EventTheme> = {
    // Dark neon — concerts, music nights.
    neon: {
        label: 'Neon', ground: 'dark', display: DISPLAY_SANS, hero: 'poster', motif: 'neonGrid', effect: 'sparkles', pattern: 'grid', glow: true, reveal: 'box',
        palette: { primary: '#12061f', secondary: '#23d5ff', accent: '#ff3d81', bg: '#1b0b2e', text: '#f6f3fb' },
    },
    // Black + gold, marble sheen — galas, awards, corporate.
    gala: {
        label: 'Gala', ground: 'dark', display: DISPLAY_SERIF, hero: 'framed', motif: 'goldFrame', effect: 'dust', pattern: 'none', glow: false, reveal: 'curtain',
        palette: { primary: '#0e0e12', secondary: '#c9a24b', accent: '#e6c877', bg: '#15151b', text: '#f4efe2' },
    },
    // Light cream + botanical — garden parties, open house.
    bloom: {
        label: 'Bloom', ground: 'light', display: DISPLAY_SERIF, hero: 'centered', motif: 'floralCorners', effect: 'petals', pattern: 'none', glow: false, reveal: 'curtain',
        palette: { primary: '#3f5540', secondary: '#7d9464', accent: '#c98a63', bg: '#f6f1e7', text: '#3a352c' },
    },
    // Bright, playful — kids birthdays.
    pop: {
        label: 'Pop', ground: 'light', display: DISPLAY_ROUND, hero: 'centered', motif: 'confetti', effect: 'balloons', pattern: 'none', glow: false, reveal: 'box',
        palette: { primary: '#ff5aa7', secondary: '#5ad0ff', accent: '#ffb03a', bg: '#fff6fb', text: '#4a2b45' },
    },
    // Deep emerald + Islamic geometry — open house, aqiqah, majlis.
    geo: {
        label: 'Geometri', ground: 'dark', display: DISPLAY_SERIF, hero: 'framed', motif: 'geoArch', effect: 'sparkles', pattern: 'weave', glow: true, reveal: 'door',
        palette: { primary: '#0c3b30', secondary: '#cdae6a', accent: '#e2c079', bg: '#0f2c3a', text: '#eef3ec' },
    },
    // Warm sunset gradient — festivals, celebrations.
    sunset: {
        label: 'Sunset', ground: 'dark', display: DISPLAY_SANS, hero: 'poster', motif: 'sunRays', effect: 'bokeh', pattern: 'none', glow: true, reveal: 'fade',
        palette: { primary: '#3a0f2e', secondary: '#ff8a5c', accent: '#ffb347', bg: '#5a1738', text: '#fff2ea' },
    },
    // Soft blush + marble — elegant, minimal, engagements.
    marble: {
        label: 'Marble', ground: 'light', display: DISPLAY_SERIF, hero: 'framed', motif: 'marbleVeil', effect: 'dust', pattern: 'none', glow: false, reveal: 'curtain',
        palette: { primary: '#2b2a25', secondary: '#9a8b78', accent: '#b98a63', bg: '#f3efe9', text: '#332f2a' },
    },
    // Midnight minimal — launches, tech summits.
    noir: {
        label: 'Noir', ground: 'dark', display: DISPLAY_SANS, hero: 'poster', motif: 'none', effect: 'dust', pattern: 'crosshatch', glow: true, reveal: 'fade',
        palette: { primary: '#0a0a0c', secondary: '#8a8f98', accent: '#6ee7ff', bg: '#111318', text: '#eef1f5' },
    },
};

export const DEFAULT_EVENT_THEME = 'neon';

export interface ResolvedEventTheme {
    spec: EventTheme;
    lightGround: boolean;
    ground: string;
    ink: string;
    inkSoft: string;
    accent: string;
    accent2: string;
    display: string;
    surface: string;   // card/tile surface
    line: string;      // hairline border
    rootImage: string; // backgroundImage recipe
}

function parseHex(hex: string): { r: number; g: number; b: number } {
    let h = (hex || '').replace('#', '').trim();
    if (h.length === 3) h = h.split('').map((x) => x + x).join('');
    const n = parseInt(h || '111319', 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
const lum = (hex: string) => { const { r, g, b } = parseHex(hex); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
function mix(a: string, b: string, t: number): string {
    const A = parseHex(a), B = parseHex(b);
    const c = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
    return `#${c(A.r, B.r)}${c(A.g, B.g)}${c(A.b, B.b)}`;
}

/** Merge the row palette over the theme default, then derive render colours. */
export function resolveEventTheme(key: string | undefined, rowPalette?: Record<string, string> | null): ResolvedEventTheme {
    const spec = EVENT_THEMES[key ?? ''] ?? EVENT_THEMES[DEFAULT_EVENT_THEME];
    const p = { ...spec.palette, ...(rowPalette ?? {}) };
    const lightGround = spec.ground === 'light';

    // Ground: darker of primary/bg for dark themes; the light bg for light themes.
    const ground = lightGround
        ? (lum(p.bg) > 0.7 ? p.bg : '#f6f1e7')
        : (lum(p.primary) <= lum(p.bg) ? p.primary : p.bg);

    const ink = lightGround ? (lum(p.text) < 0.5 ? p.text : '#2c2a33') : '#f6f3fb';
    const accent = p.accent;
    const accent2 = p.secondary;
    const inkSoft = hexA(ink, lightGround ? 0.62 : 0.72);
    const surface = lightGround ? hexA('#ffffff', 0.6) : hexA('#ffffff', 0.05);
    const line = hexA(accent, lightGround ? 0.28 : 0.22);

    const pat = spec.pattern === 'none' ? '' : `${groundPattern(spec.pattern === 'grid' ? 'grid' : spec.pattern === 'weave' ? 'weave' : spec.pattern === 'diamond' ? 'diamond' : spec.pattern === 'trellis' ? 'trellis' : 'crosshatch', accent, lightGround ? 0.05 : 0.06)}, `;
    const glow = spec.glow
        ? `radial-gradient(900px 500px at 12% -6%, ${hexA(accent, lightGround ? 0.12 : 0.22)}, transparent 60%), radial-gradient(760px 460px at 92% 8%, ${hexA(accent2, lightGround ? 0.1 : 0.16)}, transparent 62%), `
        : '';
    const base = lightGround
        ? `linear-gradient(180deg, ${mix(ground, '#ffffff', 0.35)}, ${ground})`
        : `linear-gradient(180deg, ${mix(ground, '#ffffff', 0.04)}, ${mix(ground, '#000000', 0.28)})`;
    const rootImage = `${pat}${glow}${base}`;

    return { spec, lightGround, ground, ink, inkSoft, accent, accent2, display: spec.display, surface, line, rootImage };
}

/* ----------------------------- motifs ----------------------------- */

/** Corner / edge ornaments per motif — recolour from the accent. */
export function EventMotif({ motif, accent, accent2, ink }: { motif: EventMotifKey; accent: string; accent2: string; ink: string }): ReactNode {
    if (motif === 'none') return null;
    const corner: CSSProperties = { position: 'absolute', width: 120, height: 120, pointerEvents: 'none', opacity: 0.9 };
    switch (motif) {
        case 'goldFrame':
            return (
                <div aria-hidden style={{ position: 'absolute', inset: 14, border: `1px solid ${hexA(accent, 0.5)}`, borderRadius: 10, pointerEvents: 'none' }}>
                    <div style={{ position: 'absolute', inset: 6, border: `1px solid ${hexA(accent, 0.28)}`, borderRadius: 8 }} />
                </div>
            );
        case 'floralCorners': {
            const spray = (
                <>
                    <path d="M6 90 Q10 40 44 30 Q30 46 40 62 Q52 40 70 40 Q54 54 60 72 Q40 64 30 82 Q22 70 6 90Z" fill={hexA(accent, 0.5)} />
                    <circle cx="46" cy="30" r="6" fill={hexA(accent2, 0.7)} />
                    <circle cx="70" cy="40" r="5" fill={hexA(accent, 0.7)} />
                </>
            );
            return (
                <>
                    <svg aria-hidden viewBox="0 0 100 100" style={{ ...corner, top: 8, left: 8 }}>{spray}</svg>
                    <svg aria-hidden viewBox="0 0 100 100" style={{ ...corner, bottom: 8, right: 8, transform: 'scale(-1,-1)' }}>{spray}</svg>
                </>
            );
        }
        case 'geoArch':
            return (
                <svg aria-hidden viewBox="0 0 200 120" preserveAspectRatio="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, width: '100%', height: 150, pointerEvents: 'none', opacity: 0.4 }}>
                    <path d="M0 120 L0 60 Q100 -20 200 60 L200 120" fill="none" stroke={hexA(accent, 0.6)} strokeWidth="1.4" />
                    <path d="M20 120 L20 66 Q100 6 180 66 L180 120" fill="none" stroke={hexA(accent, 0.35)} strokeWidth="1" />
                </svg>
            );
        case 'sunRays':
            return (
                <div aria-hidden style={{ position: 'absolute', top: -140, left: '50%', width: 460, height: 460, transform: 'translateX(-50%)', pointerEvents: 'none', opacity: 0.5, background: `repeating-conic-gradient(from 0deg at 50% 50%, ${hexA(accent, 0.16)} 0deg 6deg, transparent 6deg 16deg)`, borderRadius: '50%', maskImage: 'radial-gradient(circle, #000 30%, transparent 70%)', WebkitMaskImage: 'radial-gradient(circle, #000 30%, transparent 70%)' }} />
            );
        case 'confetti':
            return (
                <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.9 }}>
                    {Array.from({ length: 14 }).map((_, i) => {
                        const cols = [accent, accent2, ink];
                        const x = (i * 37) % 100; const y = (i * 53) % 40;
                        return <span key={i} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, width: 8, height: 8, borderRadius: i % 3 ? 2 : '50%', background: cols[i % 3], transform: `rotate(${i * 40}deg)`, opacity: 0.8 }} />;
                    })}
                </div>
            );
        case 'neonGrid':
            return (
                <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.5, background: `linear-gradient(transparent 96%, ${hexA(accent, 0.5)} 100%), linear-gradient(90deg, transparent 96%, ${hexA(accent2, 0.4)} 100%)`, backgroundSize: '44px 44px', maskImage: 'linear-gradient(180deg, #000, transparent 55%)', WebkitMaskImage: 'linear-gradient(180deg, #000, transparent 55%)' }} />
            );
        case 'marbleVeil':
            return (
                <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.5, background: `radial-gradient(ellipse 60% 30% at 22% 12%, ${hexA(accent, 0.12)} 0, transparent 60%), radial-gradient(ellipse 50% 24% at 82% 66%, ${hexA(accent2, 0.1)} 0, transparent 58%)` }} />
            );
        default:
            return null;
    }
}

/* --------------------------- welcome gate --------------------------- */

const EASE_G: [number, number, number, number] = [0.76, 0, 0.24, 1];

/**
 * The tap-to-open welcome gate for an event card — the event name + date on a
 * themed cover the guest taps to play the reveal (fade / curtain / door / box),
 * matching real e-invites. Presentational: EventPoster owns `open` + scroll lock.
 */
export function EventGate({ T, chip, title, dateLabel, openLabel, open, onOpen }: {
    T: ResolvedEventTheme; chip?: string; title: string; dateLabel?: string;
    openLabel: string; open: boolean; onOpen: () => void;
}) {
    const { ground, ink, inkSoft, accent, accent2, display, spec } = T;
    const reveal = spec.reveal;
    const panelBg = `radial-gradient(700px 420px at 50% 8%, ${hexA(accent, T.lightGround ? 0.14 : 0.22)}, transparent 60%), linear-gradient(180deg, ${ground}, ${ground})`;

    // Panels that carry the reveal. fade/box = one; curtain/door = two.
    const panels: ReactNode = (() => {
        const shared: CSSProperties = { position: 'absolute', top: 0, bottom: 0, background: panelBg, willChange: 'transform, opacity' };
        if (reveal === 'fade') {
            return <motion.div aria-hidden initial={false} animate={{ opacity: open ? 0 : 1 }} transition={{ duration: 0.7, ease: 'easeInOut' }} style={{ ...shared, left: 0, right: 0 }} />;
        }
        if (reveal === 'box') {
            return (
                <motion.div aria-hidden initial={false} animate={{ y: open ? '-106%' : '0%' }} transition={{ duration: 0.9, ease: EASE_G }} style={{ ...shared, left: 0, right: 0, boxShadow: 'inset 0 -50px 90px rgba(0,0,0,0.28)' }}>
                    <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 26, transform: 'translateX(-50%)', background: hexA(accent, 0.28) }} />
                    <div style={{ position: 'absolute', left: 0, right: 0, top: '40%', height: 26, transform: 'translateY(-50%)', background: hexA(accent, 0.28) }} />
                </motion.div>
            );
        }
        // curtain / door — two panels split apart
        return (
            <>
                {(['left', 'right'] as const).map((side) => (
                    <motion.div
                        key={side}
                        aria-hidden
                        initial={false}
                        animate={{ x: open ? (side === 'left' ? '-101%' : '101%') : '0%' }}
                        transition={{ duration: 0.95, ease: EASE_G }}
                        style={{ ...shared, width: '50.5%', left: side === 'left' ? 0 : 'auto', right: side === 'right' ? 0 : 'auto', boxShadow: 'inset 0 0 90px rgba(0,0,0,0.3)' }}
                    >
                        {reveal === 'door' && (
                            <>
                                <div style={{ position: 'absolute', inset: 16, border: `1px solid ${hexA(accent, 0.35)}`, borderRadius: 6 }} />
                                <div style={{ position: 'absolute', top: '50%', left: side === 'left' ? 'auto' : 12, right: side === 'left' ? 12 : 'auto', width: 9, height: 9, borderRadius: '50%', background: hexA(accent, 0.6) }} />
                            </>
                        )}
                    </motion.div>
                ))}
            </>
        );
    })();

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 120, pointerEvents: open ? 'none' : 'auto', overflow: 'hidden' }}>
            {panels}
            <motion.div
                initial={false}
                animate={{ opacity: open ? 0 : 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                style={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '48px 26px' }}
            >
                {chip && <div style={{ display: 'inline-block', padding: '0.28rem 0.9rem', borderRadius: 999, background: hexA(accent, 0.18), color: accent, fontSize: 12, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 18 }}>{chip}</div>}
                <div style={{ fontFamily: display, fontWeight: 800, fontSize: 'clamp(2rem, 10vw, 3.4rem)', lineHeight: 1.02, color: ink, maxWidth: 620 }}>{title}</div>
                {dateLabel && <div style={{ fontFamily: display, fontSize: 15, letterSpacing: '0.06em', color: inkSoft, marginTop: 16 }}>{dateLabel}</div>}
                <motion.button
                    type="button"
                    onClick={onOpen}
                    whileTap={{ scale: 0.94 }}
                    style={{ marginTop: 30, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 32px', borderRadius: 999, fontFamily: display, fontSize: 15, fontWeight: 700, letterSpacing: '0.06em', color: ink, background: hexA(ink, 0.1), border: `1px solid ${hexA(ink, 0.5)}` }}
                >
                    {openLabel}
                </motion.button>
            </motion.div>
        </div>
    );
}

/* --------------------------- ambient effect --------------------------- */

/**
 * Themed floating particles over the whole card. Pure CSS keyframes (defined in
 * EventPoster's <style>): pk-ev-fall / pk-ev-float / pk-ev-spark. Off in preview.
 */
export function EventAmbient({ effect, accent, accent2, count = 14 }: { effect: EventEffectKey; accent: string; accent2: string; count?: number }): ReactNode {
    if (effect === 'none') return null;
    const rnd = (i: number, m: number, s = 1) => ((i * 9301 + 49297) % 233280) / 233280 * m * s;
    const items = Array.from({ length: count });
    const base: CSSProperties = { position: 'absolute', top: '-6%', willChange: 'transform, opacity' };

    return (
        <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 1 }}>
            {items.map((_, i) => {
                const left = `${(rnd(i, 100)).toFixed(1)}%`;
                const dur = 7 + rnd(i + 3, 8);
                const delay = -rnd(i + 1, dur);
                const size = 6 + rnd(i + 2, 10);
                const col = i % 2 ? accent2 : accent;
                if (effect === 'confetti') {
                    return <span key={i} style={{ ...base, left, width: size, height: size * 0.5, background: [accent, accent2, '#fff'][i % 3], borderRadius: 1, animation: `pk-ev-fall ${dur}s linear ${delay}s infinite`, transform: `rotate(${i * 40}deg)` }} />;
                }
                if (effect === 'balloons') {
                    return <span key={i} style={{ ...base, top: 'auto', bottom: '-12%', left, width: size + 10, height: size + 14, background: [accent, accent2, '#8ad6ff', '#ffd36e'][i % 4], borderRadius: '50% 50% 50% 50% / 45% 45% 55% 55%', opacity: 0.85, animation: `pk-ev-float ${dur + 5}s ease-in ${delay}s infinite` }} />;
                }
                if (effect === 'petals') {
                    return <span key={i} style={{ ...base, left, width: size, height: size, background: col, borderRadius: '50% 0 50% 0', opacity: 0.75, animation: `pk-ev-fall ${dur}s linear ${delay}s infinite` }} />;
                }
                if (effect === 'bokeh') {
                    return <span key={i} style={{ ...base, top: `${rnd(i, 90).toFixed(0)}%`, left, width: size * 2.4, height: size * 2.4, background: hexA(col, 0.35), borderRadius: '50%', filter: 'blur(3px)', animation: `pk-ev-spark ${dur}s ease-in-out ${delay}s infinite` }} />;
                }
                // sparkles / dust
                const s = effect === 'dust' ? size * 0.5 : size * 0.7;
                return <span key={i} style={{ ...base, top: `${rnd(i, 92).toFixed(0)}%`, left, width: s, height: s, background: col, borderRadius: '50%', boxShadow: `0 0 ${s}px ${hexA(col, 0.8)}`, animation: `pk-ev-spark ${3 + rnd(i, 3)}s ease-in-out ${delay}s infinite` }} />;
            })}
        </div>
    );
}
