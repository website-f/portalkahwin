// ============================================================
// "Deko Klasik" — 1920s Art-Deco / Gatsby-luxe wedding e-invitation.
// Self-contained: every ornament is original inline SVG / CSS.
// No external images, fonts, CDNs or network requests.
// ============================================================

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
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

// ---------- typography ---------------------------------------------------
const SERIF = "'Bodoni MT', 'Didot', 'Playfair Display', Georgia, 'Times New Roman', serif";
const BODY = "'Century Gothic', 'Futura', 'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', sans-serif";
const ARABIC = "'Traditional Arabic', 'Scheherazade New', 'Amiri', 'Noto Naskh Arabic', serif";

// ---------- theme --------------------------------------------------------
interface Theme {
    primary: string;
    secondary: string;
    accent: string;
    bg: string;
    text: string;
    gold: string;      // bright highlight sheen
    goldDeep: string;  // shadowed gold
    panel: string;     // framed-section background
    panelDeep: string; // card / countdown background
    line: string;      // strong gold hairline
    lineFaint: string; // faint gold hairline
}

// =========================================================================
//  Small original SVG ornaments
// =========================================================================

/** The signature ampersand set inside a gold diamond. */
function AmpDiamond({ theme, size }: { theme: Theme; size: number }) {
    const inner = Math.round(size * 0.5);
    return (
        <span
            style={{
                display: 'inline-flex',
                width: size,
                height: size,
                transform: 'rotate(45deg)',
                border: `1.4px solid ${theme.accent}`,
                alignItems: 'center',
                justifyContent: 'center',
                verticalAlign: 'middle',
                flex: '0 0 auto',
            }}
        >
            <span
                style={{
                    transform: 'rotate(-45deg)',
                    fontFamily: SERIF,
                    fontStyle: 'italic',
                    color: theme.accent,
                    fontSize: inner,
                    lineHeight: 1,
                }}
            >
                &amp;
            </span>
        </span>
    );
}

/** A stepped Art-Deco corner bracket (top-left oriented; mirror via scale). */
function DecoCorner({ theme }: { theme: Theme }) {
    return (
        <svg width={90} height={90} viewBox="0 0 90 90" aria-hidden="true" style={{ display: 'block' }}>
            <path d="M8 48 L8 8 L48 8" fill="none" stroke={theme.accent} strokeWidth={2} strokeLinecap="square" />
            <path
                d="M16 48 L16 16 L48 16"
                fill="none"
                stroke={theme.secondary}
                strokeWidth={1.1}
                strokeLinecap="square"
                opacity={0.75}
            />
            <path d="M24 42 L24 24 L42 24" fill="none" stroke={theme.accent} strokeWidth={1.1} strokeLinecap="square" />
            <rect x="4" y="4" width="9" height="9" transform="rotate(45 8.5 8.5)" fill={theme.accent} />
            <rect x="32" y="32" width="6" height="6" transform="rotate(45 35 35)" fill={theme.secondary} />
            <rect x="44" y="44" width="4.5" height="4.5" transform="rotate(45 46.25 46.25)" fill={theme.goldDeep} />
        </svg>
    );
}

/** Divider: two hairlines meeting a symmetric stepped-diamond motif. */
function DecoDivider({ theme }: { theme: Theme }) {
    return (
        <svg
            width={244}
            height={22}
            viewBox="0 0 244 22"
            aria-hidden="true"
            style={{ display: 'block', margin: '18px auto 0' }}
        >
            <line x1="20" y1="11" x2="94" y2="11" stroke={theme.line} strokeWidth={1.2} />
            <line x1="150" y1="11" x2="224" y2="11" stroke={theme.line} strokeWidth={1.2} />
            <rect x="112" y="3" width="16" height="16" transform="rotate(45 120 11)" fill="none" stroke={theme.accent} strokeWidth={1.4} />
            <rect x="116" y="7" width="8" height="8" transform="rotate(45 120 11)" fill={theme.accent} />
            <rect x="99" y="7" width="8" height="8" transform="rotate(45 103 11)" fill={theme.secondary} />
            <rect x="133" y="7" width="8" height="8" transform="rotate(45 137 11)" fill={theme.secondary} />
        </svg>
    );
}

