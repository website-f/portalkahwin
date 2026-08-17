// ============================================================
// Greenery / Eucalyptus wedding e-invitation template — "Hijauan Segar".
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
const MOTION = REVEAL_TIMING[TEMPLATE_ART['greenery'].reveal];


// ---------- typography ---------------------------------------------------
const SERIF = "'Cormorant Garamond', 'Playfair Display', Georgia, 'Times New Roman', serif";
const NAMES = "var(--pk-name, 'Cormorant Garamond'), 'Playfair Display', Georgia, 'Times New Roman', serif";
const BODY = "'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', sans-serif";
const ARABIC = "'Traditional Arabic', 'Scheherazade New', 'Amiri', 'Noto Naskh Arabic', serif";

// ---------- theme --------------------------------------------------------
interface Theme {
    primary: string;   // deep green — headings / ink
    secondary: string; // supporting green
    accent: string;    // light sage — lines / eyebrows
    bg: string;        // page background
    text: string;      // body text
    gold: string;      // sparing gold accent
    leaf: string;      // lighter eucalyptus green
    leafDeep: string;  // deeper eucalyptus green
    vein: string;      // leaf vein stroke
    card: string;      // white cards
    line: string;      // thin green border
}

// A single rounded, oval eucalyptus leaf blade drawn from the stem attachment
// point (0,0) reaching upward. Deliberately round — not the pointed leaf of the
// Floral template.
const LEAF_PATH = 'M0 0 C 9 -3 11 -14 6 -23 C 3 -27 -3 -27 -6 -23 C -11 -14 -9 -3 0 0 Z';

// =========================================================================
//  Small original SVG ornaments
// =========================================================================

function EucaLeaf({ fill, vein }: { fill: string; vein: string }) {
    return (
        <g>
            <path d={LEAF_PATH} fill={fill} />
            <path d="M0 -2 L0 -21" stroke={vein} strokeWidth={1} fill="none" strokeLinecap="round" />
        </g>
    );
}

function EucaBud({ fill, cap }: { fill: string; cap: string }) {
    return (
        <g>
            <circle r={4.5} fill={fill} />
            <path d="M0 -4 C 3 -8 3 -12 0 -14 C -3 -12 -3 -8 0 -4 Z" fill={cap} />
        </g>
    );
}

/** An airy circular garland drawn from rounded eucalyptus leaves in two tones. */
function EucalyptusWreath({ theme, size }: { theme: Theme; size: number | string }) {
    const cx = 200;
    const cy = 200;
    const R = 150;
    const N = 26;

    const leaves = useMemo(
        () =>
            Array.from({ length: N }, (_, i) => {
                const a = (i / N) * Math.PI * 2 - Math.PI / 2;
                const x = cx + Math.cos(a) * R;
                const y = cy + Math.sin(a) * R;
                // tangential, alternating in / out — reads like sprigs along a stem
                const deg = (a * 180) / Math.PI + 90 + (i % 2 ? 54 : -54);
                const s = 0.85 + ((i * 5) % 4) * 0.13;
                return {
                    key: i,
                    x,
                    y,
                    deg,
                    s,
                    fill: i % 2 ? theme.leaf : theme.leafDeep,
                };
            }),
        [theme.leaf, theme.leafDeep],
    );

    const buds = useMemo(() => {
        const angles = [-90, 150];
        return angles.map((deg, i) => {
            const a = (deg * Math.PI) / 180;
            return { key: i, x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R };
        });
    }, []);

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 400 400"
            role="img"
            aria-label="Eucalyptus wreath"
            style={{ display: 'block', overflow: 'visible' }}
        >
            <circle cx={cx} cy={cy} r={R} fill="none" stroke={theme.leafDeep} strokeWidth={1.4} opacity={0.42} />
            {leaves.map((l) => (
                <g key={l.key} transform={`translate(${l.x} ${l.y}) rotate(${l.deg}) scale(${l.s})`}>
                    <EucaLeaf fill={l.fill} vein={theme.vein} />
                </g>
            ))}
            {buds.map((b) => (
                <g key={`b${b.key}`} transform={`translate(${b.x} ${b.y})`}>
                    <EucaBud fill={theme.gold} cap={theme.leafDeep} />
                </g>
            ))}
        </svg>
    );
}

