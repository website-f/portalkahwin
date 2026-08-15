// ============================================================
// Floral / Botanical wedding e-invitation template.
// Self-contained: all ornaments are original inline SVG / CSS.
// No external images, fonts, CDNs or network requests.
// ============================================================

import { useEffect, useMemo, useState } from 'react';
import { BrandLogo } from '../../components/BrandLogo';
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
import { REVEAL_TIMING, TEMPLATE_ART, groundPattern } from '../templateArt';

/**
 * Entrance personality for this design, from its art direction — the
 * catalogue used to share one easing curve, which made every card feel
 * the same however differently it was coloured.
 */
const MOTION = REVEAL_TIMING[TEMPLATE_ART['floral'].reveal];


// ---------- typography ---------------------------------------------------
const SERIF = "'Cormorant Garamond', 'Playfair Display', Georgia, 'Times New Roman', serif";
const NAMES = "var(--pk-name, 'Cormorant Garamond'), 'Playfair Display', Georgia, 'Times New Roman', serif";
const BODY = "'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', sans-serif";
const ARABIC = "'Traditional Arabic', 'Scheherazade New', 'Amiri', 'Noto Naskh Arabic', serif";

// ---------- theme --------------------------------------------------------
interface Theme {
    primary: string;
    secondary: string;
    accent: string;
    bg: string;
    text: string;
    sage: string;
    sageDeep: string;
    blush: string;
    blushDeep: string;
    card: string;
    line: string;
}

// =========================================================================
//  Small original SVG ornaments
// =========================================================================

function WreathLeaf({ fill }: { fill: string }) {
    return (
        <g>
            <path d="M0 0 C 7 -11 7 -27 0 -38 C -7 -27 -7 -11 0 0 Z" fill={fill} />
            <path d="M0 -3 L0 -34" stroke="rgba(0,0,0,0.12)" strokeWidth={1} fill="none" />
        </g>
    );
}

function Rose({ fill, stroke }: { fill: string; stroke: string }) {
    return (
        <g>
            <circle r={13} fill={fill} />
            <path
                d="M0 -8 A8 8 0 1 1 -6.5 5.5 A5 5 0 1 0 3.5 3 A2.6 2.6 0 1 1 -1 -1"
                fill="none"
                stroke={stroke}
                strokeWidth={1.5}
                strokeLinecap="round"
            />
        </g>
    );
}

/** A blooming circular wreath drawn from leaves + roses. */
function FloralWreath({ theme, size }: { theme: Theme; size: number | string }) {
    const cx = 200;
    const cy = 200;
    const R = 150;
    const N = 46;

    const leaves = useMemo(
        () =>
            Array.from({ length: N }, (_, i) => {
                const a = (i / N) * Math.PI * 2 - Math.PI / 2;
                const x = cx + Math.cos(a) * R;
                const y = cy + Math.sin(a) * R;
                const deg = (a * 180) / Math.PI + 90 + (i % 2 ? 34 : -34);
                const s = 0.72 + ((i * 7) % 5) * 0.09;
                return {
                    key: i,
                    x,
                    y,
                    deg,
                    s,
                    fill: i % 2 ? theme.sage : theme.sageDeep,
                };
            }),
        [theme.sage, theme.sageDeep],
    );

    const roses = useMemo(() => {
        const angles = [-90, 138, 42, 200, -20];
        return angles.map((deg, i) => {
            const a = (deg * Math.PI) / 180;
            return {
                key: i,
                x: cx + Math.cos(a) * R,
                y: cy + Math.sin(a) * R,
                s: i === 0 ? 1.15 : 0.85 + (i % 2) * 0.15,
                fill: i % 2 ? theme.blush : theme.accent,
                stroke: i % 2 ? theme.blushDeep : '#a9812f',
            };
        });
    }, [theme.blush, theme.blushDeep, theme.accent]);

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 400 400"
            role="img"
            aria-label="Floral wreath"
            style={{ display: 'block', overflow: 'visible' }}
        >
            {leaves.map((l) => (
                <g key={l.key} transform={`translate(${l.x} ${l.y}) rotate(${l.deg}) scale(${l.s})`}>
                    <WreathLeaf fill={l.fill} />
                </g>
            ))}
            {roses.map((r) => (
                <g key={`r${r.key}`} transform={`translate(${r.x} ${r.y}) scale(${r.s})`}>
                    <Rose fill={r.fill} stroke={r.stroke} />
                </g>
            ))}
        </svg>
    );
}

