// ============================================================
// Boho Senja — bohemian sunset wedding e-invitation template.
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
const MOTION = REVEAL_TIMING[TEMPLATE_ART['boho'].reveal];


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
    sun: string;
    sunDeep: string;
    clay: string;
    clayDeep: string;
    card: string;
    line: string;
}

// =========================================================================
//  Small original SVG ornaments
// =========================================================================

/**
 * A feathery pampas-grass plume: a curved stem with many thin fronds fanning
 * out along it. Drawn to fill its box; the base sits at the bottom so a
 * parent can pivot it from `transform-origin: bottom center` when swaying.
 */
function PampasPlume({ theme, flip }: { theme: Theme; flip?: boolean }) {
    const fronds = useMemo(() => {
        const N = 11;
        const baseX = 60;
        const baseY = 315;
        const topY = 30;
        const arr: { key: string; d: string; color: string }[] = [];
        for (let i = 0; i < N; i++) {
            const t = i / (N - 1); // 0 = base, 1 = tip
            const sx = baseX + Math.sin(t * Math.PI) * 6;
            const sy = baseY - t * (baseY - topY);
            const len = 26 + Math.sin(t * Math.PI) * 40; // fuller in the middle
            for (const side of [-1, 1]) {
                const dir = side * (flip ? -1 : 1);
                const ex = sx + dir * len * 0.62;
                const ey = sy - len * 0.85;
                const cx = sx + dir * len * 0.14;
                const cy = sy - len * 0.62;
                arr.push({
                    key: `${i}-${side}`,
                    d: `M ${sx.toFixed(1)} ${sy.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`,
                    color: i > N - 3 ? theme.clay : i % 2 ? theme.accent : theme.sun,
                });
            }
        }
        return arr;
    }, [theme.accent, theme.sun, theme.clay, flip]);

    return (
        <svg
            width="100%"
            height="100%"
            viewBox="0 0 120 320"
            role="img"
            aria-label="Pampas grass"
            style={{ display: 'block', overflow: 'visible' }}
        >
            <path
                d={`M 60 315 Q ${60 + (flip ? -6 : 6)} 175 60 30`}
                fill="none"
                stroke={theme.sageDeep}
                strokeWidth={2}
                strokeLinecap="round"
            />
            {fronds.map((f) => (
                <path
                    key={f.key}
                    d={f.d}
                    fill="none"
                    stroke={f.color}
                    strokeWidth={1.6}
                    strokeLinecap="round"
                    opacity={0.82}
                />
            ))}
        </svg>
    );
}

/** A little dried botanical sprig for section corners. */
function DriedSprig({ theme }: { theme: Theme }) {
    return (
        <svg width={96} height={96} viewBox="0 0 120 120" aria-hidden="true" style={{ display: 'block' }}>
            <path
                d="M12 14 C 42 30 66 58 82 102"
                fill="none"
                stroke={theme.sageDeep}
                strokeWidth={1.8}
                strokeLinecap="round"
            />
            {[
                { x: 30, y: 28, r: -40, c: theme.sage },
                { x: 46, y: 48, r: -25, c: theme.sageDeep },
                { x: 60, y: 66, r: -8, c: theme.sage },
                { x: 24, y: 38, r: -78, c: theme.accent },
                { x: 40, y: 58, r: -62, c: theme.accent },
            ].map((p, i) => (
                <g key={i} transform={`translate(${p.x} ${p.y}) rotate(${p.r})`}>
                    <ellipse cx={0} cy={-8} rx={3.2} ry={9} fill={p.c} opacity={0.85} />
                </g>
            ))}
            {[-18, -6, 6, 18].map((a, i) => (
                <path
                    key={`t${i}`}
                    d="M84 104 q 4 -18 10 -30"
                    transform={`rotate(${a} 84 104)`}
                    fill="none"
                    stroke={theme.clay}
                    strokeWidth={1.4}
                    strokeLinecap="round"
                    opacity={0.8}
                />
            ))}
        </svg>
    );
}