/** A short stepped bar that flanks section headings (left orientation). */
function StepBar({ theme, flip }: { theme: Theme; flip?: boolean }) {
    return (
        <svg
            width={52}
            height={16}
            viewBox="0 0 52 16"
            aria-hidden="true"
            style={{ display: 'block', transform: flip ? 'scaleX(-1)' : undefined }}
        >
            <path d="M0 13 L22 13 L22 8 L34 8 L34 3 L44 3" fill="none" stroke={theme.line} strokeWidth={1.3} strokeLinecap="square" />
            <rect x="45" y="0" width="7" height="7" transform="rotate(45 48.5 3.5)" fill={theme.accent} />
        </svg>
    );
}

/**
 * Signature sunburst — a full radial fan of thin gold rays.
 * Rendered behind the couple names. When `shimmer` is on, alternate
 * (short) rays gently pulse their opacity only. Capped at 12 shimmering
 * elements. All ray geometry is static; the only motion is opacity.
 */
function Sunburst({ theme, shimmer, size }: { theme: Theme; shimmer: boolean; size: number | string }) {
    const N = 24;
    const rays = useMemo(
        () =>
            Array.from({ length: N }, (_, i) => {
                const long = i % 2 === 0;
                const R = long ? 188 : 150;
                const w = long ? 3.4 : 2.1;
                return {
                    key: i,
                    deg: (360 / N) * i,
                    R,
                    w,
                    fill: long ? theme.accent : theme.secondary,
                    baseOpacity: long ? 0.55 : 0.4,
                    pulse: !long, // 12 short rays shimmer
                    delay: (i % 6) * 0.45,
                };
            }),
        [theme.accent, theme.secondary],
    );

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 400 400"
            role="img"
            aria-label="Sinar Art Deco"
            style={{ display: 'block', overflow: 'visible' }}
        >
            {rays.map((r) => (
                <path
                    key={r.key}
                    d={`M200 200 L${200 - r.w} ${200 - r.R} L${200 + r.w} ${200 - r.R} Z`}
                    transform={`rotate(${r.deg} 200 200)`}
                    fill={r.fill}
                    opacity={r.baseOpacity}
                    style={
                        shimmer && r.pulse
                            ? { animation: `pk-shimmer 2.8s ease-in-out ${r.delay}s infinite`, willChange: 'opacity' }
                            : undefined
                    }
                />
            ))}
            {/* central hub — double ring on a clean disc for legibility */}
            <circle cx={200} cy={200} r={74} fill={theme.bg} stroke={theme.line} strokeWidth={1.3} />
            <circle cx={200} cy={200} r={64} fill="none" stroke={theme.lineFaint} strokeWidth={1} />
            <rect x="191" y="191" width="18" height="18" transform="rotate(45 200 200)" fill="none" stroke={theme.lineFaint} strokeWidth={1} />
        </svg>
    );
}

/**
 * The signature thin gold frame. When `animate` is on, the four edges draw
 * in via transform (scaleX / scaleY 0 → 1); otherwise it renders static.
 */
