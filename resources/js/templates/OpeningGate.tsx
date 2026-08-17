// ============================================================
// OpeningGate — a tap-to-open welcome cover for the HAND-CODED
// built-in wedding templates (the no-code Custom engine has its own
// reveal machinery in Custom/index.tsx).
//
// Wrap a template's whole output:
//   <OpeningGate reveal="envelope" data={data} preview={preview} panelColor={...}>
//       {theCard}
//   </OpeningGate>
//
// Live: a full-screen welcome (couple names + date + Open) sits over a
// closed reveal; body scroll is locked. Tapping Open plays the reveal
// (curtain slides apart / doors swing open / envelope flap lifts) and
// unlocks the card behind it.
//
// Preview/thumbnail (preview=true): renders children only — a gate must
// never block a gallery thumbnail. Reduced-motion: the reveal is instant.
// Self-contained: inline SVG/CSS, transform/opacity only, no new deps.
// ============================================================

import { createContext, useContext, useEffect, useState, type ReactNode, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';
import type { InvitationData } from './types';
import { useCardText } from './cardText';

export type OpeningReveal = 'curtain' | 'door' | 'envelope';

/**
 * The opening gate must fire ONLY on the real, live public card (/e/:slug) — not
 * in the editor live-preview, the trial full-card modal, gallery thumbnails or
 * the Designer. Those all render templates too, several without `preview`, so a
 * `preview` flag alone can't tell them apart. PublicCard flips this context on;
 * everywhere else it stays false and the gate renders its children untouched.
 */
export const OpeningGateEnabled = createContext(false);

const EASE: [number, number, number, number] = [0.76, 0, 0.24, 1];
const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

function withAlpha(color: string, a: number): string {
    const m = color.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (!m) return color;
    const h = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1];
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
    return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/** Relative luminance 0..1 (returns 1 for unparseable so it's treated as "light"). */
function lum(hex: string): number {
    const m = hex.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (!m) return 1;
    const h = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1];
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
    return (r * 0.299 + g * 0.587 + b * 0.114) / 255;
}

/** Perceptual ink that reads on a coloured panel. */
function panelInk(hex: string): string {
    return lum(hex) > 0.62 ? '#2a2333' : '#fff9f0';
}

/**
 * A palette's field names don't agree across templates (Khat's "primary" is a
 * cream ink; Tirai's is a dark maroon). Pick the darkest of primary/bg/secondary
 * as the gate panel so the reveal is always a rich backdrop with light welcome
 * text — regardless of stored palette or a custom recolour. Falls back to the
 * per-template dark colour when nothing in the palette is dark enough.
 */
function pickPanel(palette: InvitationData['palette'], fallback: string): string {
    const cands = [palette?.primary, palette?.bg, palette?.secondary].filter((c): c is string => !!c);
    const dark = cands.filter((c) => lum(c) < 0.5).sort((a, b) => lum(a) - lum(b));
    return dark[0] ?? fallback;
}

const GATE_HEAD = "'Playfair Display', 'Cormorant Garamond', Georgia, serif";

/** Two curtains that part to the sides. */
function Curtains({ open, color, dur }: { open: boolean; color: string; dur: number }) {
    return (
        <>
            {(['left', 'right'] as const).map((side) => (
                <motion.div
                    key={side}
                    aria-hidden="true"
                    initial={{ x: 0 }}
                    animate={{ x: open ? (side === 'left' ? '-101%' : '101%') : 0 }}
                    transition={{ duration: dur, ease: EASE, delay: 0.05 }}
                    style={{
                        position: 'absolute', top: 0, bottom: 0, width: '51%', zIndex: 2,
                        [side]: 0,
                        background: `repeating-linear-gradient(${side === 'left' ? 90 : 270}deg, ${color} 0px, ${withAlpha(color, 0.82)} 22px, ${color} 46px)`,
                        boxShadow: 'inset 0 0 120px rgba(0,0,0,0.4)',
                        willChange: 'transform',
                    } as CSSProperties}
                >
                    <div style={{ position: 'absolute', [side === 'left' ? 'right' : 'left']: 0, top: 0, bottom: 0, width: 12, background: `linear-gradient(${side === 'left' ? 270 : 90}deg, rgba(0,0,0,0.3), transparent)` } as CSSProperties} />
                </motion.div>
            ))}
        </>
    );
}