/** A little eucalyptus sprig for section corners. */
function CornerSprig({ theme }: { theme: Theme }) {
    return (
        <svg width={120} height={120} viewBox="0 0 120 120" aria-hidden="true">
            <path
                d="M8 8 C 38 26 60 56 74 100"
                fill="none"
                stroke={theme.leafDeep}
                strokeWidth={2}
                strokeLinecap="round"
            />
            {[
                { x: 22, y: 22, r: -50 },
                { x: 36, y: 40, r: -38 },
                { x: 50, y: 60, r: -26 },
                { x: 62, y: 82, r: -14 },
                { x: 18, y: 32, r: -96 },
                { x: 32, y: 52, r: -84 },
                { x: 46, y: 74, r: -72 },
            ].map((leaf, i) => (
                <g key={i} transform={`translate(${leaf.x} ${leaf.y}) rotate(${leaf.r}) scale(0.5)`}>
                    <path d={LEAF_PATH} fill={i % 2 ? theme.leaf : theme.leafDeep} />
                </g>
            ))}
            <g transform="translate(78 104)">
                <circle r={5} fill={theme.gold} />
            </g>
        </svg>
    );
}

/** Divider: a thin line broken by a small eucalyptus sprig. */
function Divider({ theme }: { theme: Theme }) {
    return (
        <svg
            width={220}
            height={30}
            viewBox="0 0 220 30"
            aria-hidden="true"
            style={{ display: 'block', margin: '18px auto 0' }}
        >
            <line x1="16" y1="15" x2="92" y2="15" stroke={theme.accent} strokeWidth={1.2} />
            <line x1="128" y1="15" x2="204" y2="15" stroke={theme.accent} strokeWidth={1.2} />
            <g transform="translate(100 15) rotate(-32) scale(0.5)">
                <path d={LEAF_PATH} fill={theme.leafDeep} />
            </g>
            <g transform="translate(120 15) rotate(32) scale(0.5)">
                <path d={LEAF_PATH} fill={theme.leaf} />
            </g>
            <circle cx="110" cy="15" r="3.2" fill={theme.gold} />
        </svg>
    );
}

/**
 * Signature leaf drift — small eucalyptus leaves gently fall while slowly
 * rotating. GPU-cheap: the outer span owns the vertical fall (transform:
 * translateY), the inner leaf owns the tumble (transform: rotate), and both
 * animate only transform/opacity. Capped at 12 elements.
 */
