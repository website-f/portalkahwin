// ============================================================
// Bunga Raya (Hibiscus) — tropical Malaysian wedding e-invite.
// Self-contained: every bloom, leaf and ornament is original
// inline SVG / CSS. No external images, fonts, CDNs or requests.
// Signature cover: hibiscus + monstera unfurl from the corners
// while the card zooms in to reveal the couple.
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

// ---------- typography (system / generic stacks only) -------------------
const SERIF = "'Cormorant Garamond', 'Playfair Display', Georgia, 'Times New Roman', serif";
const BODY = "'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', sans-serif";
const ARABIC = "'Traditional Arabic', 'Scheherazade New', 'Amiri', 'Noto Naskh Arabic', serif";

// ---------- theme --------------------------------------------------------
interface Theme {
    primary: string;   // headings / ink
    secondary: string; // supporting text
    accent: string;    // hibiscus petals / lines / buttons
    bg: string;        // page background
    text: string;      // body text
    leaf: string;      // tropical green
    leafDeep: string;  // shaded green / veins
    leafLight: string; // highlight green
    petalDeep: string; // hibiscus throat / edge shading
    pollen: string;    // stamen anthers
    card: string;      // panel surface
    line: string;      // hairlines
}

// ---------- shared vector geometry --------------------------------------

// One hibiscus petal, base near centre, fanning outward with a soft notch.
const HIBISCUS_PETAL =
    'M0 -6 C -8 -6 -22 -14 -30 -34 C -36 -48 -34 -66 -22 -76 ' +
    'C -14 -82 -6 -80 -2 -74 C -1 -72 1 -72 2 -74 ' +
    'C 6 -80 14 -82 22 -76 C 34 -66 36 -48 30 -34 C 22 -14 8 -6 0 -6 Z';

// Right half of a split monstera leaf; mirror for the left half.
const MONSTERA_HALF =
    'M0 62 C 14 54 44 48 50 26 C 42 22 24 20 14 14 ' +
    'C 34 8 56 -2 58 -18 C 48 -22 26 -22 14 -28 ' +
    'C 34 -34 52 -46 46 -62 C 38 -64 22 -62 12 -68 ' +
    'C 28 -76 36 -86 18 -100 L0 -96 Z';

// Simple lanceolate tropical leaf (bullets, sprigs, dividers).
const SIMPLE_LEAF = 'M0 0 C 10 -13 10 -32 0 -48 C -10 -32 -10 -13 0 0 Z';

// =========================================================================
//  Original SVG botanicals
// =========================================================================

/** A red hibiscus (bunga raya): 5 petals + protruding staminal column. */
function Hibiscus({ theme, size }: { theme: Theme; size: number | string }) {
    const anthers = [
        { x: 5, y: 30 }, { x: 10, y: 46 }, { x: 13, y: 60 }, { x: 17, y: 74 },
        { x: 14, y: 86 }, { x: 21, y: 86 }, { x: 18, y: 96 }, { x: 24, y: 96 },
    ];
    const stigma = [
        { x: 14, y: 104 }, { x: 20, y: 106 }, { x: 26, y: 104 },
        { x: 17, y: 111 }, { x: 23, y: 111 },
    ];
    return (
        <svg
            width={size}
            height={size}
            viewBox="-88 -88 176 208"
            role="img"
            aria-label="Bunga raya"
            style={{ display: 'block', overflow: 'visible' }}
        >
            {/* petals */}
            {[0, 72, 144, 216, 288].map((deg) => (
                <g key={deg} transform={`rotate(${deg})`}>
                    <path d={HIBISCUS_PETAL} fill={theme.accent} stroke={theme.petalDeep} strokeWidth={1} />
                    <path
                        d="M0 -10 C -2 -34 -1 -56 0 -74"
                        fill="none"
                        stroke={theme.petalDeep}
                        strokeWidth={1.2}
                        opacity={0.45}
                    />
                </g>
            ))}
            {/* throat */}
            <circle r={16} fill={theme.petalDeep} opacity={0.92} />
            <circle r={7} fill={theme.pollen} opacity={0.85} />
            {/* staminal column */}
            <path
                d="M0 4 C 6 40 14 72 20 100"
                fill="none"
                stroke={theme.petalDeep}
                strokeWidth={4.5}
                strokeLinecap="round"
            />
            {anthers.map((a, i) => (
                <circle key={`an${i}`} cx={a.x} cy={a.y} r={2.7} fill={theme.pollen} />
            ))}
            {stigma.map((s, i) => (
                <circle key={`st${i}`} cx={s.x} cy={s.y} r={3.4} fill={theme.petalDeep} />
            ))}
        </svg>
    );
}