/** Two solid doors that meet at the centre and swing apart. */
function Doors({ open, color, dur }: { open: boolean; color: string; dur: number }) {
    return (
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, perspective: 1400, zIndex: 2 }}>
            {(['left', 'right'] as const).map((side) => (
                <motion.div
                    key={side}
                    initial={{ rotateY: 0 }}
                    animate={{ rotateY: open ? (side === 'left' ? -108 : 108) : 0 }}
                    transition={{ duration: dur, ease: EASE, delay: 0.05 }}
                    style={{
                        position: 'absolute', top: 0, bottom: 0, width: '50.2%', [side]: 0,
                        transformOrigin: side === 'left' ? 'left center' : 'right center',
                        transformStyle: 'preserve-3d',
                        background: `linear-gradient(${side === 'left' ? 100 : 260}deg, ${color}, ${withAlpha(color, 0.84)})`,
                        boxShadow: 'inset 0 0 90px rgba(0,0,0,0.4)',
                        display: 'flex', alignItems: 'center',
                        justifyContent: side === 'left' ? 'flex-end' : 'flex-start',
                        willChange: 'transform',
                    } as CSSProperties}
                >
                    <div style={{ position: 'absolute', inset: '18px', border: `1px solid ${withAlpha('#ffffff', 0.16)}`, borderRadius: 6 }} />
                    <div style={{ position: 'absolute', inset: '34px', border: `1px solid ${withAlpha('#ffffff', 0.1)}`, borderRadius: 4 }} />
                    <div style={{ width: 11, height: 11, borderRadius: '50%', background: withAlpha('#000000', 0.4), boxShadow: `0 0 0 3px ${withAlpha('#ffffff', 0.14)}`, margin: side === 'left' ? '0 14px 0 0' : '0 0 0 14px' }} />
                </motion.div>
            ))}
        </div>
    );
}

const ENV_PAPER = '#f4ecdb';

/** A centred envelope (cream paper body + coloured flap) whose flap lifts,
 *  then the whole thing drops away. */
