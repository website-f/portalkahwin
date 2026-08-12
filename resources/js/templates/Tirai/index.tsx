// ============================================================
// Tirai Mawar — Romantic rose / curtain wedding e-invitation.
// Self-contained: every ornament is original inline SVG / CSS.
// No external images, fonts, CDNs or network requests.
//
// Signature cover: two blush-velvet drapery curtains start CLOSED,
// part outward on load, a shower of roses & petals blooms in, and
// the couple's monogram card zooms into view. Honours preview mode
// (quick reveal) and prefers-reduced-motion (instant, static reveal).
// ============================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
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
const BODY = "'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', sans-serif";
const ARABIC = "'Traditional Arabic', 'Scheherazade New', 'Amiri', 'Noto Naskh Arabic', serif";

// cubic-bezier used for the drapery pull (slow-in, gentle settle)
const CURTAIN_EASE: [number, number, number, number] = [0.62, 0, 0.28, 1];

// ---------- theme --------------------------------------------------------
interface Theme {
    primary: string;
    secondary: string;
    accent: string;
    bg: string;
    text: string;
    rose: string;
    roseDeep: string;
    blush: string;
    blushDeep: string;
    green: string;
    greenDeep: string;
    gold: string;
    card: string;
    line: string;
}

// =========================================================================
//  Original SVG ornaments
// =========================================================================

/** A layered spiral rose built from three rings of petals. */
function TiraiRose({
    size,
    theme,
    ariaLabel,
}: {
    size: number | string;
    theme: Theme;
    ariaLabel?: string;
}) {
    // ring config: petal count, scale, angular offset, fill colour
    const rings = useMemo(
        () => [
            { n: 9, s: 1, tilt: 0, fill: theme.rose, stroke: theme.roseDeep },
            { n: 7, s: 0.7, tilt: 25, fill: theme.blushDeep, stroke: theme.roseDeep },
            { n: 5, s: 0.44, tilt: -14, fill: theme.rose, stroke: theme.roseDeep },
        ],
        [theme.rose, theme.roseDeep, theme.blushDeep],
    );

    return (
        <svg
            width={size}
            height={size}
            viewBox="-50 -50 100 100"
            role={ariaLabel ? 'img' : undefined}
            aria-label={ariaLabel}
            aria-hidden={ariaLabel ? undefined : true}
            style={{ display: 'block', overflow: 'visible' }}
        >
            {rings.map((ring, ri) =>
                Array.from({ length: ring.n }, (_, i) => {
                    const a = (i / ring.n) * 360 + ring.tilt;
                    return (
                        <g key={`${ri}-${i}`} transform={`rotate(${a}) scale(${ring.s})`}>
                            <path
                                d="M0 0 C 13 -8 13 -27 0 -35 C -13 -27 -13 -8 0 0 Z"
                                fill={ring.fill}
                                stroke={ring.stroke}
                                strokeWidth={0.8}
                                opacity={0.94}
                            />
                        </g>
                    );
                }),
            )}
            {/* spiralled bud at the heart of the rose */}
            <circle r={7.5} fill={theme.roseDeep} />
            <path
                d="M0 -6 A6 6 0 1 1 -5 4 A3.6 3.6 0 1 0 2.6 2.4 A1.6 1.6 0 1 1 -0.6 -0.6"
                fill="none"
                stroke={theme.blush}
                strokeWidth={1.3}
                strokeLinecap="round"
            />
        </svg>
    );
}

/** Single rose petal — used for the blooming shower and ambient drift. */
function petalPath(color: string, opacity: number) {
    return <path d="M10 1 C 17 6 17 15 10 21 C 3 15 3 6 10 1 Z" fill={color} opacity={opacity} />;
}