/** A warm terracotta sun: a semicircle sitting on the horizon with short rays. */
function SunBurst({ theme, width, opacity = 1 }: { theme: Theme; width: number | string; opacity?: number }) {
    const rays = useMemo(() => {
        const N = 11;
        const cx = 120;
        const cy = 120;
        const r1 = 64;
        return Array.from({ length: N }, (_, i) => {
            const th = Math.PI + (i / (N - 1)) * Math.PI; // upper half only
            const r2 = r1 + (i % 2 ? 22 : 14);
            return {
                key: i,
                x1: cx + Math.cos(th) * r1,
                y1: cy + Math.sin(th) * r1,
                x2: cx + Math.cos(th) * r2,
                y2: cy + Math.sin(th) * r2,
            };
        });
    }, []);

    return (
        <svg
            width={width}
            viewBox="0 0 240 140"
            aria-hidden="true"
            style={{ display: 'block', overflow: 'visible', opacity }}
        >
            {rays.map((r) => (
                <line
                    key={r.key}
                    x1={r.x1}
                    y1={r.y1}
                    x2={r.x2}
                    y2={r.y2}
                    stroke={theme.sunDeep}
                    strokeWidth={2.2}
                    strokeLinecap="round"
                />
            ))}
            <path d="M62 120 A58 58 0 0 1 178 120 Z" fill={theme.sun} />
        </svg>
    );
}

/**
 * The cover arch: an ogee window outlined in terracotta with an inner gold
 * line. When `animate` is true the terracotta outline draws itself in once.
 */
function Arch({ theme, animate }: { theme: Theme; animate: boolean }) {
    const OUTER = 'M 50 425 L 50 205 C 50 116 99 78 150 45 C 201 78 250 116 250 205 L 250 425';
    const INNER = 'M 66 425 L 66 210 C 66 130 108 96 150 68 C 192 96 234 130 234 210 L 234 425';
    return (
        <svg
            viewBox="0 0 300 460"
            width="100%"
            height="100%"
            preserveAspectRatio="xMidYMid meet"
            aria-hidden="true"
            style={{ display: 'block', overflow: 'visible' }}
        >
            <line x1="28" y1="425" x2="272" y2="425" stroke={theme.primary} strokeWidth={3} strokeLinecap="round" />
            <path d={INNER} fill="none" stroke={theme.accent} strokeWidth={1.4} strokeLinecap="round" opacity={0.7} />
            {animate ? (
                <motion.path
                    d={OUTER}
                    fill="none"
                    stroke={theme.primary}
                    strokeWidth={3}
                    strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0.25 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 2.6, ease: 'easeInOut' }}
                    style={{ willChange: 'transform' }}
                />
            ) : (
                <path d={OUTER} fill="none" stroke={theme.primary} strokeWidth={3} strokeLinecap="round" />
            )}
        </svg>
    );
}

/** A compact static arch-and-sun emblem for the footer. */
function ArchEmblem({ theme, size }: { theme: Theme; size: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 200 200" aria-hidden="true" style={{ display: 'block', overflow: 'visible' }}>
            <line x1="26" y1="184" x2="174" y2="184" stroke={theme.primary} strokeWidth={2.4} strokeLinecap="round" />
            <path
                d="M44 184 L 44 96 C 44 58 74 42 100 24 C 126 42 156 58 156 96 L 156 184"
                fill="none"
                stroke={theme.primary}
                strokeWidth={2.4}
                strokeLinecap="round"
            />
            {[-40, -20, 0, 20, 40].map((deg, i) => {
                const th = ((-90 + deg) * Math.PI) / 180;
                const cx = 100;
                const cy = 150;
                const r1 = 30;
                const r2 = 42;
                return (
                    <line
                        key={i}
                        x1={cx + Math.cos(th) * r1}
                        y1={cy + Math.sin(th) * r1}
                        x2={cx + Math.cos(th) * r2}
                        y2={cy + Math.sin(th) * r2}
                        stroke={theme.sunDeep}
                        strokeWidth={1.8}
                        strokeLinecap="round"
                    />
                );
            })}
            <path d="M72 150 A28 28 0 0 1 128 150 Z" fill={theme.sun} />
        </svg>
    );
}

/** Divider: two lines flanking a tiny rising-sun ray motif. */
function Divider({ theme }: { theme: Theme }) {
    return (
        <svg
            width={220}
            height={40}
            viewBox="0 0 220 40"
            aria-hidden="true"
            style={{ display: 'block', margin: '18px auto 0' }}
        >
            <line x1="24" y1="30" x2="88" y2="30" stroke={theme.accent} strokeWidth={1.2} />
            <line x1="132" y1="30" x2="196" y2="30" stroke={theme.accent} strokeWidth={1.2} />
            {[-40, -20, 0, 20, 40].map((deg, i) => {
                const th = ((-90 + deg) * Math.PI) / 180;
                const cx = 110;
                const cy = 30;
                const r1 = 15;
                const r2 = 23;
                return (
                    <line
                        key={i}
                        x1={cx + Math.cos(th) * r1}
                        y1={cy + Math.sin(th) * r1}
                        x2={cx + Math.cos(th) * r2}
                        y2={cy + Math.sin(th) * r2}
                        stroke={theme.sunDeep}
                        strokeWidth={1.6}
                        strokeLinecap="round"
                    />
                );
            })}
            <path d="M96 30 A14 14 0 0 1 124 30 Z" fill={theme.sun} />
        </svg>
    );
}