function Envelope({ open, color, accent, initials, dur }: { open: boolean; color: string; accent: string; initials: string; dur: number }) {
    return (
        <motion.div
            aria-hidden="true"
            initial={{ y: 0, opacity: 1 }}
            animate={open ? { y: '60vh', opacity: 0 } : { y: 0, opacity: 1 }}
            transition={{ y: { duration: dur, ease: EASE_OUT, delay: 0.5 }, opacity: { duration: dur * 0.6, delay: dur * 0.6 } }}
            style={{ position: 'relative', width: 'min(78vw, 300px)', aspectRatio: '3 / 2', zIndex: 3, willChange: 'transform, opacity' }}
        >
            {/* body — cream paper so it reads on any palette backdrop */}
            <div style={{ position: 'absolute', inset: 0, borderRadius: 10, background: `linear-gradient(160deg, ${ENV_PAPER}, #e8dcc4)`, boxShadow: '0 26px 60px rgba(0,0,0,0.4)', overflow: 'hidden' }}>
                {/* inner V pleats */}
                <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(115deg, transparent 49.4%, ${withAlpha('#000', 0.07)} 50%, transparent 50.6%), linear-gradient(245deg, transparent 49.4%, ${withAlpha('#000', 0.07)} 50%, transparent 50.6%)` }} />
                {/* wax seal */}
                <div style={{ position: 'absolute', left: '50%', top: '54%', transform: 'translate(-50%,-50%)', width: 46, height: 46, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `radial-gradient(circle at 38% 32%, ${withAlpha(accent, 1)}, ${withAlpha(accent, 0.72)})`, boxShadow: '0 4px 10px rgba(0,0,0,0.3)', fontFamily: GATE_HEAD, fontWeight: 600, fontSize: 16, color: panelInk(accent) }}>{initials}</div>
            </div>
            {/* flap — palette colour, contrasts with the paper body */}
            <motion.div
                initial={{ rotateX: 0 }}
                animate={{ rotateX: open ? -168 : 0 }}
                transition={{ duration: dur * 0.55, ease: EASE_OUT, delay: 0.05 }}
                style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '58%', transformOrigin: 'top', transformStyle: 'preserve-3d', zIndex: open ? 1 : 4, willChange: 'transform' }}
            >
                <div style={{ position: 'absolute', inset: 0, clipPath: 'polygon(0 0, 100% 0, 50% 100%)', background: `linear-gradient(180deg, ${color}, ${withAlpha(color, 0.88)})`, boxShadow: `0 2px 8px ${withAlpha('#000', 0.25)}`, borderTop: `1px solid ${withAlpha('#ffffff', 0.15)}` }} />
            </motion.div>
        </motion.div>
    );
}

interface Props {
    reveal: OpeningReveal;
    data: InvitationData;
    preview?: boolean;
    /** Overlay / panel colour (usually palette.primary). */
    panelColor: string;
    /** Accent for the wax seal / flourish (usually palette.accent). */
    accentColor?: string;
    children: ReactNode;
}

export function OpeningGate({ reveal, data, preview, panelColor, accentColor, children }: Props) {
    const reduce = useReducedMotion();
    const tr = useCardText();
    const gateAllowed = useContext(OpeningGateEnabled);
    const enabled = !preview && gateAllowed;

    const [open, setOpen] = useState(false);
    const [gone, setGone] = useState(!enabled);

    // Lock the page scroll while the welcome is up, then restore.
    useEffect(() => {
        if (!enabled || gone) return;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.scrollTo(0, 0);
        return () => { document.body.style.overflow = prevOverflow; };
    }, [enabled, gone]);

    if (!enabled) return <>{children}</>;

    const dur = reduce ? 0.01 : reveal === 'envelope' ? 1.05 : 0.9;
    const onOpen = () => {
        if (open) return;
        setOpen(true);
        window.setTimeout(() => setGone(true), Math.round((dur + (reveal === 'envelope' ? 0.7 : 0.35)) * 1000));
    };

    const groomShort = data.groomShort ?? data.groomName;
    const brideShort = data.brideShort ?? data.brideName;
    const initials = `${(groomShort || 'A').trim()[0] ?? 'A'}${(brideShort || 'B').trim()[0] ?? 'B'}`.toUpperCase();
    const panel = pickPanel(data.palette, panelColor);
    const accent = data.palette?.accent ?? accentColor ?? panel;
    const ink = panelInk(panel);
    const soft = withAlpha(ink, 0.72);
    const isEnvelope = reveal === 'envelope';

    // The overlay is portaled to <body> so it escapes the card's stacking
    // context and covers the floating action dock + language picker (which are
    // rendered as page-level siblings of the template).
    const overlay = !gone && (
                <div
                    style={{
                        position: 'fixed', inset: 0, zIndex: 120, overflow: 'hidden',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        // Curtain/door: transparent so the card shows THROUGH as the
                        // opaque panels part (they fully cover the screen when closed).
                        // Envelope: opaque backdrop since the envelope doesn't cover it.
                        background: isEnvelope
                            ? `radial-gradient(120% 80% at 50% 14%, ${withAlpha('#ffffff', 0.14)}, ${withAlpha('#ffffff', 0)} 62%), ${panel}`
                            : 'transparent',
                        pointerEvents: open ? 'none' : 'auto',
                    }}
                >
                    {reveal === 'curtain' && <Curtains open={open} color={panel} dur={dur} />}
                    {reveal === 'door' && <Doors open={open} color={panel} dur={dur} />}

                    {/* Welcome content — for curtain/door it sits centred over the closed
                        panels; for the envelope the names live under the envelope. */}
                    {isEnvelope ? (
                        <motion.div
                            initial={false}
                            animate={{ opacity: open ? 0 : 1 }}
                            transition={{ duration: 0.4, delay: open ? 0.3 : 0 }}
                            style={{ position: 'relative', zIndex: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '32px 24px', pointerEvents: open ? 'none' : 'auto' }}
                        >
                            <button type="button" onClick={onOpen} style={{ background: 'none', border: 'none', padding: 0, cursor: open ? 'default' : 'pointer' }} aria-label={tr('Buka')}>
                                <Envelope open={open} color={panel} accent={accent} initials={initials} dur={dur} />
                            </button>
                            <div style={{ marginTop: 26, fontFamily: GATE_HEAD, fontSize: 'clamp(24px, 7vw, 38px)', fontWeight: 600, color: ink, lineHeight: 1.15 }}>
                                {groomShort} <span style={{ fontStyle: 'italic', color: soft, fontSize: '0.7em' }}>&amp;</span> {brideShort}
                            </div>
                            {data.dateLabel && <div style={{ marginTop: 8, fontFamily: GATE_HEAD, fontSize: 13, letterSpacing: '0.14em', textTransform: 'uppercase', color: soft }}>{data.dateLabel}</div>}
                            <motion.button
                                type="button" onClick={onOpen} whileTap={{ scale: 0.94 }}
                                style={{ marginTop: 22, cursor: 'pointer', padding: '11px 30px', borderRadius: 999, fontFamily: GATE_HEAD, fontSize: 14, fontWeight: 600, letterSpacing: '0.08em', color: ink, background: withAlpha(ink, 0.12), border: `1px solid ${withAlpha(ink, 0.5)}` }}
                            >
                                {tr('Buka')}
                            </motion.button>
                        </motion.div>
                    ) : (
                        <motion.div
                            initial={false}
                            animate={{ opacity: open ? 0 : 1 }}
                            transition={{ duration: 0.4, ease: 'easeOut' }}
                            style={{ position: 'relative', zIndex: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '48px 26px', pointerEvents: open ? 'none' : 'auto' }}
                        >
                            <div style={{ fontFamily: GATE_HEAD, fontSize: 12, letterSpacing: '0.32em', textTransform: 'uppercase', color: soft, marginBottom: 12 }}>{tr('Raikan Cinta')}</div>
                            <div style={{ fontFamily: GATE_HEAD, fontSize: 'clamp(30px, 8vw, 46px)', fontWeight: 600, color: ink, lineHeight: 1.12 }}>{groomShort}</div>
                            <div style={{ fontFamily: GATE_HEAD, fontStyle: 'italic', fontSize: 'clamp(18px, 5vw, 26px)', color: soft, margin: '2px 0' }}>&amp;</div>
                            <div style={{ fontFamily: GATE_HEAD, fontSize: 'clamp(30px, 8vw, 46px)', fontWeight: 600, color: ink, lineHeight: 1.12 }}>{brideShort}</div>
                            {data.dateLabel && <div style={{ fontFamily: GATE_HEAD, fontSize: 14, letterSpacing: '0.04em', color: soft, marginTop: 14 }}>{data.dateLabel}</div>}
                            <motion.button
                                type="button" onClick={onOpen} whileTap={{ scale: 0.94 }}
                                style={{ marginTop: 26, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 30px', borderRadius: 999, fontFamily: GATE_HEAD, fontSize: 15, fontWeight: 600, letterSpacing: '0.06em', color: ink, background: withAlpha(ink, 0.12), border: `1px solid ${withAlpha(ink, 0.55)}`, backdropFilter: 'blur(2px)' }}
                            >
                                {tr('Buka')}
                            </motion.button>
                        </motion.div>
                    )}
                </div>
    );

    return (
        <>
            {children}
            {overlay && typeof document !== 'undefined' ? createPortal(overlay, document.body) : null}
        </>
    );
}
