// ============================================================
// Celestial / "Cakerawala" (night-sky) wedding e-invitation template.
// Self-contained: all ornaments are original inline SVG / CSS.
// No external images, fonts, CDNs or network requests.
// ============================================================

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { PkSec } from '../PkSec';
import { motion, useReducedMotion } from 'framer-motion';
import {
    ChevronDown,
    Calendar,
    Clock,
    MapPin,
    Navigation,
    Phone,
    Copy,
    Check,
    Gift,
    Heart,
    Image as ImageIcon,
} from 'lucide-react';

import type { TemplateProps, ProgramItem, Contact } from '../types';
import { useCardText } from '../cardText';

// ---------- typography ---------------------------------------------------
const SERIF = "'Cormorant Garamond', 'Playfair Display', Georgia, 'Times New Roman', serif";
const NAMES = "var(--pk-name, 'Cormorant Garamond'), 'Playfair Display', Georgia, 'Times New Roman', serif";
const BODY = "'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', sans-serif";
const ARABIC = "'Traditional Arabic', 'Scheherazade New', 'Amiri', 'Noto Naskh Arabic', serif";

// A four-point "sparkle" star, drawn at radius 8 around the origin.
const STAR_PATH =
    'M 0 -8 C 1.8 -1.8 1.8 -1.8 8 0 C 1.8 1.8 1.8 1.8 0 8 C -1.8 1.8 -1.8 1.8 -8 0 C -1.8 -1.8 -1.8 -1.8 0 -8 Z';

// ---------- theme --------------------------------------------------------
interface Theme {
    primary: string;   // gold heading / names
    secondary: string; // starlight blue
    accent: string;    // gold lines / stars / buttons
    bg: string;        // midnight navy
    text: string;      // light body text
    panel: string;     // slightly lighter navy panel
    card: string;      // translucent navy "glass"
    line: string;      // thin gold border
    deep: string;      // near-black vignette edge
}

// =========================================================================
//  Small original SVG ornaments
// =========================================================================

/** A single gold sparkle star. */
function StarSparkle({
    size,
    fill,
    style,
}: {
    size: number;
    fill: string;
    style?: CSSProperties;
}) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="-10 -10 20 20"
            aria-hidden="true"
            style={{ display: 'block', ...style }}
        >
            <path d={STAR_PATH} fill={fill} />
        </svg>
    );
}

/**
 * A large, thin crescent moon drawn as a gold stroke. The crescent is the
 * outline between a full circle (r=80) and a slightly larger, off-centre
 * circle (r=82) that carves the inner curve. A faint full ring hints at the
 * moon's dark side, and two tiny stars sit at the tips.
 */
function CrescentMoon({ theme, size }: { theme: Theme; size: number | string }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="-110 -110 220 220"
            role="img"
            aria-label="Crescent moon"
            style={{ display: 'block', overflow: 'visible' }}
        >
            {/* faint hint of the full disc */}
            <circle r={80} fill="none" stroke={theme.primary} strokeWidth={1} opacity={0.12} />
            {/* the thin crescent */}
            <path
                d="M 0 -80 A 80 80 0 1 0 0 80 A 82 82 0 0 0 0 -80 Z"
                fill="none"
                stroke={theme.primary}
                strokeWidth={2.2}
                strokeLinejoin="round"
                strokeLinecap="round"
            />
            <g transform="translate(2 -80) scale(0.42)">
                <path d={STAR_PATH} fill={theme.accent} />
            </g>
            <g transform="translate(2 80) scale(0.32)">
                <path d={STAR_PATH} fill={theme.accent} />
            </g>
        </svg>
    );
}

/**
 * A faint constellation: gold star dots joined by thin gold lines. Hand-authored
 * to hug the edges/corners so it never crosses the couple's names. Static.
 */
function Constellation({ theme }: { theme: Theme }) {
    const dots = [
        { x: 50, y: 82 },
        { x: 112, y: 52 },
        { x: 74, y: 156 },
        { x: 322, y: 70 },
        { x: 362, y: 148 },
        { x: 300, y: 156 },
        { x: 78, y: 470 },
        { x: 150, y: 524 },
        { x: 300, y: 500 },
        { x: 344, y: 560 },
    ];
    const lines: Array<[number, number]> = [
        [0, 1],
        [0, 2],
        [3, 4],
        [3, 5],
        [6, 7],
        [8, 9],
    ];
    return (
        <svg
            width="100%"
            height="100%"
            viewBox="0 0 400 640"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
            style={{ display: 'block' }}
        >
            {lines.map(([a, b], i) => (
                <line
                    key={`l${i}`}
                    x1={dots[a].x}
                    y1={dots[a].y}
                    x2={dots[b].x}
                    y2={dots[b].y}
                    stroke={theme.accent}
                    strokeWidth={0.9}
                    opacity={0.32}
                />
            ))}
            {dots.map((d, i) => (
                <g key={`d${i}`} transform={`translate(${d.x} ${d.y}) scale(${i % 3 === 0 ? 0.5 : 0.34})`}>
                    <path d={STAR_PATH} fill={theme.primary} opacity={0.75} />
                </g>
            ))}
        </svg>
    );
}