/**
 * Signature seed / dust motes — tiny seeds drift slowly UP and fade out.
 * GPU-cheap: the outer span owns the vertical rise (transform: translateY),
 * the inner seed owns a gentle horizontal sway (transform), and both animate
 * only transform/opacity. Capped at 10 elements.
 */
function Motes({ theme }: { theme: Theme }) {
    const items = useMemo(
        () =>
            Array.from({ length: 10 }, (_, i) => ({
                key: i,
                left: (i * 9.7 + 4) % 100,
                delay: (i % 5) * 1.6,
                rise: 12 + (i % 4) * 3,
                sway: 3 + (i % 3) * 0.8,
                size: 4 + (i % 3) * 2,
                color: [theme.accent, theme.clay, theme.sun][i % 3],
            })),
        [theme.accent, theme.clay, theme.sun],
    );
    return (
        <div
            aria-hidden="true"
            style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}
        >
            {items.map((m) => (
                <span
                    key={m.key}
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: `${m.left}%`,
                        animation: `pk-rise ${m.rise}s linear ${m.delay}s infinite`,
                        willChange: 'transform',
                    }}
                >
                    <svg
                        width={m.size}
                        height={m.size * 1.7}
                        viewBox="0 0 10 17"
                        style={{
                            display: 'block',
                            animation: `pk-drift ${m.sway}s ease-in-out ${m.delay}s infinite alternate`,
                            willChange: 'transform',
                        }}
                    >
                        <ellipse cx={5} cy={8.5} rx={3} ry={7.5} fill={m.color} opacity={0.6} />
                    </svg>
                </span>
            ))}
        </div>
    );
}

/** Wrapper that makes a pampas plume sway gently (or stay still when static). */
function SwayPampas({
    theme,
    flip,
    animate,
    delay = 0,
    style,
}: {
    theme: Theme;
    flip?: boolean;
    animate: boolean;
    delay?: number;
    style?: CSSProperties;
}) {
    const plume = <PampasPlume theme={theme} flip={flip} />;
    if (!animate) {
        return <div style={style}>{plume}</div>;
    }
    return (
        <motion.div
            style={{ ...style, transformOrigin: 'bottom center', willChange: 'transform' }}
            animate={{ rotate: [-2.4, 2.4, -2.4] }}
            transition={{ duration: 6.5, delay, repeat: Infinity, ease: 'easeInOut' }}
        >
            {plume}
        </motion.div>
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
                border: `1px solid ${theme.primary}`,
                boxShadow: '0 8px 24px rgba(92,61,46,0.08)',
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
    theme,
}: {
    children: ReactNode;
    style?: CSSProperties;
    background?: string;
    theme: Theme;
}) {
    return (
        <section
            style={{
                position: 'relative',
                padding: 'clamp(60px, 11vw, 120px) 20px',
                background,
                overflow: 'hidden',
                ...style,
            }}
        >
            <div aria-hidden="true" style={{ position: 'absolute', top: 6, right: 6, zIndex: 0, opacity: 0.4, pointerEvents: 'none' }}>
                <DriedSprig theme={theme} />
            </div>
            <div
                aria-hidden="true"
                style={{
                    position: 'absolute',
                    bottom: 6,
                    left: 6,
                    zIndex: 0,
                    opacity: 0.4,
                    pointerEvents: 'none',
                    transform: 'scale(-1, -1)',
                }}
            >
                <DriedSprig theme={theme} />
            </div>
            <div style={{ maxWidth: 720, margin: '0 auto', position: 'relative', zIndex: 1 }}>{children}</div>
        </section>
    );
}

// =========================================================================
//  Main template
// =========================================================================