/** A fenestrated (split) monstera leaf with midrib, veins and petiole. */
function MonsteraLeaf({ theme, size }: { theme: Theme; size: number | string }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="-70 -110 140 220"
            role="img"
            aria-label="Daun tropika"
            style={{ display: 'block', overflow: 'visible' }}
        >
            <g fill={theme.leaf} stroke={theme.leafDeep} strokeWidth={1}>
                <path d={MONSTERA_HALF} />
                <path d={MONSTERA_HALF} transform="scale(-1,1)" />
            </g>
            <g stroke={theme.leafDeep} strokeWidth={1.4} fill="none" opacity={0.5}>
                <path d="M0 60 L0 -96" />
                <path d="M0 40 L44 24" />
                <path d="M0 6 L50 -18" />
                <path d="M0 -34 L40 -60" />
                <path d="M0 40 L-44 24" />
                <path d="M0 6 L-50 -18" />
                <path d="M0 -34 L-40 -60" />
            </g>
            <path
                d="M0 60 C -3 78 3 92 0 106"
                fill="none"
                stroke={theme.leafDeep}
                strokeWidth={3}
                strokeLinecap="round"
            />
        </svg>
    );
}

/** A cluster of monstera + hibiscus + small leaf for a cover corner. */
function CornerBloom({ theme }: { theme: Theme }) {
    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <div style={{ position: 'absolute', top: '-8%', left: '-10%', width: '68%', transform: 'rotate(-16deg)' }}>
                <MonsteraLeaf theme={theme} size="100%" />
            </div>
            <div style={{ position: 'absolute', top: '30%', left: '2%', width: '40%', transform: 'rotate(28deg)' }}>
                <svg viewBox="-14 -50 28 52" width="100%" height="100%" aria-hidden="true" style={{ display: 'block' }}>
                    <path d={SIMPLE_LEAF} fill={theme.leafLight} stroke={theme.leafDeep} strokeWidth={1} />
                    <path d="M0 -2 L0 -44" stroke={theme.leafDeep} strokeWidth={1} opacity={0.5} />
                </svg>
            </div>
            <div style={{ position: 'absolute', top: '18%', left: '20%', width: '52%', transform: 'rotate(6deg)' }}>
                <Hibiscus theme={theme} size="100%" />
            </div>
        </div>
    );
}

/** Divider: hairlines + two leaves + a hibiscus dot. */
function Divider({ theme }: { theme: Theme }) {
    return (
        <svg
            width={220}
            height={28}
            viewBox="0 0 220 28"
            aria-hidden="true"
            style={{ display: 'block', margin: '18px auto 0' }}
        >
            <line x1="18" y1="14" x2="90" y2="14" stroke={theme.accent} strokeWidth={1.2} />
            <line x1="130" y1="14" x2="202" y2="14" stroke={theme.accent} strokeWidth={1.2} />
            <g transform="translate(98 14) rotate(-28) scale(0.5)">
                <path d={SIMPLE_LEAF} fill={theme.leafDeep} />
            </g>
            <g transform="translate(122 14) rotate(28) scale(0.5)">
                <path d={SIMPLE_LEAF} fill={theme.leafDeep} />
            </g>
            <circle cx="110" cy="14" r="5.5" fill={theme.accent} />
            <circle cx="110" cy="14" r="2" fill={theme.pollen} />
        </svg>
    );
}