/** Divider: a small gold star with thin gold lines each side. */
function StarDivider({ theme }: { theme: Theme }) {
    return (
        <svg
            width={220}
            height={26}
            viewBox="0 0 220 26"
            aria-hidden="true"
            style={{ display: 'block', margin: '18px auto 0' }}
        >
            <line x1="20" y1="13" x2="96" y2="13" stroke={theme.accent} strokeWidth={1.2} opacity={0.8} />
            <line x1="124" y1="13" x2="200" y2="13" stroke={theme.accent} strokeWidth={1.2} opacity={0.8} />
            <g transform="translate(110 13) scale(0.8)">
                <path d={STAR_PATH} fill={theme.accent} />
            </g>
        </svg>
    );
}

/**
 * Twinkling starfield — ≤12 gold star dots that fade in/out at staggered
 * delays. Opacity-only CSS animation (GPU-cheap). Rendered only outside
 * preview / reduced-motion.
 */
function Starfield({ theme }: { theme: Theme }) {
    const stars = useMemo(
        () =>
            Array.from({ length: 12 }, (_, i) => ({
                key: i,
                top: (i * 8.3 + 5) % 92,
                left: (i * 11.7 + 4) % 94,
                size: 8 + (i % 3) * 5,
                dur: 2.4 + (i % 4) * 0.6,
                delay: (i % 6) * 0.5,
            })),
        [],
    );
    return (
        <div
            aria-hidden="true"
            style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}
        >
            {stars.map((s) => (
                <span
                    key={s.key}
                    style={{
                        position: 'absolute',
                        top: `${s.top}%`,
                        left: `${s.left}%`,
                        animation: `pk-twinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
                        willChange: 'opacity',
                    }}
                >
                    <StarSparkle size={s.size} fill={theme.primary} />
                </span>
            ))}
        </div>
    );
}

/**
 * Slow shooting stars — 3 short gold streaks that translate diagonally and
 * fade on a long, staggered loop. Animates transform + opacity only.
 */
function ShootingStars({ theme }: { theme: Theme }) {
    const streaks = [
        { key: 0, top: 8, left: 6, len: 90, dur: 9, delay: 1.5 },
        { key: 1, top: 18, left: 42, len: 70, dur: 11, delay: 5 },
        { key: 2, top: 12, left: 68, len: 110, dur: 10, delay: 8.5 },
    ];
    return (
        <div
            aria-hidden="true"
            style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}
        >
            {streaks.map((s) => (
                <span
                    key={s.key}
                    style={{
                        position: 'absolute',
                        top: `${s.top}%`,
                        left: `${s.left}%`,
                        width: s.len,
                        height: 2,
                        borderRadius: 2,
                        background: `linear-gradient(90deg, rgba(240,217,138,0) 0%, ${theme.primary} 100%)`,
                        opacity: 0,
                        animation: `pk-shoot ${s.dur}s ease-in ${s.delay}s infinite`,
                        willChange: 'transform, opacity',
                    }}
                />
            ))}
        </div>
    );
}

// =========================================================================
//  Motion helpers
// =========================================================================

function Reveal({
    children,
    preview,
    delay = 0,
    y = 26,
    style,
}: {
    children: ReactNode;
    preview?: boolean;
    delay?: number;
    y?: number;
    style?: CSSProperties;
}) {
    if (preview) {
        return <div style={style}>{children}</div>;
    }
    return (
        <motion.div
            style={style}
            initial={{ opacity: 0, y }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.8, delay, ease: 'easeOut' }}
        >
            {children}
        </motion.div>
    );
}

function SectionHeading({
    theme,
    eyebrow,
    title,
    icon,
}: {
    theme: Theme;
    eyebrow?: string;
    title: string;
    icon?: ReactNode;
}) {
    return (
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
            {eyebrow && (
                <div
                    style={{
                        fontFamily: BODY,
                        fontSize: 13,
                        letterSpacing: '0.32em',
                        textTransform: 'uppercase',
                        color: theme.accent,
                        marginBottom: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                    }}
                >
                    {icon}
                    <span>{eyebrow}</span>
                </div>
            )}
            <h2
                style={{
                    fontFamily: SERIF,
                    fontSize: 'clamp(30px, 6vw, 46px)',
                    fontWeight: 600,
                    color: theme.primary,
                    margin: 0,
                    lineHeight: 1.1,
                }}
            >
                {title}
            </h2>
            <StarDivider theme={theme} />
        </div>
    );
}

// =========================================================================
//  Countdown
// =========================================================================

interface TimeLeft {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
}

function useCountdown(target?: string): TimeLeft | null {
    const [now, setNow] = useState<number>(() => Date.now());

    useEffect(() => {
        if (!target) return;
        const id = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(id);
    }, [target]);

    if (!target) return null;
    const t = new Date(target).getTime();
    if (Number.isNaN(t)) return null;

    const diff = Math.max(0, t - now);
    return {
        days: Math.floor(diff / 86_400_000),
        hours: Math.floor((diff % 86_400_000) / 3_600_000),
        minutes: Math.floor((diff % 3_600_000) / 60_000),
        seconds: Math.floor((diff % 60_000) / 1_000),
    };
}

function CountdownBox({ theme, value, label }: { theme: Theme; value: number; label: string }) {
    return (
        <div
            style={{
                minWidth: 70,
                padding: '16px 10px',
                borderRadius: 14,
                background: theme.card,
                border: `1px solid ${theme.line}`,
                boxShadow: '0 8px 24px rgba(3,6,18,0.45)',
                textAlign: 'center',
            }}
        >
            <div
                style={{
                    fontFamily: SERIF,
                    fontSize: 'clamp(28px, 7vw, 40px)',
                    fontWeight: 600,
                    color: theme.primary,
                    lineHeight: 1,
                }}
            >
                {String(value).padStart(2, '0')}
            </div>
            <div
                style={{
                    fontFamily: BODY,
                    fontSize: 11,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: theme.secondary,
                    marginTop: 8,
                }}
            >
                {label}
            </div>
        </div>
    );
}

// =========================================================================
//  Layout primitives
// =========================================================================

function Section({
    children,
    style,
    background,
}: {
    children: ReactNode;
    style?: CSSProperties;
    background?: string;
}) {
    return (
        <section
            style={{
                position: 'relative',
                padding: 'clamp(60px, 11vw, 120px) 20px',
                background,
                ...style,
            }}
        >
            <div style={{ maxWidth: 720, margin: '0 auto', position: 'relative', zIndex: 1 }}>{children}</div>
        </section>
    );
}

// =========================================================================
//  Main template
// =========================================================================

export default function CelestialTemplate({ data, preview, slots }: TemplateProps) {
    const tr = useCardText();
    const reduce = useReducedMotion() ?? false;
    const p = data.palette;
    const theme: Theme = {
        primary: p?.primary ?? '#f0d98a',
        secondary: p?.secondary ?? '#9fb3d8',
        accent: p?.accent ?? '#e9c46a',
        bg: p?.bg ?? '#0b1026',
        text: p?.text ?? '#dfe6f5',
        panel: '#131a35',
        card: 'rgba(19,26,53,0.55)',
        line: 'rgba(240,217,138,0.35)',
        deep: '#060a18',
    };

    const groomShort = data.groomShort ?? data.groomName;
    const brideShort = data.brideShort ?? data.brideName;

    const countdown = useCountdown(data.receptionAt);

    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        const acc = data.gift?.accountNo;
        if (!acc || !navigator.clipboard) return;
        navigator.clipboard
            .writeText(acc)
            .then(() => {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 2200);
            })
            .catch(() => undefined);
    };

    const rootStyle: CSSProperties = {
        fontFamily: BODY,
        fontSize: 18,
        lineHeight: 1.7,
        color: theme.text,
        background: theme.bg,
        backgroundImage: `radial-gradient(120% 70% at 50% -10%, rgba(159,179,216,0.10), rgba(11,16,38,0) 55%)`,
        WebkitFontSmoothing: 'antialiased',
        overflowX: 'hidden',
    };

    const buttonBase: CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: '13px 22px',
        borderRadius: 999,
        fontFamily: BODY,
        fontSize: 15,
        fontWeight: 600,
        letterSpacing: '0.02em',
        textDecoration: 'none',
        cursor: 'pointer',
        border: `1px solid ${theme.accent}`,
        transition: 'transform 0.15s ease',
    };

    const panelBg = theme.panel;
    const moonSize = 'min(56vw, 260px)';

    return (
        <div style={rootStyle}>
            <style>{`
                @keyframes pk-twinkle {
                    0%, 100% { opacity: 0.18; }
                    50%      { opacity: 1; }
                }
                @keyframes pk-shoot {
                    0%   { transform: translate3d(0, 0, 0) rotate(32deg); opacity: 0; }
                    5%   { opacity: 0.9; }
                    22%  { opacity: 0.9; }
                    40%  { transform: translate3d(240px, 150px, 0) rotate(32deg); opacity: 0; }
                    100% { transform: translate3d(240px, 150px, 0) rotate(32deg); opacity: 0; }
                }
                @media (prefers-reduced-motion: reduce) {
                    * { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; }
                }
            `}</style>

            {/* ---------------------------------------------------------- */}
            {/* 1. COVER                                                    */}
            {/* ---------------------------------------------------------- */}
            <section
                style={{
                    position: 'relative',
                    minHeight: 'var(--pk-vh, 100vh)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    padding: '64px 20px 40px',
                    // Clear the absolutely-positioned scroll cue below (~66px tall from the
                    // bottom edge) so centred content can never sit underneath it.
                    paddingBottom: 'var(--pk-cue-clear, 96px)',
                    overflow: 'hidden',
                    background: `radial-gradient(130% 90% at 50% 30%, ${theme.panel} 0%, ${theme.bg} 46%, ${theme.deep} 100%)`,
                }}
            >
                {/* constellation always present (static) */}
                <div style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.9, pointerEvents: 'none' }}>
                    <Constellation theme={theme} />
                </div>

                {!preview && !reduce && <Starfield theme={theme} />}
                {!preview && !reduce && <ShootingStars theme={theme} />}

                <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 560 }}>
                    {data.bismillah && (
                        <motion.div
                            initial={preview ? false : { opacity: 0, y: -12 }}
                            animate={preview ? undefined : { opacity: 1, y: 0 }}
                            transition={{ duration: 1.2, delay: 0.2, ease: 'easeOut' }}
                            style={{ direction: 'rtl', marginBottom: 28 }}
                        >
                            <div
                                style={{
                                    fontFamily: ARABIC,
                                    fontSize: 'clamp(24px, 6vw, 38px)',
                                    color: theme.primary,
                                    lineHeight: 1.9,
                                }}
                            >
                                بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ
                            </div>
                        </motion.div>
                    )}

                    {/* crescent moon */}
                    <motion.div
                        initial={preview ? false : { opacity: 0, y: -16 }}
                        animate={preview ? undefined : { opacity: 1, y: 0 }}
                        transition={{ duration: 1.4, ease: 'easeOut' }}
                        style={{ display: 'flex', justifyContent: 'center' }}
                    >
                        <motion.div
                            animate={preview || reduce ? undefined : { scale: [1, 1.03, 1] }}
                            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                            style={{ willChange: 'transform', display: 'inline-flex' }}
                        >
                            <CrescentMoon theme={theme} size={moonSize} />
                        </motion.div>
                    </motion.div>

                    {/* names */}
                    <motion.div
                        initial={preview ? false : { opacity: 0, scale: 0.92 }}
                        animate={preview ? undefined : { opacity: 1, scale: 1 }}
                        transition={{ duration: 1, delay: 0.7, ease: 'easeOut' }}
                        style={{ marginTop: 18 }}
                    >
                        <div
                            style={{
                                fontFamily: BODY,
                                fontSize: 12,
                                letterSpacing: '0.3em',
                                textTransform: 'uppercase',
                                color: theme.secondary,
                                marginBottom: 8,
                            }}
                        >
                            Raikan Cinta
                        </div>
                        <div
                            style={{
                                fontFamily: NAMES,
                                fontSize: 'clamp(30px, 8vw, 46px)',
                                fontWeight: 600,
                                color: theme.primary,
                                lineHeight: 1.1,
                            }}
                        >
                            {groomShort}
                        </div>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 10,
                                margin: '4px 0',
                            }}
                        >
                            <StarSparkle size={12} fill={theme.accent} />
                            <span
                                style={{
                                    fontFamily: SERIF,
                                    fontStyle: 'italic',
                                    fontSize: 'clamp(22px, 5vw, 30px)',
                                    color: theme.accent,
                                    lineHeight: 1,
                                }}
                            >
                                &amp;
                            </span>
                            <StarSparkle size={12} fill={theme.accent} />
                        </div>
                        <div
                            style={{
                                fontFamily: NAMES,
                                fontSize: 'clamp(30px, 8vw, 46px)',
                                fontWeight: 600,
                                color: theme.primary,
                                lineHeight: 1.1,
                            }}
                        >
                            {brideShort}
                        </div>
                    </motion.div>

                    <motion.div
                        initial={preview ? false : { opacity: 0, y: 14 }}
                        animate={preview ? undefined : { opacity: 1, y: 0 }}
                        transition={{ duration: 1, delay: 1.1, ease: 'easeOut' }}
                        style={{ marginTop: 28 }}
                    >
                        <div
                            style={{
                                fontFamily: BODY,
                                fontSize: 14,
                                letterSpacing: '0.34em',
                                textTransform: 'uppercase',
                                color: theme.secondary,
                            }}
                        >
                            {tr("Walimatulurus")}
                        </div>
                        {data.dateLabel && (
                            <div
                                style={{
                                    fontFamily: SERIF,
                                    fontSize: 'clamp(18px, 4.5vw, 24px)',
                                    color: theme.primary,
                                    marginTop: 8,
                                }}
                            >
                                {data.dateLabel}
                            </div>
                        )}
                    </motion.div>
                </div>

                {/* scroll cue */}
                <motion.div
                    initial={preview ? false : { opacity: 0 }}
                    animate={preview ? undefined : { opacity: 1 }}
                    transition={{ duration: 1, delay: 1.6 }}
                    style={{
                        position: 'absolute',
                        bottom: 26,
                        left: 0,
                        right: 0,
                        zIndex: 2,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 4,
                        color: theme.secondary,
                    }}
                >
                    <span
                        style={{
                            fontFamily: BODY,
                            fontSize: 11,
                            letterSpacing: '0.24em',
                            textTransform: 'uppercase',
                        }}
                    >
                        {tr("Skrol")}
                    </span>
                    <motion.div
                        animate={preview ? undefined : { y: [0, 9, 0] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                        style={{ willChange: 'transform' }}
                    >
                        <ChevronDown size={22} />
                    </motion.div>
                </motion.div>
            </section>

            {/* ---------------------------------------------------------- */}
            {/* 2. OPENING                                                  */}
            {/* ---------------------------------------------------------- */}
            {data.openingLine && (
                <Section>
                    <Reveal preview={preview}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                                <Heart size={22} color={theme.accent} />
                            </div>
                            <p
                                style={{
                                    fontFamily: SERIF,
                                    fontSize: 'clamp(21px, 4.4vw, 30px)',
                                    fontWeight: 500,
                                    lineHeight: 1.6,
                                    color: theme.primary,
                                    margin: '0 auto',
                                    maxWidth: 620,
                                }}
                            >
                                {data.openingLine}
                            </p>
                            <StarDivider theme={theme} />
                        </div>
                    </Reveal>
                </Section>
            )}

            {/* ---------------------------------------------------------- */}
            {/* 3. COUPLE                                                   */}
            {/* ---------------------------------------------------------- */}
            <Section background={panelBg}>
                <SectionHeading theme={theme} eyebrow={tr("Pasangan Bahagia")} title={tr("Pengantin")} />

                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 26,
                    }}
                >
                    <Reveal preview={preview} delay={0.05} style={{ textAlign: 'center', width: '100%' }}>
                        <h3
                            style={{
                                fontFamily: NAMES,
                                fontSize: 'clamp(30px, 7vw, 48px)',
                                fontWeight: 600,
                                color: theme.primary,
                                margin: 0,
                                lineHeight: 1.15,
                            }}
                        >
                            {data.groomName}
                        </h3>
                        {data.groomParents && (
                            <p style={{ margin: '8px 0 0', color: theme.secondary, fontSize: 16 }}>
                                {data.groomParents}
                            </p>
                        )}
                    </Reveal>

                    {/* ampersand ornament */}
                    <Reveal preview={preview} delay={0.15} style={{ width: '100%' }}>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 16,
                            }}
                        >
                            <svg width={56} height={20} viewBox="0 0 56 20" aria-hidden="true">
                                <line x1="0" y1="10" x2="42" y2="10" stroke={theme.accent} strokeWidth={1.2} opacity={0.8} />
                                <g transform="translate(50 10) scale(0.5)">
                                    <path d={STAR_PATH} fill={theme.accent} />
                                </g>
                            </svg>
                            <span
                                style={{
                                    fontFamily: SERIF,
                                    fontStyle: 'italic',
                                    fontSize: 'clamp(40px, 9vw, 60px)',
                                    color: theme.accent,
                                    lineHeight: 1,
                                }}
                            >
                                &amp;
                            </span>
                            <svg width={56} height={20} viewBox="0 0 56 20" aria-hidden="true">
                                <g transform="translate(6 10) scale(0.5)">
                                    <path d={STAR_PATH} fill={theme.accent} />
                                </g>
                                <line x1="14" y1="10" x2="56" y2="10" stroke={theme.accent} strokeWidth={1.2} opacity={0.8} />
                            </svg>
                        </div>
                    </Reveal>

                    <Reveal preview={preview} delay={0.25} style={{ textAlign: 'center', width: '100%' }}>
                        <h3
                            style={{
                                fontFamily: NAMES,
                                fontSize: 'clamp(30px, 7vw, 48px)',
                                fontWeight: 600,
                                color: theme.primary,
                                margin: 0,
                                lineHeight: 1.15,
                            }}
                        >
                            {data.brideName}
                        </h3>
                        {data.brideParents && (
                            <p style={{ margin: '8px 0 0', color: theme.secondary, fontSize: 16 }}>
                                {data.brideParents}
                            </p>
                        )}
                    </Reveal>
                </div>
            </Section>

            {/* ---------------------------------------------------------- */}
            {/* 4. DATE + COUNTDOWN                                         */}
            {/* ---------------------------------------------------------- */}
            <Section>
                <SectionHeading
                    theme={theme}
                    eyebrow={tr("Menuju Hari Bahagia")}
                    title={tr("Kira Detik Bahagia")}
                    icon={<Calendar size={15} />}
                />

                <Reveal preview={preview}>
                    <div style={{ textAlign: 'center' }}>
                        {data.dateLabel && (
                            <div
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    fontFamily: SERIF,
                                    fontSize: 'clamp(22px, 5vw, 30px)',
                                    color: theme.primary,
                                }}
                            >
                                <Calendar size={20} color={theme.accent} />
                                {data.dateLabel}
                            </div>
                        )}
                        {data.timeLabel && (
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8,
                                    marginTop: 10,
                                    color: theme.secondary,
                                    fontSize: 17,
                                }}
                            >
                                <Clock size={17} color={theme.accent} />
                                {data.timeLabel}
                            </div>
                        )}
                        {data.hijriLabel && (
                            <div style={{ marginTop: 6, color: theme.secondary, fontStyle: 'italic' }}>
                                {data.hijriLabel}
                            </div>
                        )}
                    </div>
                </Reveal>

                {countdown && (
                    <Reveal preview={preview} delay={0.15}>
                        <div
                            style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                justifyContent: 'center',
                                gap: 12,
                                marginTop: 34,
                            }}
                        >
                            <CountdownBox theme={theme} value={countdown.days} label={tr("Hari")} />
                            <CountdownBox theme={theme} value={countdown.hours} label={tr("Jam")} />
                            <CountdownBox theme={theme} value={countdown.minutes} label={tr("Minit")} />
                            <CountdownBox theme={theme} value={countdown.seconds} label={tr("Saat")} />
                        </div>
                    </Reveal>
                )}
            </Section>

            {/* ---------------------------------------------------------- */}
            {/* 5. ATUR CARA                                                */}
            {/* ---------------------------------------------------------- */}
            <PkSec name="program">{data.program && data.program.length > 0 && (
                <Section background={panelBg}>
                    <SectionHeading theme={theme} eyebrow={tr("Rentak Majlis")} title={tr("Atur Cara")} />

                    <div style={{ position: 'relative', maxWidth: 480, margin: '0 auto' }}>
                        <div
                            aria-hidden="true"
                            style={{
                                position: 'absolute',
                                left: 11,
                                top: 6,
                                bottom: 6,
                                width: 2,
                                background: theme.line,
                            }}
                        />
                        {data.program.map((item: ProgramItem, i: number) => (
                            <Reveal
                                key={`${item.time}-${i}`}
                                preview={preview}
                                delay={i * 0.08}
                                y={18}
                                style={{ position: 'relative', paddingLeft: 40, marginBottom: 26 }}
                            >
                                <span
                                    aria-hidden="true"
                                    style={{
                                        position: 'absolute',
                                        left: 0,
                                        top: 2,
                                        width: 24,
                                        height: 24,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <StarSparkle size={22} fill={theme.accent} />
                                </span>
                                <div
                                    style={{
                                        fontFamily: BODY,
                                        fontSize: 13,
                                        letterSpacing: '0.12em',
                                        textTransform: 'uppercase',
                                        color: theme.accent,
                                        fontWeight: 700,
                                    }}
                                >
                                    {item.time}
                                </div>
                                <div
                                    style={{
                                        fontFamily: SERIF,
                                        fontSize: 'clamp(20px, 4.5vw, 26px)',
                                        color: theme.primary,
                                        marginTop: 2,
                                    }}
                                >
                                    {item.title}
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </Section>
            )}</PkSec>

            {/* ---------------------------------------------------------- */}
            {/* 6. LOKASI                                                   */}
            {/* ---------------------------------------------------------- */}
            <PkSec name="location">{(data.venueName || data.venueAddress || data.mapsUrl || data.wazeUrl) && (
                <Section>
                    <SectionHeading
                        theme={theme}
                        eyebrow={tr("Tempat Berlangsung")}
                        title={tr("Lokasi Majlis")}
                        icon={<MapPin size={15} />}
                    />
                    <Reveal preview={preview}>
                        <div style={{ textAlign: 'center' }}>
                            {data.venueName && (
                                <h3
                                    style={{
                                        fontFamily: SERIF,
                                        fontSize: 'clamp(24px, 5.5vw, 34px)',
                                        color: theme.primary,
                                        margin: 0,
                                    }}
                                >
                                    {data.venueName}
                                </h3>
                            )}
                            {data.venueAddress && (
                                <p
                                    style={{
                                        color: theme.secondary,
                                        fontSize: 17,
                                        maxWidth: 440,
                                        margin: '12px auto 0',
                                    }}
                                >
                                    {data.venueAddress}
                                </p>
                            )}
                            <div
                                style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    justifyContent: 'center',
                                    gap: 12,
                                    marginTop: 26,
                                }}
                            >
                                {data.mapsUrl && (
                                    <a
                                        href={data.mapsUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            ...buttonBase,
                                            background: theme.accent,
                                            color: theme.bg,
                                            borderColor: theme.accent,
                                        }}
                                    >
                                        <MapPin size={17} />
                                        Buka Google Maps
                                    </a>
                                )}
                                {data.wazeUrl && (
                                    <a
                                        href={data.wazeUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            ...buttonBase,
                                            background: 'transparent',
                                            color: theme.primary,
                                        }}
                                    >
                                        <Navigation size={17} />
                                        Waze
                                    </a>
                                )}
                            </div>
                        </div>
                    </Reveal>
                </Section>
            )}</PkSec>

            {/* ---------------------------------------------------------- */}
            {/* 7. RSVP                                                     */}
            {/* ---------------------------------------------------------- */}
            <PkSec name="rsvp">{slots?.rsvp && (
                <Section background={panelBg}>
                    <SectionHeading theme={theme} eyebrow={tr("Khabarkan Kehadiran")} title={tr("RSVP Kehadiran")} />
                    <Reveal preview={preview}>{slots.rsvp}</Reveal>
                </Section>
            )}</PkSec>

            {/* ---------------------------------------------------------- */}
            {/* 8. UCAPAN                                                   */}
            {/* ---------------------------------------------------------- */}
            <PkSec name="wishes"><Section>
                <SectionHeading theme={theme} eyebrow={tr("Doa & Restu")} title={tr("Ucapan Kasih")} />
                <Reveal preview={preview}>
                    {slots?.wishes ?? (
                        <div
                            style={{
                                background: theme.card,
                                border: `1px solid ${theme.line}`,
                                borderRadius: 18,
                                padding: '34px 24px',
                                textAlign: 'center',
                                boxShadow: '0 12px 30px rgba(3,6,18,0.45)',
                            }}
                        >
                            <p style={{ margin: 0, color: theme.secondary, fontSize: 17 }}>
                                Ruangan ucapan akan dipaparkan di sini.
                            </p>
                            <p style={{ margin: '6px 0 0', color: theme.secondary, fontSize: 14, fontStyle: 'italic' }}>
                                Tinggalkan kata-kata aluan buat pengantin.
                            </p>
                        </div>
                    )}
                </Reveal>
            </Section></PkSec>

            {/* ---------------------------------------------------------- */}
            {/* 8b. SENARAI HADIAH                                          */}
            {/* ---------------------------------------------------------- */}
            <PkSec name="wishlist">{slots?.wishlist && (
                <Section background={panelBg}>
                    <SectionHeading theme={theme} eyebrow={tr("Tanda Ingatan")} title={tr("Senarai Hadiah")} />
                    <Reveal preview={preview}>{slots.wishlist}</Reveal>
                </Section>
            )}</PkSec>

            {/* ---------------------------------------------------------- */}
            {/* 9. HUBUNGI                                                  */}
            {/* ---------------------------------------------------------- */}
            <PkSec name="contacts">{data.contacts && data.contacts.length > 0 && (
                <Section background={panelBg}>
                    <SectionHeading
                        theme={theme}
                        eyebrow={tr("Sebarang Pertanyaan")}
                        title={tr("Hubungi")}
                        icon={<Phone size={15} />}
                    />
                    <div
                        style={{
                            display: 'grid',
                            gap: 14,
                            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                        }}
                    >
                        {data.contacts.map((c: Contact, i: number) => (
                            <Reveal key={`${c.phone}-${i}`} preview={preview} delay={i * 0.08}>
                                <a
                                    href={`tel:${c.phone.replace(/\s+/g, '')}`}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 14,
                                        padding: '16px 18px',
                                        borderRadius: 14,
                                        background: theme.card,
                                        border: `1px solid ${theme.line}`,
                                        textDecoration: 'none',
                                        color: theme.text,
                                        boxShadow: '0 8px 20px rgba(3,6,18,0.4)',
                                    }}
                                >
                                    <span
                                        style={{
                                            flex: '0 0 auto',
                                            width: 44,
                                            height: 44,
                                            borderRadius: '50%',
                                            background: theme.accent,
                                            color: theme.bg,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <Phone size={19} />
                                    </span>
                                    <span style={{ minWidth: 0 }}>
                                        <span
                                            style={{
                                                display: 'block',
                                                fontFamily: SERIF,
                                                fontSize: 20,
                                                color: theme.primary,
                                                lineHeight: 1.2,
                                            }}
                                        >
                                            {c.name}
                                        </span>
                                        {c.role && (
                                            <span style={{ display: 'block', fontSize: 13, color: theme.secondary }}>
                                                {c.role}
                                            </span>
                                        )}
                                    </span>
                                </a>
                            </Reveal>
                        ))}
                    </div>
                </Section>
            )}</PkSec>

            {/* ---------------------------------------------------------- */}
            {/* 10. SALAM KASIH                                             */}
            {/* ---------------------------------------------------------- */}
            <PkSec name="gift">{data.gift && (data.gift.bankName || data.gift.accountNo || data.gift.accountName) && (
                <Section>
                    <SectionHeading
                        theme={theme}
                        eyebrow={tr("Tanda Kasih")}
                        title={tr("Salam Kasih")}
                        icon={<Gift size={15} />}
                    />
                    <Reveal preview={preview}>
                        <div
                            style={{
                                maxWidth: 420,
                                margin: '0 auto',
                                background: theme.card,
                                border: `1px solid ${theme.line}`,
                                borderRadius: 20,
                                padding: '30px 26px',
                                textAlign: 'center',
                                boxShadow: '0 14px 34px rgba(3,6,18,0.5)',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                                <span
                                    style={{
                                        width: 54,
                                        height: 54,
                                        borderRadius: '50%',
                                        background: 'rgba(240,217,138,0.14)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: theme.accent,
                                    }}
                                >
                                    <Gift size={26} />
                                </span>
                            </div>
                            {data.gift.bankName && (
                                <div
                                    style={{
                                        fontFamily: SERIF,
                                        fontSize: 26,
                                        color: theme.primary,
                                    }}
                                >
                                    {data.gift.bankName}
                                </div>
                            )}
                            {data.gift.accountName && (
                                <div style={{ color: theme.secondary, marginTop: 2 }}>{data.gift.accountName}</div>
                            )}
                            {data.gift.accountNo && (
                                <div
                                    style={{
                                        marginTop: 16,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 12,
                                        flexWrap: 'wrap',
                                    }}
                                >
                                    <span
                                        style={{
                                            fontFamily: SERIF,
                                            fontSize: 24,
                                            letterSpacing: '0.06em',
                                            color: theme.primary,
                                            fontWeight: 600,
                                        }}
                                    >
                                        {data.gift.accountNo}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleCopy}
                                        style={{
                                            ...buttonBase,
                                            padding: '9px 16px',
                                            fontSize: 14,
                                            background: copied ? theme.secondary : theme.accent,
                                            color: theme.bg,
                                            borderColor: copied ? theme.secondary : theme.accent,
                                        }}
                                    >
                                        {copied ? <Check size={16} /> : <Copy size={16} />}
                                        {copied ? 'Telah disalin' : 'Salin nombor'}
                                    </button>
                                </div>
                            )}
                            {data.gift.note && (
                                <p
                                    style={{
                                        marginTop: 18,
                                        color: theme.secondary,
                                        fontStyle: 'italic',
                                        fontSize: 15,
                                    }}
                                >
                                    {data.gift.note}
                                </p>
                            )}
                        </div>
                    </Reveal>
                </Section>
            )}</PkSec>

            {/* ---------------------------------------------------------- */}
            {/* 11. GALERI                                                  */}
            {/* ---------------------------------------------------------- */}
            <PkSec name="gallery"><Section background={panelBg}>
                <SectionHeading
                    theme={theme}
                    eyebrow={tr("Kenangan")}
                    title={tr("Galeri Memori")}
                    icon={<ImageIcon size={15} />}
                />
                <div
                    style={{
                        display: 'grid',
                        gap: 14,
                        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    }}
                >
                    {data.galleryImages && data.galleryImages.length > 0
                        ? data.galleryImages.map((src, i) => (
                              <Reveal key={`${src}-${i}`} preview={preview} delay={i * 0.06}>
                                  <div
                                      style={{
                                          borderRadius: 14,
                                          overflow: 'hidden',
                                          border: `1px solid ${theme.line}`,
                                          boxShadow: '0 10px 24px rgba(3,6,18,0.45)',
                                          aspectRatio: '3 / 4',
                                          background: theme.card,
                                      }}
                                  >
                                      <img
                                          src={src}
                                          alt={`Galeri ${i + 1}`}
                                          loading="lazy"
                                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                      />
                                  </div>
                              </Reveal>
                          ))
                        : Array.from({ length: 3 }).map((_, i) => (
                              <Reveal key={`ph-${i}`} preview={preview} delay={i * 0.08}>
                                  <div
                                      style={{
                                          borderRadius: 14,
                                          border: `1px solid ${theme.line}`,
                                          aspectRatio: '3 / 4',
                                          background: 'rgba(240,217,138,0.05)',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          gap: 10,
                                          color: theme.accent,
                                      }}
                                  >
                                      <CrescentMoon theme={theme} size={72} />
                                      <span
                                          style={{
                                              fontFamily: BODY,
                                              fontSize: 12,
                                              letterSpacing: '0.2em',
                                              textTransform: 'uppercase',
                                              color: theme.secondary,
                                          }}
                                      >
                                          Gambar
                                      </span>
                                  </div>
                              </Reveal>
                          ))}
                </div>
            </Section></PkSec>

            {/* ---------------------------------------------------------- */}
            {/* 12. FOOTER                                                  */}
            {/* ---------------------------------------------------------- */}
            <footer
                style={{
                    position: 'relative',
                    textAlign: 'center',
                    padding: 'clamp(60px, 11vw, 110px) 20px 48px',
                    overflow: 'hidden',
                    background: `radial-gradient(120% 80% at 50% 100%, ${theme.panel} 0%, ${theme.bg} 55%, ${theme.deep} 100%)`,
                }}
            >
                <Reveal preview={preview}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
                        <CrescentMoon theme={theme} size={130} />
                    </div>
                    <div
                        style={{
                            fontFamily: NAMES,
                            fontSize: 'clamp(28px, 7vw, 42px)',
                            fontWeight: 600,
                            color: theme.primary,
                            lineHeight: 1.2,
                        }}
                    >
                        {groomShort}
                        <span style={{ color: theme.accent, fontStyle: 'italic', margin: '0 12px' }}>&amp;</span>
                        {brideShort}
                    </div>
                    <div
                        style={{
                            marginTop: 12,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            fontFamily: SERIF,
                            fontSize: 'clamp(20px, 5vw, 28px)',
                            color: theme.secondary,
                        }}
                    >
                        Terima Kasih
                        <Heart size={20} color={theme.accent} fill={theme.accent} />
                    </div>
                    <StarDivider theme={theme} />
                    <div
                        style={{
                            marginTop: 22,
                            fontFamily: BODY,
                            fontSize: 12,
                            letterSpacing: '0.24em',
                            textTransform: 'uppercase',
                            color: theme.secondary,
                            opacity: 0.75,
                        }}
                    >
                        Dibina dengan{' '}
                        <Heart
                            size={12}
                            color={theme.accent}
                            style={{ display: 'inline', verticalAlign: 'middle', margin: '0 2px' }}
                        />{' '}
                        PortalKahwin
                    </div>
                </Reveal>
            </footer>
        </div>
    );
}