export default function BohoTemplate({ data, preview, slots }: TemplateProps) {
    const tr = useCardText();
    const reduce = useReducedMotion() ?? false;
    const animate = !preview && !reduce;
    const p = data.palette;
    const theme: Theme = {
        primary: p?.primary ?? '#a5522f',
        secondary: p?.secondary ?? '#c07a4e',
        accent: p?.accent ?? '#b08453',
        bg: p?.bg ?? '#f3e7db',
        text: p?.text ?? '#5c3d2e',
        sage: '#8a9a6b',
        sageDeep: '#6f7d53',
        sun: '#d98b52',
        sunDeep: '#c2703a',
        clay: '#dba888',
        clayDeep: '#b5623c',
        card: '#faf1e6',
        line: 'rgba(176,132,83,0.38)',
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
        backgroundImage:
            groundPattern('crosshatch', theme.accent, 0.05) + ',' +
            'radial-gradient(120% 75% at 50% 100%, rgba(217,139,82,0.20), rgba(243,231,219,0) 58%)',
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

    const archWidth = 'min(78vw, 320px)';
    const plumeWidth = 'min(26vw, 108px)';

    return (
        <div style={rootStyle}>
            <style>{`
                @keyframes pk-rise {
                    0%   { transform: translateY(0); opacity: 0; }
                    15%  { opacity: 0.7; }
                    85%  { opacity: 0.55; }
                    100% { transform: translateY(-88vh); opacity: 0; }
                }
                @keyframes pk-drift {
                    0%   { transform: translateX(-6px); }
                    100% { transform: translateX(6px); }
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
                }}
            >
                {animate && <Motes theme={theme} />}

                <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 520 }}>
                    {data.bismillah && (
                        <motion.div
                            initial={preview ? false : { opacity: 0, y: -12 }}
                            animate={preview ? undefined : { opacity: 1, y: 0 }}
                            transition={{ duration: 1.2, delay: 0.2, ease: 'easeOut' }}
                            style={{ direction: 'rtl', marginBottom: 24 }}
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

                    {/* stage: pampas plumes + dried sprigs flanking the arch */}
                    <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
                        <SwayPampas
                            theme={theme}
                            animate={animate}
                            delay={0}
                            flip
                            style={{
                                position: 'absolute',
                                left: 0,
                                bottom: '4%',
                                zIndex: 1,
                                width: plumeWidth,
                                height: '86%',
                                opacity: 0.92,
                            }}
                        />
                        <SwayPampas
                            theme={theme}
                            animate={animate}
                            delay={0.9}
                            style={{
                                position: 'absolute',
                                right: 0,
                                bottom: '9%',
                                zIndex: 1,
                                width: plumeWidth,
                                height: '78%',
                                opacity: 0.92,
                            }}
                        />

                        <div
                            aria-hidden="true"
                            style={{ position: 'absolute', left: '6%', bottom: 0, zIndex: 3, opacity: 0.85 }}
                        >
                            <DriedSprig theme={theme} />
                        </div>
                        <div
                            aria-hidden="true"
                            style={{
                                position: 'absolute',
                                right: '6%',
                                bottom: 0,
                                zIndex: 3,
                                opacity: 0.85,
                                transform: 'scaleX(-1)',
                            }}
                        >
                            <DriedSprig theme={theme} />
                        </div>

                        {/* arch container */}
                        <div
                            style={{
                                position: 'relative',
                                zIndex: 2,
                                width: archWidth,
                                aspectRatio: '300 / 460',
                                margin: '0 auto',
                            }}
                        >
                            {/* sun sitting low behind the arch */}
                            <motion.div
                                initial={preview ? false : { opacity: 0, y: 18 }}
                                animate={preview ? undefined : { opacity: 1, y: 0 }}
                                transition={{ duration: 1.4, delay: 0.5, ease: 'easeOut' }}
                                style={{
                                    position: 'absolute',
                                    left: '19%',
                                    right: '19%',
                                    bottom: '13%',
                                    zIndex: 0,
                                }}
                            >
                                <SunBurst theme={theme} width="100%" opacity={0.9} />
                            </motion.div>

                            {/* arch outline */}
                            <motion.div
                                initial={preview ? false : { opacity: 0, scale: 0.94 }}
                                animate={preview ? undefined : { opacity: 1, scale: 1 }}
                                transition={{ duration: 1.2, ease: 'easeOut' }}
                                style={{ position: 'absolute', inset: 0, zIndex: 1 }}
                            >
                                <Arch theme={theme} animate={animate} />
                            </motion.div>

                            {/* names inside the arch */}
                            <motion.div
                                initial={preview ? false : { opacity: 0, scale: 0.9 }}
                                animate={preview ? undefined : { opacity: 1, scale: 1 }}
                                transition={{ duration: 1, delay: 0.9, ease: 'easeOut' }}
                                style={{
                                    position: 'absolute',
                                    top: '30%',
                                    bottom: '18%',
                                    left: '16%',
                                    right: '16%',
                                    zIndex: 2,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
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
                                        fontSize: 'clamp(26px, 6.6vw, 38px)',
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
                                        fontSize: 'clamp(20px, 5vw, 28px)',
                                        color: theme.accent,
                                        margin: '2px 0',
                                    }}
                                >
                                    &amp;
                                </div>
                                <div
                                    style={{
                                        fontFamily: NAMES,
                                        fontSize: 'clamp(26px, 6.6vw, 38px)',
                                        fontWeight: 600,
                                        color: theme.primary,
                                        lineHeight: 1.1,
                                    }}
                                >
                                    {brideShort}
                                </div>
                            </motion.div>
                        </div>
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
                        zIndex: 3,
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
                        animate={animate ? { y: [0, 9, 0] } : undefined}
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
            <Section theme={theme} background="rgba(255,255,255,0.4)">
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
                                <g transform="translate(48 10) rotate(20)">
                                    <ellipse cx={0} cy={-6} rx={2.6} ry={7} fill={theme.sageDeep} />
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
                                <g transform="translate(8 10) rotate(-20)">
                                    <ellipse cx={0} cy={-6} rx={2.6} ry={7} fill={theme.sageDeep} />
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
            <Section theme={theme}>
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
                <Section theme={theme} background="rgba(255,255,255,0.4)">
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
                <Section theme={theme}>
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
                                            background: theme.primary,
                                            color: '#fff',
                                            borderColor: theme.primary,
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
                <Section theme={theme} background="rgba(255,255,255,0.4)">
                    <SectionHeading theme={theme} eyebrow={tr("Khabarkan Kehadiran")} title={tr("RSVP Kehadiran")} />
                    <Reveal preview={preview}>{slots.rsvp}</Reveal>
                </Section>
            )}</PkSec>

            {/* ---------------------------------------------------------- */}
            {/* 8. UCAPAN                                                   */}
            {/* ---------------------------------------------------------- */}
            <PkSec name="wishes"><Section theme={theme}>
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
                                boxShadow: '0 12px 30px rgba(92,61,46,0.07)',
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
                <Section theme={theme} background="rgba(255,255,255,0.4)">
                    <SectionHeading theme={theme} eyebrow={tr("Tanda Ingatan")} title={tr("Senarai Hadiah")} />
                    <Reveal preview={preview}>{slots.wishlist}</Reveal>
                </Section>
            )}</PkSec>

            {/* ---------------------------------------------------------- */}
            {/* 9. HUBUNGI                                                  */}
            {/* ---------------------------------------------------------- */}
            <PkSec name="contacts">{data.contacts && data.contacts.length > 0 && (
                <Section theme={theme} background="rgba(255,255,255,0.4)">
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
                                        boxShadow: '0 8px 20px rgba(92,61,46,0.06)',
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
            {/* 10. SALAM KASIH                                             */}
            {/* ---------------------------------------------------------- */}
            <PkSec name="gift">{data.gift && (data.gift.bankName || data.gift.accountNo || data.gift.accountName) && (
                <Section theme={theme}>
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
                                boxShadow: '0 14px 34px rgba(92,61,46,0.09)',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                                <span
                                    style={{
                                        width: 54,
                                        height: 54,
                                        borderRadius: '50%',
                                        background: 'rgba(176,132,83,0.16)',
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
            <PkSec name="gallery"><Section theme={theme} background="rgba(255,255,255,0.4)">
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
                                          boxShadow: '0 10px 24px rgba(92,61,46,0.08)',
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
                                          background: 'rgba(176,132,83,0.07)',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          gap: 10,
                                          color: theme.accent,
                                      }}
                                  >
                                      <DriedSprig theme={theme} />
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
                        <ArchEmblem theme={theme} size={140} />
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
                        <Heart size={20} color={theme.clayDeep} fill={theme.clay} />
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
                            color={theme.clayDeep}
                            style={{ display: 'inline', verticalAlign: 'middle', margin: '0 2px' }}
                        />{' '}
                        <BrandLogo height={12} plate style={{ verticalAlign: 'middle', padding: '3px 7px' }} />
                    </div>
                </Reveal>
            </footer>
        </div>
    );
}