/** Small leaf bullet used on the programme timeline. */
function LeafBullet({ theme }: { theme: Theme }) {
    return (
        <svg width={22} height={22} viewBox="-14 -50 28 52" aria-hidden="true" style={{ display: 'block' }}>
            <path d={SIMPLE_LEAF} fill={theme.leaf} stroke={theme.leafDeep} strokeWidth={1.4} />
            <path d="M0 -2 L0 -44" stroke={theme.leafDeep} strokeWidth={1} opacity={0.55} />
        </svg>
    );
}

/** Ambient drifting petals + leaves (cover only, decorative). */
function FloatingBotanicals({ theme }: { theme: Theme }) {
    const items = useMemo(
        () =>
            Array.from({ length: 16 }, (_, i) => ({
                key: i,
                left: (i * 6.1 + 4) % 100,
                delay: (i % 8) * 1.3,
                dur: 10 + (i % 5) * 2.4,
                size: 14 + (i % 4) * 8,
                kind: i % 3, // 0,1 petal / 2 leaf
                rot: (i * 53) % 360,
            })),
        [],
    );
    return (
        <div
            aria-hidden="true"
            style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}
        >
            {items.map((p) => (
                <svg
                    key={p.key}
                    width={p.size}
                    height={p.size}
                    viewBox="-40 -84 80 92"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: `${p.left}%`,
                        transform: `rotate(${p.rot}deg)`,
                        animation: `pk-br-fall ${p.dur}s linear ${p.delay}s infinite`,
                        willChange: 'transform',
                    }}
                >
                    {p.kind === 2 ? (
                        <path d={SIMPLE_LEAF} fill={theme.leaf} opacity={0.55} transform="scale(1.4)" />
                    ) : (
                        <path d={HIBISCUS_PETAL} fill={theme.accent} opacity={0.5} />
                    )}
                </svg>
            ))}
        </div>
    );
}

// =========================================================================
//  Motion + layout helpers
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
    const reduce = useReducedMotion();
    if (preview || reduce) {
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
            <Divider theme={theme} />
        </div>
    );
}

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
//  Live countdown
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
        const t = new Date(target).getTime();
        if (Number.isNaN(t)) return; // guard invalid ISO strings
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
                boxShadow: '0 8px 24px rgba(120,20,30,0.10)',
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
//  Main template
// =========================================================================

interface Corner {
    pos: CSSProperties;
    flip: string;
    origin: string;
    delay: number;
    rot: number;
}