/** A little leafy sprig for section corners. */
function CornerSprig({ theme }: { theme: Theme }) {
    return (
        <svg width={120} height={120} viewBox="0 0 120 120" aria-hidden="true">
            <path
                d="M8 8 C 40 24 66 52 82 96"
                fill="none"
                stroke={theme.sageDeep}
                strokeWidth={2}
                strokeLinecap="round"
            />
            {[
                { x: 26, y: 24, r: -35 },
                { x: 44, y: 44, r: -20 },
                { x: 60, y: 64, r: -5 },
                { x: 74, y: 86, r: 10 },
                { x: 20, y: 34, r: -80 },
                { x: 38, y: 56, r: -65 },
                { x: 56, y: 78, r: -50 },
            ].map((leaf, i) => (
                <g key={i} transform={`translate(${leaf.x} ${leaf.y}) rotate(${leaf.r}) scale(0.55)`}>
                    <path
                        d="M0 0 C 7 -11 7 -27 0 -38 C -7 -27 -7 -11 0 0 Z"
                        fill={i % 2 ? theme.sage : theme.sageDeep}
                    />
                </g>
            ))}
            <g transform="translate(88 100) scale(0.8)">
                <circle r={9} fill={theme.blush} />
                <path
                    d="M0 -6 A6 6 0 1 1 -5 4 A3.6 3.6 0 1 0 2.6 2.4"
                    fill="none"
                    stroke={theme.blushDeep}
                    strokeWidth={1.3}
                    strokeLinecap="round"
                />
            </g>
        </svg>
    );
}

/** Divider: line, leaves and a centre diamond. */
function Divider({ theme }: { theme: Theme }) {
    return (
        <svg
            width={220}
            height={26}
            viewBox="0 0 220 26"
            aria-hidden="true"
            style={{ display: 'block', margin: '18px auto 0' }}
        >
            <line x1="20" y1="13" x2="90" y2="13" stroke={theme.accent} strokeWidth={1.2} />
            <line x1="130" y1="13" x2="200" y2="13" stroke={theme.accent} strokeWidth={1.2} />
            <g transform="translate(96 13) rotate(-25) scale(0.6)">
                <path d="M0 0 C 7 -11 7 -27 0 -38 C -7 -27 -7 -11 0 0 Z" fill={theme.sageDeep} />
            </g>
            <g transform="translate(124 13) rotate(25) scale(0.6)">
                <path d="M0 0 C 7 -11 7 -27 0 -38 C -7 -27 -7 -11 0 0 Z" fill={theme.sageDeep} />
            </g>
            <rect x="106" y="6" width="8" height="8" transform="rotate(45 110 10)" fill={theme.accent} />
        </svg>
    );
}

/**
 * Signature rose-petal rain — petals gently fall while swaying side to side.
 * GPU-cheap: the outer span owns the vertical fall (transform: translateY),
 * the inner petal owns the sway + tumble (transform), and both animate only
 * transform/opacity. Capped at 14 elements.
 */