function DecoFrame({ theme, animate }: { theme: Theme; animate: boolean }) {
    const edge = theme.accent;
    const dur = 1.1;

    if (!animate) {
        return (
            <div
                aria-hidden="true"
                style={{ position: 'absolute', inset: 'clamp(14px, 4vw, 30px)', pointerEvents: 'none' }}
            >
                <div style={{ position: 'absolute', inset: 0, border: `1px solid ${theme.line}` }} />
                <div style={{ position: 'absolute', inset: 8, border: `1px solid ${theme.lineFaint}` }} />
            </div>
        );
    }

    const bar: CSSProperties = { position: 'absolute', background: edge, willChange: 'transform' };
    return (
        <div aria-hidden="true" style={{ position: 'absolute', inset: 'clamp(14px, 4vw, 30px)', pointerEvents: 'none' }}>
            <motion.div
                style={{ ...bar, top: 0, left: 0, right: 0, height: 1, transformOrigin: 'left center' }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: dur, ease: 'easeOut' }}
            />
            <motion.div
                style={{ ...bar, bottom: 0, left: 0, right: 0, height: 1, transformOrigin: 'right center' }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: dur, ease: 'easeOut' }}
            />
            <motion.div
                style={{ ...bar, top: 0, bottom: 0, left: 0, width: 1, transformOrigin: 'center top' }}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: dur, ease: 'easeOut' }}
            />
            <motion.div
                style={{ ...bar, top: 0, bottom: 0, right: 0, width: 1, transformOrigin: 'center bottom' }}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: dur, ease: 'easeOut' }}
            />
            <motion.div
                style={{ position: 'absolute', inset: 8, border: `1px solid ${theme.lineFaint}`, transformOrigin: 'center center' }}
                initial={{ opacity: 0, scale: 0.985 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.9, delay: dur * 0.6, ease: 'easeOut' }}
            />
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
                        fontSize: 12,
                        letterSpacing: '0.36em',
                        textTransform: 'uppercase',
                        color: theme.accent,
                        marginBottom: 14,
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                <StepBar theme={theme} flip />
                <h2
                    style={{
                        fontFamily: SERIF,
                        fontSize: 'clamp(28px, 5.6vw, 44px)',
                        fontWeight: 600,
                        color: theme.primary,
                        margin: 0,
                        lineHeight: 1.1,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                    }}
                >
                    {title}
                </h2>
                <StepBar theme={theme} />
            </div>
            <DecoDivider theme={theme} />
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
                minWidth: 74,
                padding: '18px 12px',
                borderRadius: 0,
                background: theme.panelDeep,
                border: `1px solid ${theme.line}`,
                boxShadow: `inset 0 0 0 4px ${theme.panelDeep}, inset 0 0 0 5px ${theme.lineFaint}`,
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
                    letterSpacing: '0.04em',
                }}
            >
                {String(value).padStart(2, '0')}
            </div>
            <div
                style={{
                    fontFamily: BODY,
                    fontSize: 11,
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    color: theme.secondary,
                    marginTop: 10,
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
    theme,
    children,
    style,
    background,
}: {
    theme: Theme;
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
            <div
                style={{
                    maxWidth: 720,
                    margin: '0 auto',
                    position: 'relative',
                    zIndex: 1,
                    background: theme.panel,
                    border: `1px solid ${theme.line}`,
                    boxShadow: `inset 0 0 0 5px ${theme.panel}, inset 0 0 0 6px ${theme.lineFaint}`,
                    padding: 'clamp(30px, 6vw, 52px)',
                }}
            >
                {children}
            </div>
        </section>
    );
}

// =========================================================================
//  Main template
// =========================================================================