function LeafDrift({ theme }: { theme: Theme }) {
    const items = useMemo(
        () =>
            Array.from({ length: 12 }, (_, i) => ({
                key: i,
                left: (i * 8.5 + 4) % 100,
                delay: (i % 6) * 1.6,
                fall: 11 + (i % 5) * 2,
                spin: 4 + (i % 4) * 1.3,
                size: 15 + (i % 3) * 7,
                fill: i % 2 ? theme.leaf : theme.leafDeep,
            })),
        [theme.leaf, theme.leafDeep],
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
                        viewBox="0 0 30 30"
                        style={{
                            display: 'block',
                            animation: `pk-spin ${p.spin}s ease-in-out ${p.delay}s infinite alternate`,
                            willChange: 'transform',
                        }}
                    >
                        <g transform="translate(15 28) scale(0.9)">
                            <path d={LEAF_PATH} fill={p.fill} opacity={0.72} />
                        </g>
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
                        color: theme.secondary,
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
                boxShadow: '0 8px 24px rgba(47,74,52,0.08)',
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

export default function GreeneryTemplate({ data, preview, slots }: TemplateProps) {
    const tr = useCardText();
    const reduce = useReducedMotion() ?? false;
    const p = data.palette;
    const theme: Theme = {
        primary: p?.primary ?? '#2f4a34',
        secondary: p?.secondary ?? '#6f8c5f',
        accent: p?.accent ?? '#9bad7f',
        bg: p?.bg ?? '#f4f7f0',
        text: p?.text ?? '#33412f',
        gold: '#b89a5e',
        leaf: '#8ea877',
        leafDeep: '#5b7550',
        vein: 'rgba(47,74,52,0.32)',
        card: '#ffffff',
        line: 'rgba(111,140,95,0.35)',
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
        backgroundImage: `${groundPattern('trellis', theme.accent, 0.06)}, radial-gradient(120% 60% at 50% 0%, rgba(255,255,255,0.6), rgba(255,255,255,0) 55%)`,
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
                    0%   { transform: translateY(-14vh); opacity: 0; }
                    10%  { opacity: 0.8; }
                    90%  { opacity: 0.8; }
                    100% { transform: translateY(114vh); opacity: 0; }
                }
                @keyframes pk-spin {
                    0%   { transform: rotate(-30deg); }
                    100% { transform: rotate(42deg); }
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
                {!preview && !reduce && <LeafDrift theme={theme} />}

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
                            // Container-relative so it centres in the fixed thumbnail stage
                            // too (a vw-capped size overran the column + clipped right).
                            width: 'min(96%, 440px)',
                            aspectRatio: '1 / 1',
                            margin: '0 auto',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <motion.div
                            initial={preview ? false : { opacity: 0, scale: 0.7 }}
                            animate={preview ? undefined : { opacity: 1, scale: 1 }}
                            transition={{ duration: 1.6, ease: 'easeOut' }}
                            style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            <EucalyptusWreath theme={theme} size="100%" />
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
                                    color: theme.gold,
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
                                <Heart size={22} color={theme.secondary} />
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
            <Section background="rgba(255,255,255,0.5)">
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
                                <g transform="translate(48 10) rotate(22) scale(0.42)">
                                    <path d={LEAF_PATH} fill={theme.leafDeep} />
                                </g>
                            </svg>
                            <span
                                style={{
                                    fontFamily: SERIF,
                                    fontStyle: 'italic',
                                    fontSize: 'clamp(40px, 9vw, 60px)',
                                    color: theme.gold,
                                    lineHeight: 1,
                                }}
                            >
                                &amp;
                            </span>
                            <svg width={56} height={20} viewBox="0 0 56 20" aria-hidden="true">
                                <g transform="translate(8 10) rotate(-22) scale(0.42)">
                                    <path d={LEAF_PATH} fill={theme.leafDeep} />
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
                                <Calendar size={20} color={theme.secondary} />
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
                                <Clock size={17} color={theme.secondary} />
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
                <Section background="rgba(255,255,255,0.5)">
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
                                        background: theme.secondary,
                                        border: `3px solid ${theme.bg}`,
                                        boxShadow: `0 0 0 1px ${theme.secondary}`,
                                    }}
                                />
                                <div
                                    style={{
                                        fontFamily: BODY,
                                        fontSize: 13,
                                        letterSpacing: '0.12em',
                                        textTransform: 'uppercase',
                                        color: theme.secondary,
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
                <Section background="rgba(255,255,255,0.5)">
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
                                boxShadow: '0 12px 30px rgba(47,74,52,0.07)',
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
                    <SectionHeading theme={theme} eyebrow={tr("Tanda Ingatan")} title={tr("Senarai Hadiah")} />
                    <Reveal preview={preview}>{slots.wishlist}</Reveal>
                </Section>
            )}</PkSec>

            {/* ---------------------------------------------------------- */}
            {/* 9. HUBUNGI                                                  */}
            {/* ---------------------------------------------------------- */}
            <PkSec name="contacts">{data.contacts && data.contacts.length > 0 && (
                <Section background="rgba(255,255,255,0.5)">
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
                                        boxShadow: '0 8px 20px rgba(47,74,52,0.06)',
                                    }}
                                >
                                    <span
                                        style={{
                                            flex: '0 0 auto',
                                            width: 44,
                                            height: 44,
                                            borderRadius: '50%',
                                            background: theme.primary,
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
                                boxShadow: '0 14px 34px rgba(47,74,52,0.09)',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                                <span
                                    style={{
                                        width: 54,
                                        height: 54,
                                        borderRadius: '50%',
                                        background: 'rgba(111,140,95,0.16)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: theme.primary,
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
                                            background: copied ? theme.leafDeep : theme.primary,
                                            color: '#fff',
                                            borderColor: copied ? theme.leafDeep : theme.primary,
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
            <PkSec name="gallery"><Section background="rgba(255,255,255,0.5)">
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
                                          boxShadow: '0 10px 24px rgba(47,74,52,0.08)',
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
                                          background: 'rgba(111,140,95,0.07)',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          gap: 10,
                                          color: theme.secondary,
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
                        <EucalyptusWreath theme={theme} size={140} />
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
                        <span style={{ color: theme.gold, fontStyle: 'italic', margin: '0 12px' }}>&amp;</span>
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
                        <Heart size={20} color={theme.leafDeep} fill={theme.leaf} />
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
                            color={theme.leafDeep}
                            style={{ display: 'inline', verticalAlign: 'middle', margin: '0 2px' }}
                        />{' '}
                        <BrandLogo height={12} plate style={{ verticalAlign: 'middle', padding: '3px 7px' }} />
                    </div>
                </Reveal>
            </footer>
        </div>
    );
}