function Petals({ theme }: { theme: Theme }) {
    const items = useMemo(
        () =>
            Array.from({ length: 14 }, (_, i) => ({
                key: i,
                left: (i * 7.3 + 3) % 100,
                delay: (i % 7) * 1.4,
                fall: 9 + (i % 5) * 2,
                sway: 2.6 + (i % 4) * 0.7,
                size: 11 + (i % 4) * 5,
                color: [theme.blush, theme.accent, theme.sage][i % 3],
            })),
        [theme.blush, theme.accent, theme.sage],
    );
    return (
        <div
            aria-hidden="true"
            style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}
        >
            {items.map((p) => (
                <span
                    key={p.key}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: `${p.left}%`,
                        animation: `pk-fall ${p.fall}s linear ${p.delay}s infinite`,
                        willChange: 'transform',
                    }}
                >
                    <svg
                        width={p.size}
                        height={p.size}
                        viewBox="0 0 20 20"
                        style={{
                            display: 'block',
                            animation: `pk-sway ${p.sway}s ease-in-out ${p.delay}s infinite alternate`,
                            willChange: 'transform',
                        }}
                    >
                        <path d="M10 1 C 15 5 15 13 10 19 C 5 13 5 5 10 1 Z" fill={p.color} opacity={0.7} />
                    </svg>
                </span>
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
    y = MOTION.y,
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
            transition={{ duration: MOTION.duration, delay, ease: MOTION.ease }}
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
            <Divider theme={theme} />
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
                boxShadow: '0 8px 24px rgba(91,58,46,0.08)',
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

/**
 * A garland of roses and leaves that drifts gently across the very top of the
 * card. Built as a doubled strip translated by exactly half its width, so the
 * loop is seamless; every flower also bobs. Transform + opacity only — GPU
 * composited, so it stays smooth on a phone — capped at ~18 SVGs, and the
 * reduced-motion rule freezes it.
 */
function FloralTopGarland({ theme }: { theme: Theme }) {
    const N = 9;
    const strip = (dupe: boolean) => (
        <div className="fl-gar-strip">
            {Array.from({ length: N }, (_, i) => {
                const isRose = i % 2 === 0;
                const size = 24 + (i % 3) * 9;
                return (
                    <span key={`${dupe ? 'd' : ''}${i}`} className="fl-gar-item" style={{ animationDelay: `${(i % 5) * 0.5}s` }}>
                        {isRose ? (
                            <svg width={size} height={size} viewBox="-16 -16 32 32">
                                <Rose fill={i % 4 ? theme.blush : theme.accent} stroke={i % 4 ? theme.blushDeep : '#a9812f'} />
                            </svg>
                        ) : (
                            <svg width={size * 0.7} height={size} viewBox="-9 -40 18 42" style={{ transform: i % 3 ? 'rotate(-14deg)' : 'rotate(12deg)' }}>
                                <WreathLeaf fill={i % 3 ? theme.sage : theme.sageDeep} />
                            </svg>
                        )}
                    </span>
                );
            })}
        </div>
    );
    return (
        <div className="fl-gar" aria-hidden="true">
            <div className="fl-gar-track">{strip(false)}{strip(true)}</div>
        </div>
    );
}

// =========================================================================
//  Main template
// =========================================================================

export default function FloralTemplate({ data, preview, slots }: TemplateProps) {
    const tr = useCardText();
    const reduce = useReducedMotion() ?? false;
    const p = data.palette;
    const theme: Theme = {
        primary: p?.primary ?? '#5b3a2e',
        secondary: p?.secondary ?? '#8a6d5f',
        accent: p?.accent ?? '#c9a24b',
        bg: p?.bg ?? '#f6efe6',
        text: p?.text ?? '#4a3b33',
        sage: '#9aab88',
        sageDeep: '#6f8060',
        blush: '#e2b3ad',
        blushDeep: '#c98a86',
        card: '#fffaf3',
        line: 'rgba(201,162,75,0.35)',
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
        backgroundImage: `${groundPattern('trellis', theme.accent, 0.05)}, radial-gradient(120% 60% at 50% 0%, rgba(255,255,255,0.55), rgba(255,255,255,0) 55%)`,
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

    const wreathSize = 'min(84vw, 440px)';

    return (
        <div style={rootStyle}>
            <style>{`
                @keyframes pk-fall {
                    0%   { transform: translateY(-12vh); opacity: 0; }
                    10%  { opacity: 0.85; }
                    90%  { opacity: 0.85; }
                    100% { transform: translateY(112vh); opacity: 0; }
                }
                @keyframes pk-sway {
                    0%   { transform: translateX(-11px) rotate(-22deg); }
                    100% { transform: translateX(11px) rotate(22deg); }
                }
                @keyframes pk-gar-drift { from { transform: translateX(0); } to { transform: translateX(-50%); } }
                @keyframes pk-gar-bob { 0%,100% { transform: translateY(0) rotate(-3deg); } 50% { transform: translateY(4px) rotate(3deg); } }
                .fl-gar { position: absolute; top: 0; left: 0; right: 0; height: 60px; overflow: hidden; pointer-events: none; z-index: 2; }
                .fl-gar-track { display: flex; width: max-content; animation: pk-gar-drift 40s linear infinite; will-change: transform; }
                .fl-gar-strip { display: flex; align-items: flex-start; gap: 26px; padding: 4px 13px 0; }
                .fl-gar-item { display: block; transform-origin: 50% 0; animation: pk-gar-bob 4.6s ease-in-out infinite; will-change: transform; }
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
                }}
            >
                {!preview && !reduce && <Petals theme={theme} />}
                {!reduce && <FloralTopGarland theme={theme} />}

                <div style={{ position: 'absolute', top: 0, left: 0, zIndex: 1, opacity: 0.85 }}>
                    <CornerSprig theme={theme} />
                </div>
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        zIndex: 1,
                        opacity: 0.85,
                        transform: 'scaleX(-1)',
                    }}
                >
                    <CornerSprig theme={theme} />
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
                            width: wreathSize,
                            height: wreathSize,
                            margin: '0 auto',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <motion.div
                            initial={preview ? false : { opacity: 0, scale: 0.68, rotate: -12 }}
                            animate={preview ? undefined : { opacity: 1, scale: 1, rotate: 0 }}
                            transition={{ duration: 1.6, ease: 'easeOut' }}
                            style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            <FloralWreath theme={theme} size="100%" />
                        </motion.div>

                        <motion.div
                            initial={preview ? false : { opacity: 0, scale: 0.9 }}
                            animate={preview ? undefined : { opacity: 1, scale: 1 }}
                            transition={{ duration: 1, delay: 0.7, ease: 'easeOut' }}
                            style={{ position: 'relative', zIndex: 2, maxWidth: '62%' }}
                        >
                            <div
                                style={{
                                    fontFamily: BODY,
                                    fontSize: 12,
                                    letterSpacing: '0.3em',
                                    textTransform: 'uppercase',
                                    color: theme.secondary,
                                    marginBottom: 6,
                                }}
                            >
                                Raikan Cinta
                            </div>
                            <div
                                style={{
                                    fontFamily: NAMES,
                                    fontSize: 'clamp(28px, 7vw, 40px)',
                                    fontWeight: 600,
                                    color: theme.primary,
                                    lineHeight: 1.1,
                                }}
                            >
                                {groomShort}
                            </div>
                            <div
                                style={{
                                    fontFamily: SERIF,
                                    fontStyle: 'italic',
                                    fontSize: 'clamp(22px, 5vw, 30px)',
                                    color: theme.accent,
                                    margin: '2px 0',
                                }}
                            >
                                &amp;
                            </div>
                            <div
                                style={{
                                    fontFamily: NAMES,
                                    fontSize: 'clamp(28px, 7vw, 40px)',
                                    fontWeight: 600,
                                    color: theme.primary,
                                    lineHeight: 1.1,
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
                            <Divider theme={theme} />
                        </div>
                    </Reveal>
                </Section>
            )}

            {/* ---------------------------------------------------------- */}
            {/* 3. COUPLE                                                   */}
            {/* ---------------------------------------------------------- */}
            <Section background="rgba(255,255,255,0.4)">
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
                                <line x1="0" y1="10" x2="40" y2="10" stroke={theme.accent} strokeWidth={1.2} />
                                <g transform="translate(48 10) rotate(20) scale(0.5)">
                                    <path d="M0 0 C 7 -11 7 -27 0 -38 C -7 -27 -7 -11 0 0 Z" fill={theme.sageDeep} />
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
                                <g transform="translate(8 10) rotate(-20) scale(0.5)">
                                    <path d="M0 0 C 7 -11 7 -27 0 -38 C -7 -27 -7 -11 0 0 Z" fill={theme.sageDeep} />
                                </g>
                                <line x1="16" y1="10" x2="56" y2="10" stroke={theme.accent} strokeWidth={1.2} />
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
                <Section background="rgba(255,255,255,0.4)">
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
                                        background: theme.accent,
                                        border: `3px solid ${theme.bg}`,
                                        boxShadow: `0 0 0 1px ${theme.accent}`,
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
                <Section background="rgba(255,255,255,0.4)">
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
                                boxShadow: '0 12px 30px rgba(91,58,46,0.07)',
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
                <Section>
                    <SectionHeading
                        theme={theme}
                        eyebrow={tr("Tanda Ingatan")}
                        title={tr("Senarai Hadiah")}
                        icon={<Gift size={15} />}
                    />
                    <Reveal preview={preview}>{slots.wishlist}</Reveal>
                </Section>
            )}</PkSec>

            {/* ---------------------------------------------------------- */}
            {/* 9. HUBUNGI                                                  */}
            {/* ---------------------------------------------------------- */}
            <PkSec name="contacts">{data.contacts && data.contacts.length > 0 && (
                <Section background="rgba(255,255,255,0.4)">
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
                                        boxShadow: '0 8px 20px rgba(91,58,46,0.06)',
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
            )}</PkSec>

            {/* ---------------------------------------------------------- */}
            {/* 10. SALAM KAUT                                              */}
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
                                boxShadow: '0 14px 34px rgba(91,58,46,0.09)',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                                <span
                                    style={{
                                        width: 54,
                                        height: 54,
                                        borderRadius: '50%',
                                        background: 'rgba(201,162,75,0.14)',
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
                                            background: copied ? theme.sageDeep : theme.accent,
                                            color: '#fff',
                                            borderColor: copied ? theme.sageDeep : theme.accent,
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
            <PkSec name="gallery"><Section background="rgba(255,255,255,0.4)">
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
                                          boxShadow: '0 10px 24px rgba(91,58,46,0.08)',
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
                                          background: 'rgba(201,162,75,0.06)',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          gap: 10,
                                          color: theme.accent,
                                      }}
                                  >
                                      <CornerSprig theme={theme} />
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
                }}
            >
                <Reveal preview={preview}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
                        <FloralWreath theme={theme} size={140} />
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
                        <Heart size={20} color={theme.blushDeep} fill={theme.blush} />
                    </div>
                    <Divider theme={theme} />
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
                            color={theme.blushDeep}
                            style={{ display: 'inline', verticalAlign: 'middle', margin: '0 2px' }}
                        />{' '}
                        <BrandLogo height={12} plate style={{ verticalAlign: 'middle', padding: '3px 7px' }} />
                    </div>
                </Reveal>
            </footer>
        </div>
    );
}