export default function ArtDecoTemplate({ data, preview, slots }: TemplateProps) {
    const reduce = useReducedMotion() ?? false;
    const p = data.palette;
    const theme: Theme = {
        primary: p?.primary ?? '#e7cf8b',
        secondary: p?.secondary ?? '#b9a06a',
        accent: p?.accent ?? '#d4af37',
        bg: p?.bg ?? '#0e0e0c',
        text: p?.text ?? '#f2ead4',
        gold: '#f4e3a1',
        goldDeep: '#8a6f2e',
        panel: '#141310',
        panelDeep: '#0b0b09',
        line: 'rgba(212,175,55,0.55)',
        lineFaint: 'rgba(212,175,55,0.22)',
    };

    // The signature cover motion is fully gated off in preview / reduced-motion.
    const animateSig = !preview && !reduce;

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
        backgroundImage: `radial-gradient(120% 70% at 50% 0%, rgba(231,207,139,0.07), rgba(0,0,0,0) 60%)`,
        WebkitFontSmoothing: 'antialiased',
        overflowX: 'hidden',
    };

    const buttonBase: CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: '14px 26px',
        borderRadius: 0,
        fontFamily: BODY,
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
        textDecoration: 'none',
        cursor: 'pointer',
        border: `1px solid ${theme.accent}`,
        transition: 'transform 0.15s ease',
    };

    const altBg = 'rgba(231,207,139,0.035)';
    const cardStyle: CSSProperties = {
        background: theme.panelDeep,
        border: `1px solid ${theme.line}`,
        boxShadow: `inset 0 0 0 5px ${theme.panelDeep}, inset 0 0 0 6px ${theme.lineFaint}`,
        borderRadius: 0,
    };

    const sunburstSize = 'min(84vw, 440px)';

    return (
        <div style={rootStyle}>
            <style>{`
                @keyframes pk-shimmer {
                    0%, 100% { opacity: 0.22; }
                    50%      { opacity: 0.85; }
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
                    minHeight: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    padding: '64px 20px 40px',
                    overflow: 'hidden',
                }}
            >
                {/* symmetric stepped gold frame (draws in) */}
                <DecoFrame theme={theme} animate={animateSig} />

                {/* stepped-diamond corner accents (4, mirrored) */}
                <div style={{ position: 'absolute', top: 'clamp(14px, 4vw, 30px)', left: 'clamp(14px, 4vw, 30px)', zIndex: 1 }}>
                    <DecoCorner theme={theme} />
                </div>
                <div style={{ position: 'absolute', top: 'clamp(14px, 4vw, 30px)', right: 'clamp(14px, 4vw, 30px)', zIndex: 1, transform: 'scaleX(-1)' }}>
                    <DecoCorner theme={theme} />
                </div>
                <div style={{ position: 'absolute', bottom: 'clamp(14px, 4vw, 30px)', left: 'clamp(14px, 4vw, 30px)', zIndex: 1, transform: 'scaleY(-1)' }}>
                    <DecoCorner theme={theme} />
                </div>
                <div style={{ position: 'absolute', bottom: 'clamp(14px, 4vw, 30px)', right: 'clamp(14px, 4vw, 30px)', zIndex: 1, transform: 'scale(-1, -1)' }}>
                    <DecoCorner theme={theme} />
                </div>

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

                    <div
                        style={{
                            position: 'relative',
                            width: sunburstSize,
                            height: sunburstSize,
                            margin: '0 auto',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        {animateSig ? (
                            <motion.div
                                initial={{ opacity: 0, rotate: -10, scale: 0.92 }}
                                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                                transition={{ duration: 1.5, ease: 'easeOut' }}
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    willChange: 'transform',
                                }}
                            >
                                <Sunburst theme={theme} shimmer size="100%" />
                            </motion.div>
                        ) : (
                            <div
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Sunburst theme={theme} shimmer={false} size="100%" />
                            </div>
                        )}

                        <motion.div
                            initial={preview ? false : { opacity: 0, scale: 0.9 }}
                            animate={preview ? undefined : { opacity: 1, scale: 1 }}
                            transition={{ duration: 1, delay: 0.7, ease: 'easeOut' }}
                            style={{ position: 'relative', zIndex: 2, maxWidth: '66%' }}
                        >
                            <div
                                style={{
                                    fontFamily: BODY,
                                    fontSize: 12,
                                    letterSpacing: '0.34em',
                                    textTransform: 'uppercase',
                                    color: theme.secondary,
                                    marginBottom: 8,
                                }}
                            >
                                Raikan Cinta
                            </div>
                            <div
                                style={{
                                    fontFamily: SERIF,
                                    fontSize: 'clamp(26px, 6.6vw, 38px)',
                                    fontWeight: 600,
                                    color: theme.primary,
                                    lineHeight: 1.15,
                                    letterSpacing: '0.14em',
                                    textTransform: 'uppercase',
                                }}
                            >
                                {groomShort}
                            </div>
                            <div style={{ margin: '8px 0' }}>
                                <AmpDiamond theme={theme} size={46} />
                            </div>
                            <div
                                style={{
                                    fontFamily: SERIF,
                                    fontSize: 'clamp(26px, 6.6vw, 38px)',
                                    fontWeight: 600,
                                    color: theme.primary,
                                    lineHeight: 1.15,
                                    letterSpacing: '0.14em',
                                    textTransform: 'uppercase',
                                }}
                            >
                                {brideShort}
                            </div>
                        </motion.div>
                    </div>

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
                            Walimatulurus
                        </div>
                        {data.dateLabel && (
                            <div
                                style={{
                                    fontFamily: SERIF,
                                    fontSize: 'clamp(18px, 4.5vw, 24px)',
                                    color: theme.primary,
                                    marginTop: 8,
                                    letterSpacing: '0.06em',
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
                        Skrol
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
                <Section theme={theme}>
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
                                    letterSpacing: '0.03em',
                                }}
                            >
                                {data.openingLine}
                            </p>
                            <DecoDivider theme={theme} />
                        </div>
                    </Reveal>
                </Section>
            )}

            {/* ---------------------------------------------------------- */}
            {/* 3. COUPLE                                                   */}
            {/* ---------------------------------------------------------- */}
            <Section theme={theme} background={altBg}>
                <SectionHeading theme={theme} eyebrow="Pasangan Bahagia" title="Pengantin" />

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
                                fontFamily: SERIF,
                                fontSize: 'clamp(30px, 7vw, 48px)',
                                fontWeight: 600,
                                color: theme.primary,
                                margin: 0,
                                lineHeight: 1.15,
                                letterSpacing: '0.06em',
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
                            <svg width={60} height={16} viewBox="0 0 60 16" aria-hidden="true">
                                <line x1="0" y1="8" x2="44" y2="8" stroke={theme.line} strokeWidth={1.2} />
                                <rect x="46" y="4" width="8" height="8" transform="rotate(45 50 8)" fill={theme.accent} />
                            </svg>
                            <AmpDiamond theme={theme} size={58} />
                            <svg width={60} height={16} viewBox="0 0 60 16" aria-hidden="true" style={{ transform: 'scaleX(-1)' }}>
                                <line x1="0" y1="8" x2="44" y2="8" stroke={theme.line} strokeWidth={1.2} />
                                <rect x="46" y="4" width="8" height="8" transform="rotate(45 50 8)" fill={theme.accent} />
                            </svg>
                        </div>
                    </Reveal>

                    <Reveal preview={preview} delay={0.25} style={{ textAlign: 'center', width: '100%' }}>
                        <h3
                            style={{
                                fontFamily: SERIF,
                                fontSize: 'clamp(30px, 7vw, 48px)',
                                fontWeight: 600,
                                color: theme.primary,
                                margin: 0,
                                lineHeight: 1.15,
                                letterSpacing: '0.06em',
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
            <Section theme={theme}>
                <SectionHeading
                    theme={theme}
                    eyebrow="Menuju Hari Bahagia"
                    title="Kira Detik Bahagia"
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
                                    letterSpacing: '0.04em',
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
                            <CountdownBox theme={theme} value={countdown.days} label="Hari" />
                            <CountdownBox theme={theme} value={countdown.hours} label="Jam" />
                            <CountdownBox theme={theme} value={countdown.minutes} label="Minit" />
                            <CountdownBox theme={theme} value={countdown.seconds} label="Saat" />
                        </div>
                    </Reveal>
                )}
            </Section>

            {/* ---------------------------------------------------------- */}
            {/* 5. ATUR CARA                                                */}
            {/* ---------------------------------------------------------- */}
            {data.program && data.program.length > 0 && (
                <Section theme={theme} background={altBg}>
                    <SectionHeading theme={theme} eyebrow="Rentak Majlis" title="Atur Cara" />

                    <div style={{ position: 'relative', maxWidth: 480, margin: '0 auto' }}>
                        <div
                            aria-hidden="true"
                            style={{
                                position: 'absolute',
                                left: 11,
                                top: 6,
                                bottom: 6,
                                width: 1,
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
                                        left: 3,
                                        top: 6,
                                        width: 15,
                                        height: 15,
                                        transform: 'rotate(45deg)',
                                        background: theme.accent,
                                        border: `2px solid ${theme.bg}`,
                                        boxShadow: `0 0 0 1px ${theme.accent}`,
                                    }}
                                />
                                <div
                                    style={{
                                        fontFamily: BODY,
                                        fontSize: 13,
                                        letterSpacing: '0.18em',
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
                                        letterSpacing: '0.04em',
                                    }}
                                >
                                    {item.title}
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </Section>
            )}

            {/* ---------------------------------------------------------- */}
            {/* 6. LOKASI                                                   */}
            {/* ---------------------------------------------------------- */}
            {(data.venueName || data.venueAddress || data.mapsUrl || data.wazeUrl) && (
                <Section theme={theme}>
                    <SectionHeading
                        theme={theme}
                        eyebrow="Tempat Berlangsung"
                        title="Lokasi Majlis"
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
                                        letterSpacing: '0.05em',
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
            )}

            {/* ---------------------------------------------------------- */}
            {/* 7. RSVP                                                     */}
            {/* ---------------------------------------------------------- */}
            {slots?.rsvp && (
                <Section theme={theme} background={altBg}>
                    <SectionHeading theme={theme} eyebrow="Khabarkan Kehadiran" title="RSVP Kehadiran" />
                    <Reveal preview={preview}>{slots.rsvp}</Reveal>
                </Section>
            )}

            {/* ---------------------------------------------------------- */}
            {/* 8. UCAPAN                                                   */}
            {/* ---------------------------------------------------------- */}
            <Section theme={theme}>
                <SectionHeading theme={theme} eyebrow="Doa & Restu" title="Ucapan Kasih" />
                <Reveal preview={preview}>
                    {slots?.wishes ?? (
                        <div
                            style={{
                                ...cardStyle,
                                padding: '34px 24px',
                                textAlign: 'center',
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
            </Section>

            {/* ---------------------------------------------------------- */}
            {/* 8b. SENARAI HADIAH                                          */}
            {/* ---------------------------------------------------------- */}
            {slots?.wishlist && (
                <Section theme={theme} background={altBg}>
                    <SectionHeading theme={theme} eyebrow="Tanda Ingatan" title="Senarai Hadiah" />
                    <Reveal preview={preview}>{slots.wishlist}</Reveal>
                </Section>
            )}

            {/* ---------------------------------------------------------- */}
            {/* 9. HUBUNGI                                                  */}
            {/* ---------------------------------------------------------- */}
            {data.contacts && data.contacts.length > 0 && (
                <Section theme={theme} background={altBg}>
                    <SectionHeading
                        theme={theme}
                        eyebrow="Sebarang Pertanyaan"
                        title="Hubungi"
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
                                        ...cardStyle,
                                        textDecoration: 'none',
                                        color: theme.text,
                                    }}
                                >
                                    <span
                                        style={{
                                            flex: '0 0 auto',
                                            width: 44,
                                            height: 44,
                                            transform: 'rotate(45deg)',
                                            background: theme.accent,
                                            color: theme.bg,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <span style={{ transform: 'rotate(-45deg)', display: 'flex' }}>
                                            <Phone size={19} />
                                        </span>
                                    </span>
                                    <span style={{ minWidth: 0 }}>
                                        <span
                                            style={{
                                                display: 'block',
                                                fontFamily: SERIF,
                                                fontSize: 20,
                                                color: theme.primary,
                                                lineHeight: 1.2,
                                                letterSpacing: '0.03em',
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
            )}

            {/* ---------------------------------------------------------- */}
            {/* 10. SALAM KASIH                                             */}
            {/* ---------------------------------------------------------- */}
            {data.gift && (data.gift.bankName || data.gift.accountNo || data.gift.accountName) && (
                <Section theme={theme}>
                    <SectionHeading
                        theme={theme}
                        eyebrow="Tanda Kasih"
                        title="Salam Kasih"
                        icon={<Gift size={15} />}
                    />
                    <Reveal preview={preview}>
                        <div
                            style={{
                                maxWidth: 420,
                                margin: '0 auto',
                                ...cardStyle,
                                padding: '30px 26px',
                                textAlign: 'center',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                                <span
                                    style={{
                                        width: 54,
                                        height: 54,
                                        transform: 'rotate(45deg)',
                                        border: `1.5px solid ${theme.accent}`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: theme.accent,
                                    }}
                                >
                                    <span style={{ transform: 'rotate(-45deg)', display: 'flex' }}>
                                        <Gift size={24} />
                                    </span>
                                </span>
                            </div>
                            {data.gift.bankName && (
                                <div
                                    style={{
                                        fontFamily: SERIF,
                                        fontSize: 26,
                                        color: theme.primary,
                                        letterSpacing: '0.04em',
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
                                            letterSpacing: '0.1em',
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
                                            padding: '10px 18px',
                                            fontSize: 12,
                                            background: copied ? theme.goldDeep : theme.accent,
                                            color: theme.bg,
                                            borderColor: copied ? theme.goldDeep : theme.accent,
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
            )}

            {/* ---------------------------------------------------------- */}
            {/* 11. GALERI                                                  */}
            {/* ---------------------------------------------------------- */}
            <Section theme={theme} background={altBg}>
                <SectionHeading
                    theme={theme}
                    eyebrow="Kenangan"
                    title="Galeri Memori"
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
                                          borderRadius: 0,
                                          overflow: 'hidden',
                                          border: `1px solid ${theme.line}`,
                                          boxShadow: `inset 0 0 0 4px ${theme.panelDeep}, inset 0 0 0 5px ${theme.lineFaint}`,
                                          aspectRatio: '3 / 4',
                                          background: theme.panelDeep,
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
                                          borderRadius: 0,
                                          border: `1px solid ${theme.line}`,
                                          aspectRatio: '3 / 4',
                                          background: theme.panelDeep,
                                          display: 'flex',
                                          flexDirection: 'column',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          gap: 10,
                                          color: theme.accent,
                                      }}
                                  >
                                      <DecoCorner theme={theme} />
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
            </Section>

            {/* ---------------------------------------------------------- */}
            {/* 12. FOOTER                                                  */}
            {/* ---------------------------------------------------------- */}
            <footer
                style={{
                    position: 'relative',
                    textAlign: 'center',
                    padding: 'clamp(60px, 11vw, 110px) 20px 48px',
                    overflow: 'hidden',
                }}
            >
                <Reveal preview={preview}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
                        <Sunburst theme={theme} shimmer={false} size={150} />
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 14,
                            flexWrap: 'wrap',
                            fontFamily: SERIF,
                            fontSize: 'clamp(26px, 6.6vw, 40px)',
                            fontWeight: 600,
                            color: theme.primary,
                            lineHeight: 1.2,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                        }}
                    >
                        {groomShort}
                        <AmpDiamond theme={theme} size={34} />
                        {brideShort}
                    </div>
                    <div
                        style={{
                            marginTop: 14,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            fontFamily: SERIF,
                            fontSize: 'clamp(20px, 5vw, 28px)',
                            color: theme.secondary,
                            letterSpacing: '0.05em',
                        }}
                    >
                        Terima Kasih
                        <Heart size={20} color={theme.accent} fill={theme.accent} />
                    </div>
                    <DecoDivider theme={theme} />
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