/** A draped swag with a centre rosebud and two tassels — the section divider. */
function RoseDivider({ theme }: { theme: Theme }) {
    return (
        <svg
            width={240}
            height={38}
            viewBox="0 0 240 38"
            aria-hidden="true"
            style={{ display: 'block', margin: '18px auto 0' }}
        >
            <path
                d="M18 8 C 60 30 84 30 120 20 C 156 30 180 30 222 8"
                fill="none"
                stroke={theme.gold}
                strokeWidth={1.4}
                strokeLinecap="round"
            />
            {/* tassels */}
            <line x1="18" y1="8" x2="18" y2="24" stroke={theme.gold} strokeWidth={1.2} />
            <circle cx="18" cy="27" r="2.6" fill={theme.gold} />
            <line x1="222" y1="8" x2="222" y2="24" stroke={theme.gold} strokeWidth={1.2} />
            <circle cx="222" cy="27" r="2.6" fill={theme.gold} />
            {/* centre leaves */}
            <g transform="translate(104 22) rotate(-28) scale(0.42)">
                <path d="M0 0 C 9 -7 9 -22 0 -30 C -9 -22 -9 -7 0 0 Z" fill={theme.green} />
            </g>
            <g transform="translate(136 22) rotate(28) scale(0.42)">
                <path d="M0 0 C 9 -7 9 -22 0 -30 C -9 -22 -9 -7 0 0 Z" fill={theme.green} />
            </g>
            {/* centre bud */}
            <g transform="translate(120 20) scale(0.5)">
                <circle r="9" fill={theme.rose} />
                <path
                    d="M0 -6 A6 6 0 1 1 -5 4 A3.6 3.6 0 1 0 2.6 2.4"
                    fill="none"
                    stroke={theme.roseDeep}
                    strokeWidth={1.4}
                    strokeLinecap="round"
                />
            </g>
        </svg>
    );
}

/** A trailing rose vine for section corners. */
function CornerVine({ theme }: { theme: Theme }) {
    return (
        <svg width={130} height={130} viewBox="0 0 130 130" aria-hidden="true">
            <path
                d="M6 6 C 44 22 74 52 92 104"
                fill="none"
                stroke={theme.greenDeep}
                strokeWidth={2}
                strokeLinecap="round"
            />
            {[
                { x: 26, y: 24, r: -40 },
                { x: 46, y: 46, r: -24 },
                { x: 64, y: 70, r: -8 },
                { x: 82, y: 96, r: 8 },
                { x: 20, y: 36, r: -84 },
                { x: 40, y: 60, r: -66 },
            ].map((leaf, i) => (
                <g key={i} transform={`translate(${leaf.x} ${leaf.y}) rotate(${leaf.r}) scale(0.5)`}>
                    <path
                        d="M0 0 C 8 -6 8 -20 0 -28 C -8 -20 -8 -6 0 0 Z"
                        fill={i % 2 ? theme.green : theme.greenDeep}
                    />
                </g>
            ))}
            <g transform="translate(98 108) scale(0.8)">
                <TiraiRose size={30} theme={theme} />
            </g>
            <g transform="translate(20 12) scale(0.5)">
                <TiraiRose size={22} theme={theme} />
            </g>
        </svg>
    );
}

/** Scalloped velvet valance (pelmet) draped across the top of the cover. */
function Valance({ theme }: { theme: Theme }) {
    const scallops = 12;
    const w = 1200;
    const seg = w / scallops;
    const path = useMemo(() => {
        let d = `M0 0 H${w} V34 `;
        for (let i = scallops; i > 0; i--) {
            const x1 = (i - 1) * seg;
            const cx = (i * seg + x1) / 2;
            d += `Q ${cx} 104 ${x1} 34 `;
        }
        d += 'Z';
        return d;
    }, [seg]);

    const tassels = useMemo(
        () => Array.from({ length: scallops }, (_, i) => (i + 0.5) * seg),
        [seg],
    );

    return (
        <svg
            viewBox={`0 0 ${w} 120`}
            preserveAspectRatio="none"
            width="100%"
            height="110"
            aria-hidden="true"
            style={{ display: 'block' }}
        >
            <defs>
                <linearGradient id="tk-valance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={theme.roseDeep} />
                    <stop offset="55%" stopColor={theme.rose} />
                    <stop offset="100%" stopColor={theme.blushDeep} />
                </linearGradient>
            </defs>
            <path d={path} fill="url(#tk-valance)" />
            {/* fold shading */}
            {Array.from({ length: scallops * 2 }, (_, i) => (
                <line
                    key={i}
                    x1={i * (seg / 2)}
                    y1={0}
                    x2={i * (seg / 2)}
                    y2={70}
                    stroke={i % 2 ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'}
                    strokeWidth={seg / 4}
                />
            ))}
            <path d={path} fill="none" stroke={theme.gold} strokeWidth={2} opacity={0.7} />
            {tassels.map((x, i) => (
                <g key={i}>
                    <line x1={x} y1={96} x2={x} y2={112} stroke={theme.gold} strokeWidth={2} />
                    <circle cx={x} cy={114} r={4} fill={theme.gold} />
                </g>
            ))}
        </svg>
    );
}

// =========================================================================
//  Motion helpers
// =========================================================================

/** Scroll-triggered reveal; static in preview or when motion is reduced. */
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
    const rm = useReducedMotion();
    if (preview || rm) {
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
            <RoseDivider theme={theme} />
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
        // guard against an unparseable ISO string — no ticking needed
        if (Number.isNaN(new Date(target).getTime())) return;
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
                minWidth: 72,
                padding: '16px 10px',
                borderRadius: 16,
                background: theme.card,
                border: `1px solid ${theme.line}`,
                boxShadow: '0 8px 24px rgba(125,47,70,0.10)',
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
//  Layout primitive
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
            <div style={{ maxWidth: 720, margin: '0 auto', position: 'relative', zIndex: 1 }}>
                {children}
            </div>
        </section>
    );
}