export default function BungaRayaTemplate({ data, preview, slots }: TemplateProps) {
    const p = data.palette;
    const theme: Theme = {
        primary: p?.primary ?? '#9c1f2e',
        secondary: p?.secondary ?? '#7d5a4f',
        accent: p?.accent ?? '#d3273e',
        bg: p?.bg ?? '#fbf4e9',
        text: p?.text ?? '#3f2d28',
        leaf: '#3f8a5a',
        leafDeep: '#276444',
        leafLight: '#6bbf88',
        petalDeep: '#8f1520',
        pollen: '#f2b705',
        card: '#fffdf7',
        line: 'rgba(160,40,50,0.22)',
    };

    const groomShort = data.groomShort ?? data.groomName;
    const brideShort = data.brideShort ?? data.brideName;

    const reduce = useReducedMotion();
    const motionOn = !preview && !reduce;

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

    const corners: Corner[] = useMemo(
        () => [
            { pos: { top: 0, left: 0 }, flip: 'none', origin: 'top left', delay: 0.1, rot: -22 },
            { pos: { top: 0, right: 0 }, flip: 'scaleX(-1)', origin: 'top right', delay: 0.24, rot: 22 },
            { pos: { bottom: 0, left: 0 }, flip: 'scaleY(-1)', origin: 'bottom left', delay: 0.38, rot: 22 },
            { pos: { bottom: 0, right: 0 }, flip: 'scale(-1,-1)', origin: 'bottom right', delay: 0.52, rot: -22 },
        ],
        [],
    );

    const rootStyle: CSSProperties = {
        fontFamily: BODY,
        fontSize: 18,
        lineHeight: 1.7,
        color: theme.text,
        background: theme.bg,
        backgroundImage:
            'radial-gradient(130% 60% at 50% 0%, rgba(255,255,255,0.55), rgba(255,255,255,0) 55%)',
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

    const cornerSize = 'clamp(140px, 42vw, 290px)';

    return (
        <div style={rootStyle}>
            <style>{`
                @keyframes pk-br-fall {
                    0%   { transform: translateY(-14vh) rotate(0deg); opacity: 0; }
                    12%  { opacity: 0.75; }
                    100% { transform: translateY(116vh) rotate(300deg); opacity: 0; }
                }
                @media (prefers-reduced-motion: reduce) {
                    * { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; }
                }
            `}</style>

            {/* ---------------------------------------------------------- */}
            {/* 1. COVER — hibiscus bloom in from corners + zoom reveal     */}
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
                {motionOn && <FloatingBotanicals theme={theme} />}

                {/* corner blooms — outer element animates, inner element flips */}
                {corners.map((c, i) => (
                    <motion.div
                        key={i}
                        aria-hidden="true"
                        style={{
                            position: 'absolute',
                            ...c.pos,
                            width: cornerSize,
                            height: cornerSize,
                            transformOrigin: c.origin,
                            pointerEvents: 'none',
                            zIndex: 1,
                        }}
                        initial={motionOn ? { opacity: 0, scale: 0.25, rotate: c.rot } : false}
                        animate={{ opacity: 0.96, scale: 1, rotate: 0 }}
                        transition={{ duration: 1.2, delay: c.delay, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <div style={{ width: '100%', height: '100%', transform: c.flip }}>
                            <CornerBloom theme={theme} />
                        </div>
                    </motion.div>
                ))}

                {/* zooming centre content */}
                <motion.div
                    initial={motionOn ? { opacity: 0, scale: 0.82 } : false}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1.1, delay: 0.5, ease: 'easeOut' }}
                    style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 560 }}
                >
                    {data.bismillah && (
                        <div style={{ direction: 'rtl', marginBottom: 22 }}>
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
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
                        <div style={{ width: 'clamp(90px, 24vw, 130px)' }}>
                            <Hibiscus theme={theme} size="100%" />
                        </div>
                    </div>

                    <div
                        style={{
                            fontFamily: BODY,
                            fontSize: 13,
                            letterSpacing: '0.34em',
                            textTransform: 'uppercase',
                            color: theme.secondary,
                            marginBottom: 6,
                        }}
                    >
                        Walimatulurus
                    </div>

                    <div
                        style={{
                            fontFamily: SERIF,
                            fontSize: 'clamp(34px, 9vw, 56px)',
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
                            color: theme.accent,
                            margin: '2px 0',
                        }}
                    >
                        &amp;
                    </div>
                    <div
                        style={{
                            fontFamily: SERIF,
                            fontSize: 'clamp(34px, 9vw, 56px)',
                            fontWeight: 600,
                            color: theme.primary,
                            lineHeight: 1.05,
                        }}
                    >
                        {brideShort}
                    </div>

                    {data.dateLabel && (
                        <div
                            style={{
                                fontFamily: SERIF,
                                fontSize: 'clamp(18px, 4.5vw, 24px)',
                                color: theme.primary,
                                marginTop: 18,
                            }}
                        >
                            {data.dateLabel}
                        </div>
                    )}
                    <Divider theme={theme} />
                </motion.div>

                {/* scroll cue */}
                <motion.div
                    initial={motionOn ? { opacity: 0 } : false}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 1.5 }}
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
                        animate={motionOn ? { y: [0, 9, 0] } : undefined}
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
            <Section background="rgba(255,255,255,0.45)">
                <SectionHeading theme={theme} eyebrow="Pasangan Bahagia" title="Pengantin" />

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
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                            <svg width={56} height={20} viewBox="0 0 56 20" aria-hidden="true">
                                <line x1="0" y1="10" x2="40" y2="10" stroke={theme.accent} strokeWidth={1.2} />
                                <g transform="translate(48 10) rotate(24) scale(0.4)">
                                    <path d={SIMPLE_LEAF} fill={theme.leafDeep} />
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
                                <g transform="translate(8 10) rotate(-24) scale(0.4)">
                                    <path d={SIMPLE_LEAF} fill={theme.leafDeep} />
                                </g>
                                <line x1="16" y1="10" x2="56" y2="10" stroke={theme.accent} strokeWidth={1.2} />
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
            {/* 4. DATE + LIVE COUNTDOWN                                     */}
            {/* ---------------------------------------------------------- */}
            <Section>
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
            {/* 5. ATUR CARA — leaf-bullet timeline                         */}
            {/* ---------------------------------------------------------- */}
            {data.program && data.program.length > 0 && (
                <Section background="rgba(255,255,255,0.45)">
                    <SectionHeading theme={theme} eyebrow="Rentak Majlis" title="Atur Cara" />

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
                                style={{ position: 'relative', paddingLeft: 44, marginBottom: 26 }}
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
                                        background: theme.bg,
                                        borderRadius: '50%',
                                    }}
                                >
                                    <LeafBullet theme={theme} />
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
            )}

            {/* ---------------------------------------------------------- */}
            {/* 6. LOKASI                                                   */}
            {/* ---------------------------------------------------------- */}
            {(data.venueName || data.venueAddress || data.mapsUrl || data.wazeUrl) && (
                <Section>
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
            )}

            {/* ---------------------------------------------------------- */}
            {/* 7. RSVP                                                     */}
            {/* ---------------------------------------------------------- */}
            {slots?.rsvp && (
                <Section background="rgba(255,255,255,0.45)">
                    <SectionHeading theme={theme} eyebrow="Khabarkan Kehadiran" title="RSVP Kehadiran" />
                    <Reveal preview={preview}>{slots.rsvp}</Reveal>
                </Section>
            )}

            {/* ---------------------------------------------------------- */}
            {/* 8. UCAPAN                                                   */}
            {/* ---------------------------------------------------------- */}
            <Section>
                <SectionHeading theme={theme} eyebrow="Doa & Restu" title="Ucapan Kasih" />
                <Reveal preview={preview}>
                    {slots?.wishes ?? (
                        <div
                            style={{
                                background: theme.card,
                                border: `1px solid ${theme.line}`,
                                borderRadius: 18,
                                padding: '34px 24px',
                                textAlign: 'center',
                                boxShadow: '0 12px 30px rgba(120,20,30,0.08)',
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
                <Section>
                    <SectionHeading theme={theme} eyebrow="Tanda Ingatan" title="Senarai Hadiah" />
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
                                        borderRadius: 14,
                                        background: theme.card,
                                        border: `1px solid ${theme.line}`,
                                        textDecoration: 'none',
                                        color: theme.text,
                                        boxShadow: '0 8px 20px rgba(120,20,30,0.06)',
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
                    <SectionHeading
                        theme={theme}
                        eyebrow="Tanda Kasih"
                        title="Salam Kaut"
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
                                boxShadow: '0 14px 34px rgba(120,20,30,0.10)',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                                <span
                                    style={{
                                        width: 54,
                                        height: 54,
                                        borderRadius: '50%',
                                        background: 'rgba(211,39,62,0.12)',
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
                                            background: copied ? theme.leafDeep : theme.accent,
                                            color: '#fff',
                                            borderColor: copied ? theme.leafDeep : theme.accent,
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
                                          borderRadius: 14,
                                          overflow: 'hidden',
                                          border: `1px solid ${theme.line}`,
                                          boxShadow: '0 10px 24px rgba(120,20,30,0.08)',
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
                                          background: 'rgba(211,39,62,0.05)',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          gap: 10,
                                          color: theme.accent,
                                      }}
                                  >
                                      <div style={{ width: 70 }}>
                                          <Hibiscus theme={theme} size="100%" />
                                      </div>
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
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                        <div style={{ width: 'clamp(96px, 26vw, 140px)' }}>
                            <Hibiscus theme={theme} size="100%" />
                        </div>
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