// =========================================================================
//  Main template
// =========================================================================

export default function TiraiTemplate({ data, preview, slots }: TemplateProps) {
    const tr = useCardText();
    const p = data.palette;
    const theme: Theme = {
        // blush + rose defaults; overridable via data.palette
        primary: p?.primary ?? '#7d2f46',
        secondary: p?.secondary ?? '#a86a7c',
        accent: p?.accent ?? '#c86b86',
        bg: p?.bg ?? '#fbf1f2',
        text: p?.text ?? '#5a3a44',
        rose: '#d98aa0',
        roseDeep: '#b0506d',
        blush: '#f7dde3',
        blushDeep: '#e9b4c1',
        green: '#a3bd9c',
        greenDeep: '#6f9070',
        gold: '#c9a15a',
        card: '#fffafb',
        line: 'rgba(176,80,109,0.28)',
    };

    const rm = useReducedMotion();
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

    // ---- cover parallax -------------------------------------------------
    const coverRef = useRef<HTMLElement>(null);
    const { scrollYProgress } = useScroll({
        target: coverRef,
        offset: ['start start', 'end start'],
    });
    const contentParallax = useTransform(scrollYProgress, [0, 1], [0, 70]);
    const petalParallax = useTransform(scrollYProgress, [0, 1], [0, 130]);
    const valanceParallax = useTransform(scrollYProgress, [0, 1], [0, -34]);

    // ---- animation timing (quick in preview, instant when reduced) ------
    const curtainTransition = rm
        ? { duration: 0 }
        : { duration: preview ? 0.7 : 1.7, delay: preview ? 0.05 : 0.4, ease: CURTAIN_EASE };
    const cardDelay = rm ? 0 : preview ? 0.25 : 1.35;
    const cardDuration = preview ? 0.6 : 1.15;
    const bloomBase = rm ? 0 : preview ? 0.15 : 1.5;

    // ---- blooming petal shower -----------------------------------------
    const bloomPetals = useMemo(() => {
        const palette = [theme.rose, theme.blushDeep, theme.accent, theme.green];
        return Array.from({ length: 16 }, (_, i) => ({
            key: i,
            left: (i * 37 + 7) % 100,
            top: (i * 53 + 11) % 100,
            size: 12 + ((i * 5) % 4) * 6,
            color: palette[i % palette.length],
            rot: (i * 47) % 360,
            fromX: (((i * 29) % 100) - 50) * 1.4,
            fromY: (((i * 61) % 100) - 50) * 1.4,
            delay: bloomBase + (i % 9) * 0.055,
            opacity: 0.55 + ((i * 3) % 4) * 0.12,
        }));
    }, [theme.rose, theme.blushDeep, theme.accent, theme.green, bloomBase]);

    // ---- ambient drifting petals (skipped in preview / reduced) ---------
    const ambientPetals = useMemo(
        () =>
            Array.from({ length: 14 }, (_, i) => ({
                key: i,
                left: (i * 7.7 + 4) % 100,
                delay: (i % 7) * 1.3,
                dur: 10 + (i % 5) * 2,
                size: 11 + (i % 4) * 5,
                color: [theme.rose, theme.blushDeep, theme.green][i % 3],
                rot: (i * 53) % 360,
                opacity: 0.55 + (i % 3) * 0.12,
            })),
        [theme.rose, theme.blushDeep, theme.green],
    );

    const rootStyle: CSSProperties = {
        fontFamily: BODY,
        fontSize: 18,
        lineHeight: 1.7,
        color: theme.text,
        background: theme.bg,
        backgroundImage: `radial-gradient(120% 60% at 50% 0%, rgba(255,255,255,0.6), rgba(255,255,255,0) 55%)`,
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

    // shared velvet fold overlay for the drapes
    const foldOverlay =
        'repeating-linear-gradient(90deg, rgba(0,0,0,0.16) 0px, rgba(0,0,0,0.16) 3px, rgba(255,255,255,0.08) 22px, rgba(255,255,255,0.13) 36px)';

    const cardZoomInitial = rm
        ? false
        : { opacity: 0, scale: preview ? 0.9 : 0.6 };

    return (
        <div style={rootStyle}>
            <style>{`
                @keyframes tk-fall {
                    0%   { transform: translateY(-14vh) rotate(0deg); opacity: 0; }
                    12%  { opacity: 0.85; }
                    100% { transform: translateY(116vh) rotate(360deg); opacity: 0; }
                }
                @media (prefers-reduced-motion: reduce) {
                    * { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; }
                }
            `}</style>

            {/* ---------------------------------------------------------- */}
            {/* 1. COVER — curtain → floral bloom → zoom                    */}
            {/* ---------------------------------------------------------- */}
            <section
                ref={coverRef}
                style={{
                    position: 'relative',
                    minHeight: 'var(--pk-vh, 100vh)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    padding: '110px 20px 60px',
                    // Clear the absolutely-positioned scroll cue below (~66px tall from the
                    // bottom edge) so centred content can never sit underneath it.
                    paddingBottom: 'var(--pk-cue-clear, 96px)',
                    overflow: 'hidden',
                    background: `radial-gradient(120% 90% at 50% 20%, ${theme.blush}, ${theme.bg} 70%)`,
                }}
            >
                {/* ambient drifting petals (behind content) */}
                {!preview && !rm && (
                    <motion.div
                        aria-hidden="true"
                        style={{
                            position: 'absolute',
                            inset: 0,
                            overflow: 'hidden',
                            pointerEvents: 'none',
                            zIndex: 1,
                            y: petalParallax,
                        }}
                    >
                        {ambientPetals.map((pt) => (
                            <svg
                                key={pt.key}
                                width={pt.size}
                                height={pt.size}
                                viewBox="0 0 20 22"
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: `${pt.left}%`,
                                    transform: `rotate(${pt.rot}deg)`,
                                    animation: `tk-fall ${pt.dur}s linear ${pt.delay}s infinite`,
                                    willChange: 'transform',
                                }}
                            >
                                {petalPath(pt.color, pt.opacity)}
                            </svg>
                        ))}
                    </motion.div>
                )}

                {/* cover content — revealed as the curtains part */}
                <motion.div
                    style={{
                        position: 'relative',
                        zIndex: 2,
                        width: '100%',
                        maxWidth: 560,
                        y: rm ? 0 : contentParallax,
                    }}
                >
                    {data.bismillah && (
                        <motion.div
                            initial={rm ? false : { opacity: 0, y: -12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                                duration: preview ? 0.6 : 1.1,
                                delay: rm ? 0 : cardDelay + 0.2,
                                ease: 'easeOut',
                            }}
                            style={{ direction: 'rtl', marginBottom: 22 }}
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

                    <motion.div
                        initial={cardZoomInitial}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: cardDuration, delay: cardDelay, ease: 'easeOut' }}
                        style={{
                            position: 'relative',
                            background: theme.card,
                            border: `1px solid ${theme.line}`,
                            borderRadius: 26,
                            padding: 'clamp(30px, 7vw, 48px) clamp(20px, 6vw, 40px)',
                            boxShadow: '0 26px 60px rgba(125,47,70,0.18)',
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                            <TiraiRose size="clamp(76px, 18vw, 108px)" theme={theme} ariaLabel="Sekuntum mawar" />
                        </div>
                        <div
                            style={{
                                fontFamily: BODY,
                                fontSize: 12,
                                letterSpacing: '0.34em',
                                textTransform: 'uppercase',
                                color: theme.accent,
                                marginBottom: 8,
                            }}
                        >
                            {tr("Walimatulurus")}
                        </div>
                        <div
                            style={{
                                fontFamily: SERIF,
                                fontSize: 'clamp(34px, 9vw, 52px)',
                                fontWeight: 600,
                                color: theme.primary,
                                lineHeight: 1.05,
                            }}
                        >
                            {groomShort}
                        </div>
                        <div
                            style={{
                                fontFamily: SERIF,
                                fontStyle: 'italic',
                                fontSize: 'clamp(24px, 6vw, 34px)',
                                color: theme.rose,
                                margin: '2px 0',
                            }}
                        >
                            &amp;
                        </div>
                        <div
                            style={{
                                fontFamily: SERIF,
                                fontSize: 'clamp(34px, 9vw, 52px)',
                                fontWeight: 600,
                                color: theme.primary,
                                lineHeight: 1.05,
                            }}
                        >
                            {brideShort}
                        </div>
                        <RoseDivider theme={theme} />
                        {data.dateLabel && (
                            <div
                                style={{
                                    fontFamily: SERIF,
                                    fontSize: 'clamp(18px, 4.5vw, 24px)',
                                    color: theme.secondary,
                                    marginTop: 14,
                                }}
                            >
                                {data.dateLabel}
                            </div>
                        )}
                    </motion.div>
                </motion.div>

                {/* blooming rose/petal shower (front, over content) */}
                <div
                    aria-hidden="true"
                    style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3, overflow: 'hidden' }}
                >
                    {bloomPetals.map((pt) => (
                        <motion.svg
                            key={pt.key}
                            width={pt.size}
                            height={pt.size}
                            viewBox="0 0 20 22"
                            style={{ position: 'absolute', top: `${pt.top}%`, left: `${pt.left}%` }}
                            initial={
                                rm
                                    ? false
                                    : { opacity: 0, scale: 0.2, x: pt.fromX, y: pt.fromY, rotate: pt.rot - 60 }
                            }
                            animate={{ opacity: pt.opacity, scale: 1, x: 0, y: 0, rotate: pt.rot }}
                            transition={{ duration: preview ? 0.5 : 1, delay: pt.delay, ease: 'easeOut' }}
                        >
                            {petalPath(pt.color, 1)}
                        </motion.svg>
                    ))}
                </div>

                {/* the two blush-velvet drapes — closed, then part outward */}
                <motion.div
                    aria-hidden="true"
                    initial={rm ? false : { x: '0%' }}
                    animate={{ x: '-102%' }}
                    transition={curtainTransition}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '53%',
                        height: '100%',
                        zIndex: 6,
                        backgroundImage: `${foldOverlay}, linear-gradient(90deg, ${theme.roseDeep} 0%, ${theme.rose} 58%, ${theme.blushDeep} 100%)`,
                        borderRight: `2px solid ${theme.gold}`,
                        boxShadow: 'inset -26px 0 46px rgba(0,0,0,0.20), 8px 0 26px rgba(125,47,70,0.25)',
                    }}
                >
                    {/* gold tie-back tassel near the inner edge */}
                    <svg width="70" height="120" viewBox="0 0 70 120" style={{ position: 'absolute', right: 6, top: '42%' }}>
                        <path d="M4 8 C 40 26 40 26 66 8" fill="none" stroke={theme.gold} strokeWidth={4} strokeLinecap="round" />
                        <circle cx="35" cy="30" r="8" fill={theme.gold} />
                        <line x1="35" y1="36" x2="35" y2="70" stroke={theme.gold} strokeWidth={3} />
                        <circle cx="35" cy="74" r="5" fill={theme.gold} />
                    </svg>
                </motion.div>
                <motion.div
                    aria-hidden="true"
                    initial={rm ? false : { x: '0%' }}
                    animate={{ x: '102%' }}
                    transition={curtainTransition}
                    style={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        width: '53%',
                        height: '100%',
                        zIndex: 6,
                        backgroundImage: `${foldOverlay}, linear-gradient(90deg, ${theme.blushDeep} 0%, ${theme.rose} 42%, ${theme.roseDeep} 100%)`,
                        borderLeft: `2px solid ${theme.gold}`,
                        boxShadow: 'inset 26px 0 46px rgba(0,0,0,0.20), -8px 0 26px rgba(125,47,70,0.25)',
                    }}
                >
                    <svg width="70" height="120" viewBox="0 0 70 120" style={{ position: 'absolute', left: 6, top: '42%' }}>
                        <path d="M4 8 C 30 26 30 26 66 8" fill="none" stroke={theme.gold} strokeWidth={4} strokeLinecap="round" />
                        <circle cx="35" cy="30" r="8" fill={theme.gold} />
                        <line x1="35" y1="36" x2="35" y2="70" stroke={theme.gold} strokeWidth={3} />
                        <circle cx="35" cy="74" r="5" fill={theme.gold} />
                    </svg>
                </motion.div>

                {/* fixed valance / pelmet across the very top */}
                <motion.div
                    aria-hidden="true"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        zIndex: 7,
                        y: rm ? 0 : valanceParallax,
                    }}
                >
                    <Valance theme={theme} />
                </motion.div>

                {/* scroll cue */}
                <motion.div
                    initial={rm ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: rm ? 0 : preview ? 0.6 : 2.4 }}
                    style={{
                        position: 'absolute',
                        bottom: 24,
                        left: 0,
                        right: 0,
                        zIndex: 8,
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
                        animate={rm ? undefined : { y: [0, 9, 0] }}
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
                                <Heart size={22} color={theme.rose} fill={theme.blush} />
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
                            <RoseDivider theme={theme} />
                        </div>
                    </Reveal>
                </Section>
            )}

            {/* ---------------------------------------------------------- */}
            {/* 3. COUPLE                                                   */}
            {/* ---------------------------------------------------------- */}
            <Section background="rgba(255,255,255,0.45)">
                <SectionHeading theme={theme} eyebrow={tr("Pasangan Bahagia")} title={tr("Pengantin")} />

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26 }}>
                    <Reveal preview={preview} delay={0.05} style={{ textAlign: 'center', width: '100%' }}>
                        <h3
                            style={{
                                fontFamily: SERIF,
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

                    <Reveal preview={preview} delay={0.15} style={{ width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
                            <div style={{ height: 1, width: 60, background: theme.line }} />
                            <TiraiRose size={40} theme={theme} />
                            <span
                                style={{
                                    fontFamily: SERIF,
                                    fontStyle: 'italic',
                                    fontSize: 'clamp(34px, 8vw, 52px)',
                                    color: theme.rose,
                                    lineHeight: 1,
                                }}
                            >
                                &amp;
                            </span>
                            <TiraiRose size={40} theme={theme} />
                            <div style={{ height: 1, width: 60, background: theme.line }} />
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
            {/* 4. DATE + LIVE COUNTDOWN                                    */}
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
            {data.program && data.program.length > 0 && (
                <Section background="rgba(255,255,255,0.45)">
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
                                        left: 4,
                                        top: 6,
                                        width: 16,
                                        height: 16,
                                        borderRadius: '50%',
                                        background: theme.rose,
                                        border: `3px solid ${theme.bg}`,
                                        boxShadow: `0 0 0 1px ${theme.rose}`,
                                    }}
                                />
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
            )}

            {/* ---------------------------------------------------------- */}
            {/* 6. LOKASI                                                   */}
            {/* ---------------------------------------------------------- */}
            {(data.venueName || data.venueAddress || data.mapsUrl || data.wazeUrl) && (
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
                            {(data.mapsUrl || data.wazeUrl) && (
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
                                                color: '#fff',
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
                                            style={{ ...buttonBase, background: 'transparent', color: theme.primary }}
                                        >
                                            <Navigation size={17} />
                                            Waze
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>
                    </Reveal>
                </Section>
            )}

            {/* ---------------------------------------------------------- */}
            {/* 7. RSVP                                                     */}
            {/* ---------------------------------------------------------- */}
            {slots?.rsvp && (
                <Section background="rgba(255,255,255,0.45)">
                    <SectionHeading theme={theme} eyebrow={tr("Khabarkan Kehadiran")} title={tr("RSVP Kehadiran")} />
                    <Reveal preview={preview}>{slots.rsvp}</Reveal>
                </Section>
            )}

            {/* ---------------------------------------------------------- */}
            {/* 8. UCAPAN                                                   */}
            {/* ---------------------------------------------------------- */}
            <Section>
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
                                boxShadow: '0 12px 30px rgba(125,47,70,0.08)',
                            }}
                        >
                            <p style={{ margin: 0, color: theme.secondary, fontSize: 17 }}>
                                Ruangan ucapan akan dipaparkan di sini.
                            </p>
                            <p
                                style={{
                                    margin: '6px 0 0',
                                    color: theme.secondary,
                                    fontSize: 14,
                                    fontStyle: 'italic',
                                }}
                            >
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
                <Section>
                    <SectionHeading theme={theme} eyebrow={tr("Tanda Ingatan")} title={tr("Senarai Hadiah")} />
                    <Reveal preview={preview}>{slots.wishlist}</Reveal>
                </Section>
            )}

            {/* ---------------------------------------------------------- */}
            {/* 9. HUBUNGI                                                  */}
            {/* ---------------------------------------------------------- */}
            {data.contacts && data.contacts.length > 0 && (
                <Section background="rgba(255,255,255,0.45)">
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
                                        boxShadow: '0 8px 20px rgba(125,47,70,0.06)',
                                    }}
                                >
                                    <span
                                        style={{
                                            flex: '0 0 auto',
                                            width: 44,
                                            height: 44,
                                            borderRadius: '50%',
                                            background: theme.accent,
                                            color: '#fff',
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
            )}

            {/* ---------------------------------------------------------- */}
            {/* 10. SALAM KAUT                                              */}
            {/* ---------------------------------------------------------- */}
            {data.gift && (data.gift.bankName || data.gift.accountNo || data.gift.accountName) && (
                <Section>
                    <SectionHeading theme={theme} eyebrow={tr("Tanda Kasih")} title={tr("Salam Kaut")} icon={<Gift size={15} />} />
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
                                boxShadow: '0 14px 34px rgba(125,47,70,0.10)',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                                <span
                                    style={{
                                        width: 54,
                                        height: 54,
                                        borderRadius: '50%',
                                        background: 'rgba(200,107,134,0.14)',
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
                                <div style={{ fontFamily: SERIF, fontSize: 26, color: theme.primary }}>
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
                                            background: copied ? theme.greenDeep : theme.accent,
                                            color: '#fff',
                                            borderColor: copied ? theme.greenDeep : theme.accent,
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
            <Section background="rgba(255,255,255,0.45)">
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
                                          boxShadow: '0 10px 24px rgba(125,47,70,0.08)',
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
                                          background: 'rgba(200,107,134,0.06)',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          gap: 10,
                                          color: theme.accent,
                                      }}
                                  >
                                      <CornerVine theme={theme} />
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
                        <TiraiRose size={120} theme={theme} ariaLabel="Mawar penutup" />
                    </div>
                    <div
                        style={{
                            fontFamily: SERIF,
                            fontSize: 'clamp(28px, 7vw, 42px)',
                            fontWeight: 600,
                            color: theme.primary,
                            lineHeight: 1.2,
                        }}
                    >
                        {groomShort}
                        <span style={{ color: theme.rose, fontStyle: 'italic', margin: '0 12px' }}>&amp;</span>
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
                        <Heart size={20} color={theme.roseDeep} fill={theme.blush} />
                    </div>
                    <RoseDivider theme={theme} />
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
                            color={theme.roseDeep}
                            style={{ display: 'inline', verticalAlign: 'middle', margin: '0 2px' }}
                        />{' '}
                        PortalKahwin
                    </div>
                </Reveal>
            </footer>
        </div>
    );
}
