// ============================================================
// Pelamin Diraja — Malay royal wedding-dais e-invitation template.
// Dark royal-purple + gold "raja sehari" mood. Self-contained:
// every ornament is original inline SVG / CSS. No external
// images, fonts, CDNs or network requests.
// ============================================================

import { useEffect, useId, useMemo, useState } from 'react';import type { CSSProperties, ReactNode } from 'react';
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
import { OpeningGate } from '../OpeningGate';
import { useCardText } from '../cardText';
import { REVEAL_TIMING, TEMPLATE_ART, groundPattern } from '../templateArt';
import { PrayerSection } from '../../components/PrayerSection';

/**
 * Entrance personality for this design, from its art direction — the
 * catalogue used to share one easing curve, which made every card feel
 * the same however differently it was coloured.
 */
const MOTION = REVEAL_TIMING[TEMPLATE_ART['pelamin'].reveal];


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
    gold: string;
    goldDeep: string;
    purple: string;
    purpleDeep: string;
    card: string;
    line: string;
}

// =========================================================================
//  Small original SVG ornaments
// =========================================================================

/** A tiny onion-bulb finial — sits atop the pelamin arch. */
function Finial({ fill }: { fill: string }) {
    return (
        <g>
            <line x1="0" y1="0" x2="0" y2="-7" stroke={fill} strokeWidth={2} strokeLinecap="round" />
            <path d="M0 -7 C -5 -11 -5 -19 0 -25 C 5 -19 5 -11 0 -7 Z" fill={fill} />
            <circle cx="0" cy="-28" r="1.8" fill={fill} />
        </g>
    );
}

/**
 * The ornate PELAMIN ARCH — a symmetric Malay ogee / onion arch outlined
 * in gold, with a double inner line, a keystone lozenge, a base plinth,
 * and three decorative finials (which may shimmer). Drawn once, static.
 */
function PelaminArch({
    theme,
    size = '100%',
    animate = false,
}: {
    theme: Theme;
    size?: number | string;
    animate?: boolean;
}) {
    const outer =
        'M 56 500 L 56 250 C 56 168 96 168 132 140 C 168 112 182 74 200 24 ' +
        'C 218 74 232 112 268 140 C 304 168 344 168 344 250 L 344 500 L 56 500 Z';
    const inner =
        'M 72 496 L 72 254 C 72 182 106 182 140 156 C 172 130 186 92 200 52 ' +
        'C 214 92 228 130 260 156 C 294 182 328 182 328 254 L 328 496';

    const finials = [
        { x: 200, y: 24, s: 1.15, delay: 0, dur: 2.6 },
        { x: 132, y: 140, s: 0.7, delay: 0.7, dur: 3.0 },
        { x: 268, y: 140, s: 0.7, delay: 1.3, dur: 2.8 },
    ];

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 -14 400 526"
            role="img"
            aria-label="Pelamin arch"
            preserveAspectRatio="xMidYMax meet"
            style={{ display: 'block', overflow: 'visible' }}
        >
            <path d={outer} fill="rgba(255,255,255,0.03)" stroke={theme.gold} strokeWidth={3} strokeLinejoin="round" />
            <path d={inner} fill="none" stroke={theme.accent} strokeWidth={1.4} strokeLinejoin="round" opacity={0.85} />

            {/* base plinth — the dais floor */}
            <line x1="38" y1="500" x2="362" y2="500" stroke={theme.gold} strokeWidth={3} strokeLinecap="round" />
            <line x1="46" y1="509" x2="354" y2="509" stroke={theme.accent} strokeWidth={1.4} strokeLinecap="round" opacity={0.7} />

            {/* keystone lozenge at the apex interior */}
            <path d="M200 80 L209 96 L200 112 L191 96 Z" fill={theme.gold} opacity={0.9} />
            <circle cx="200" cy="130" r="2.2" fill={theme.accent} opacity={0.8} />

            {finials.map((f, i) => (
                <g
                    key={i}
                    transform={`translate(${f.x} ${f.y}) scale(${f.s})`}
                    style={
                        animate
                            ? { animation: `pk-shimmer ${f.dur}s ease-in-out ${f.delay}s infinite`, willChange: 'opacity' }
                            : undefined
                    }
                >
                    <Finial fill={theme.gold} />
                </g>
            ))}
        </svg>
    );
}

/**
 * A scalloped draped VALANCE (curtain pelmet) spanning the top of the cover,
 * with tiny hanging tassels. The wrapper gently sways (GPU transform loop).
 */
function Valance({ theme, animate = false }: { theme: Theme; animate?: boolean }) {
    const rawId = useId();
    const gid = `pk-val-${rawId.replace(/:/g, '')}`;

    const W = 400;
    const base = 30;
    const dip = 30;
    const n = 8;
    const w = W / n;

    const { d, cusps } = useMemo(() => {
        let path = `M0 0 H${W} V${base} `;
        const cuspXs: number[] = [];
        for (let i = 0; i < n; i++) {
            const x1 = W - i * w;
            const midx = x1 - w / 2;
            const x2 = x1 - w;
            cuspXs.push(midx);
            path += `Q${midx.toFixed(1)} ${base + dip} ${x2.toFixed(1)} ${base} `;
        }
        path += 'V0 Z';
        return { d: path, cusps: cuspXs };
    }, [w]);

    return (
        <div
            style={{
                transformOrigin: 'top center',
                animation: animate ? 'pk-drape 5.5s ease-in-out infinite alternate' : undefined,
                willChange: animate ? 'transform' : undefined,
            }}
        >
            <svg
                width="100%"
                height={74}
                viewBox={`0 0 ${W} 74`}
                preserveAspectRatio="none"
                aria-hidden="true"
                style={{ display: 'block' }}
            >
                <defs>
                    <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={theme.gold} />
                        <stop offset="100%" stopColor={theme.goldDeep} />
                    </linearGradient>
                </defs>
                <path d={d} fill={`url(#${gid})`} />
                <path d={d} fill="none" stroke={theme.accent} strokeWidth={1} opacity={0.55} />
                {cusps.map((cx, i) => (
                    <g key={i}>
                        <line x1={cx} y1={base + dip} x2={cx} y2={base + dip + 9} stroke={theme.goldDeep} strokeWidth={1.4} />
                        <circle cx={cx} cy={base + dip + 12} r={3} fill={theme.gold} />
                    </g>
                ))}
            </svg>
        </div>
    );
}

/**
 * A BUNGA MANGGAR spray — thin stems fanning up from a base, each tipped
 * with a gold blossom. Flanks the arch. Static ornament.
 */
function BungaManggar({ theme }: { theme: Theme }) {
    const base = { x: 60, y: 196 };
    const stems = [
        { cx: 60, cy: 90, tx: 60, ty: 12 },
        { cx: 46, cy: 96, tx: 24, ty: 40 },
        { cx: 74, cy: 96, tx: 96, ty: 40 },
        { cx: 42, cy: 112, tx: 8, ty: 88 },
        { cx: 78, cy: 112, tx: 112, ty: 88 },
        { cx: 50, cy: 100, tx: 40, ty: 20 },
        { cx: 70, cy: 100, tx: 80, ty: 20 },
    ];
    return (
        <svg width="100%" viewBox="0 0 120 212" aria-hidden="true" style={{ display: 'block', overflow: 'visible' }}>
            {/* binding / pot at the base */}
            <path d="M52 194 L68 194 L64 210 L56 210 Z" fill={theme.goldDeep} />
            {stems.map((s, i) => (
                <g key={i}>
                    <path
                        d={`M${base.x} ${base.y} Q ${s.cx} ${s.cy} ${s.tx} ${s.ty}`}
                        fill="none"
                        stroke={theme.accent}
                        strokeWidth={1.4}
                        strokeLinecap="round"
                        opacity={0.9}
                    />
                    <circle cx={s.cx} cy={s.cy} r={2} fill={theme.gold} opacity={0.85} />
                    <circle cx={s.tx} cy={s.ty} r={4.2} fill={theme.gold} />
                    <circle cx={s.tx} cy={s.ty} r={1.8} fill={theme.goldDeep} />
                </g>
            ))}
        </svg>
    );
}

/** A songket-style pucuk rebung (bamboo-shoot triangle) border band. */
function SongketBorder({ theme, flip = false }: { theme: Theme; flip?: boolean }) {
    const rawId = useId();
    const pid = `pk-songket-${rawId.replace(/:/g, '')}`;
    const H = 16;
    const unit = 26;
    return (
        <svg
            width="100%"
            height={H}
            aria-hidden="true"
            style={{ display: 'block', transform: flip ? 'scaleY(-1)' : undefined }}
        >
            <defs>
                <pattern id={pid} width={unit} height={H} patternUnits="userSpaceOnUse">
                    <path d={`M0 ${H} L${unit / 2} 2 L${unit} ${H} Z`} fill="none" stroke={theme.line} strokeWidth={1.2} />
                    <path
                        d={`M${unit / 2 - 6} ${H} L${unit / 2} ${H - 8} L${unit / 2 + 6} ${H} Z`}
                        fill={theme.gold}
                        opacity={0.85}
                    />
                    <circle cx={unit / 2} cy={H - 3} r={1} fill={theme.gold} />
                </pattern>
            </defs>
            <rect x="0" y="0" width="100%" height={H} fill={`url(#${pid})`} />
            <line x1="0" y1={H - 0.5} x2="100%" y2={H - 0.5} stroke={theme.line} strokeWidth={1} />
        </svg>
    );
}

/** Divider: a small gold motif — twin lines flanking a bunga-telur lozenge. */
function Divider({ theme }: { theme: Theme }) {
    return (
        <svg
            width={220}
            height={24}
            viewBox="0 0 220 24"
            aria-hidden="true"
            style={{ display: 'block', margin: '18px auto 0' }}
        >
            <line x1="20" y1="12" x2="92" y2="12" stroke={theme.accent} strokeWidth={1.2} />
            <line x1="128" y1="12" x2="200" y2="12" stroke={theme.accent} strokeWidth={1.2} />
            <circle cx="98" cy="12" r="2" fill={theme.gold} />
            <circle cx="122" cy="12" r="2" fill={theme.gold} />
            <path d="M110 3 L118 12 L110 21 L102 12 Z" fill={theme.gold} />
            <path d="M110 7 L114.5 12 L110 17 L105.5 12 Z" fill={theme.purpleDeep} />
        </svg>
    );
}

/**
 * Signature sparkle rain (inverted) — up to 10 tiny gold sparkles rising.
 * GPU-cheap: each span animates only transform (translateY) + opacity.
 */
function Sparkles({ theme }: { theme: Theme }) {
    const items = useMemo(
        () =>
            Array.from({ length: 10 }, (_, i) => ({
                key: i,
                left: (i * 9.7 + 4) % 100,
                delay: (i % 5) * 1.4,
                dur: 7 + (i % 4) * 1.6,
                size: 9 + (i % 3) * 4,
            })),
        [],
    );
    return (
        <div
            aria-hidden="true"
            style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 1 }}
        >
            {items.map((s) => (
                <span
                    key={s.key}
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: `${s.left}%`,
                        animation: `pk-rise ${s.dur}s linear ${s.delay}s infinite`,
                        willChange: 'transform',
                    }}
                >
                    <svg width={s.size} height={s.size} viewBox="0 0 12 12" style={{ display: 'block' }}>
                        <path
                            d="M6 0 L7.4 4.6 L12 6 L7.4 7.4 L6 12 L4.6 7.4 L0 6 L4.6 4.6 Z"
                            fill={theme.gold}
                            opacity={0.85}
                        />
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
                boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
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
                padding: 'clamp(64px, 11vw, 120px) 20px',
                background,
                ...style,
            }}
        >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, opacity: 0.8, zIndex: 0 }}>
                <SongketBorder theme={theme} />
            </div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, opacity: 0.8, zIndex: 0 }}>
                <SongketBorder theme={theme} flip />
            </div>
            <div style={{ maxWidth: 720, margin: '0 auto', position: 'relative', zIndex: 1 }}>{children}</div>
        </section>
    );
}

// =========================================================================
//  Main template
// =========================================================================

export default function PelaminTemplate(props: TemplateProps) {
    const { data, preview } = props;
    return (
        <OpeningGate
            reveal="door"
            data={data}
            preview={preview}
            panelColor={data.palette?.bg ?? '#2b1339'}
            accentColor={data.palette?.accent ?? '#e9c46a'}
        >
            <PelaminTemplateInner {...props} />
        </OpeningGate>
    );
}

function PelaminTemplateInner({ data, preview, slots }: TemplateProps) {
    const tr = useCardText();
    const reduce = useReducedMotion() ?? false;
    const active = !preview && !reduce;
    const p = data.palette;
    const theme: Theme = {
        primary: p?.primary ?? '#f0cf7e',
        secondary: p?.secondary ?? '#c9a9d8',
        accent: p?.accent ?? '#e9c46a',
        bg: p?.bg ?? '#2b1339',
        text: p?.text ?? '#f2e8f5',
        gold: p?.primary ?? '#f0cf7e',
        goldDeep: '#b8863b',
        purple: '#3a1c4d',
        purpleDeep: '#1f0d2b',
        card: '#3a1c4d',
        line: 'rgba(240,207,126,0.38)',
    };

    const groomShort = data.groomShort ?? data.groomName;
    const brideShort = data.brideShort ?? data.brideName;

    const bismillahCustom = data.bismillahText?.trim();
    const walimahText = data.walimahLabel ?? tr('Walimatulurus');
    const brideFirst = (data.inviteSide === 'bride' || data.inviteSide === 'both_bride');
    const firstShort = brideFirst ? brideShort : groomShort;
    const secondShort = brideFirst ? groomShort : brideShort;
    const firstName = brideFirst ? data.brideName : data.groomName;
    const secondName = brideFirst ? data.groomName : data.brideName;
    const firstParents = brideFirst ? data.brideParents : data.groomParents;
    const secondParents = brideFirst ? data.groomParents : data.brideParents;

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
        backgroundImage: `${groundPattern('weave', theme.accent, 0.07)}, radial-gradient(120% 62% at 50% 0%, rgba(120,60,150,0.38), rgba(0,0,0,0) 58%)`,
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

    const archSize = 'min(82vw, 420px)';

    return (
        <div style={rootStyle}>
            <style>{`
                @keyframes pk-rise {
                    0%   { transform: translateY(0) scale(0.5); opacity: 0; }
                    12%  { opacity: 0.95; }
                    85%  { opacity: 0.95; }
                    100% { transform: translateY(-90vh) scale(1.05); opacity: 0; }
                }
                @keyframes pk-drape {
                    0%   { transform: translateX(-7px) rotate(-1deg); }
                    100% { transform: translateX(7px) rotate(1deg); }
                }
                @keyframes pk-shimmer {
                    0%, 100% { opacity: 0.5; }
                    50%      { opacity: 1; }
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
                    padding: '96px 20px 44px',
                    // Clear the absolutely-positioned scroll cue below (~66px tall from the
                    // bottom edge) so centred content can never sit underneath it.
                    paddingBottom: 'var(--pk-cue-clear, 96px)',
                    overflow: 'hidden',
                }}
            >
                {/* draped valance across the very top */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2 }}>
                    <Valance theme={theme} animate={active} />
                </div>

                {active && <Sparkles theme={theme} />}

                <div style={{ position: 'relative', zIndex: 3, width: '100%', maxWidth: 560 }}>
                    {data.bismillah && (
                        <motion.div
                            initial={preview ? false : { opacity: 0, y: -12 }}
                            animate={preview ? undefined : { opacity: 1, y: 0 }}
                            transition={{ duration: 1.2, delay: 0.2, ease: 'easeOut' }}
                            style={{ direction: bismillahCustom ? undefined : 'rtl', marginBottom: 24 }}
                        >
                            <div
                                style={{
                                    fontFamily: bismillahCustom ? SERIF : ARABIC,
                                    fontSize: 'clamp(24px, 6vw, 38px)',
                                    color: theme.primary,
                                    lineHeight: 1.9,
                                }}
                            >
                                {bismillahCustom || 'بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ'}
                            </div>
                        </motion.div>
                    )}

                    <div
                        style={{
                            position: 'relative',
                            // Container-relative (a vw-capped width overran the column in the
                            // fixed thumbnail stage and clipped on the right).
                            width: 'min(96%, 420px)',
                            aspectRatio: '400 / 526',
                            margin: '0 auto',
                        }}
                    >
                        <motion.div
                            initial={preview ? false : { opacity: 0, scale: 0.92, y: 10 }}
                            animate={preview ? undefined : { opacity: 1, scale: 1, y: 0 }}
                            transition={{ duration: 1.5, ease: 'easeOut' }}
                            style={{ position: 'absolute', inset: 0 }}
                        >
                            <PelaminArch theme={theme} animate={active} />
                        </motion.div>

                        {/* bunga manggar sprays flanking the dais */}
                        <div style={{ position: 'absolute', left: '-5%', bottom: '3%', width: '30%', zIndex: 1 }}>
                            <BungaManggar theme={theme} />
                        </div>
                        <div
                            style={{
                                position: 'absolute',
                                right: '-5%',
                                bottom: '3%',
                                width: '30%',
                                zIndex: 1,
                                transform: 'scaleX(-1)',
                            }}
                        >
                            <BungaManggar theme={theme} />
                        </div>

                        {/* couple names, centred inside the arch */}
                        <motion.div
                            initial={preview ? false : { opacity: 0, scale: 0.9 }}
                            animate={preview ? undefined : { opacity: 1, scale: 1 }}
                            transition={{ duration: 1, delay: 0.7, ease: 'easeOut' }}
                            style={{
                                position: 'absolute',
                                top: '46%',
                                left: 0,
                                right: 0,
                                transform: 'translateY(-50%)',
                                padding: '0 17%',
                                zIndex: 2,
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
                                Raja Sehari
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
                                {firstShort}
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
                                {secondShort}
                            </div>
                        </motion.div>
                    </div>

                    <motion.div
                        initial={preview ? false : { opacity: 0, y: 14 }}
                        animate={preview ? undefined : { opacity: 1, y: 0 }}
                        transition={{ duration: 1, delay: 1.1, ease: 'easeOut' }}
                        style={{ marginTop: 26 }}
                    >
                        {walimahText.trim() && (
                            <div
                                style={{
                                    fontFamily: BODY,
                                    fontSize: 14,
                                    letterSpacing: '0.34em',
                                    textTransform: 'uppercase',
                                    color: theme.secondary,
                                }}
                            >
                                {walimahText}
                            </div>
                        )}
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
            <Section theme={theme} background="rgba(255,255,255,0.04)">
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
                            {firstName}
                        </h3>
                        {firstParents && (
                            <p style={{ margin: '8px 0 0', color: theme.secondary, fontSize: 16 }}>
                                {firstParents}
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
                                <path d="M52 4 L56 10 L52 16 L48 10 Z" fill={theme.gold} />
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
                                <path d="M4 4 L8 10 L4 16 L0 10 Z" fill={theme.gold} />
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
                            {secondName}
                        </h3>
                        {secondParents && (
                            <p style={{ margin: '8px 0 0', color: theme.secondary, fontSize: 16 }}>
                                {secondParents}
                            </p>
                        )}
                    </Reveal>
                </div>
            </Section>

            <PrayerSection text={data.prayer} primary={theme.primary} accent={theme.accent} secondary={theme.secondary} serif={SERIF} />

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
                <Section theme={theme} background="rgba(255,255,255,0.04)">
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
                <Section theme={theme} background="rgba(255,255,255,0.04)">
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
                                boxShadow: '0 12px 30px rgba(0,0,0,0.35)',
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
                <Section theme={theme}>
                    <SectionHeading theme={theme} eyebrow={tr("Tanda Ingatan")} title={tr("Senarai Hadiah")} />
                    <Reveal preview={preview}>{slots.wishlist}</Reveal>
                </Section>
            )}</PkSec>

            {/* ---------------------------------------------------------- */}
            {/* 9. HUBUNGI                                                  */}
            {/* ---------------------------------------------------------- */}
            <PkSec name="contacts">{data.contacts && data.contacts.length > 0 && (
                <Section theme={theme} background="rgba(255,255,255,0.04)">
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
                                        boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
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
            {/* 10. SALAM KAUT                                              */}
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
                                boxShadow: '0 14px 34px rgba(0,0,0,0.4)',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                                <span
                                    style={{
                                        width: 54,
                                        height: 54,
                                        borderRadius: '50%',
                                        background: 'rgba(240,207,126,0.14)',
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
            )}</PkSec>

            {/* ---------------------------------------------------------- */}
            {/* 11. GALERI                                                  */}
            {/* ---------------------------------------------------------- */}
            <PkSec name="gallery"><Section theme={theme} background="rgba(255,255,255,0.04)">
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
                                          boxShadow: '0 10px 24px rgba(0,0,0,0.35)',
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
                                          background: 'rgba(240,207,126,0.05)',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          gap: 10,
                                          color: theme.accent,
                                          padding: '0 12px',
                                      }}
                                  >
                                      <Divider theme={theme} />
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
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, opacity: 0.8 }}>
                    <SongketBorder theme={theme} />
                </div>
                <Reveal preview={preview}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
                        <PelaminArch theme={theme} size={132} />
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
                        {firstShort}
                        <span style={{ color: theme.accent, fontStyle: 'italic', margin: '0 12px' }}>&amp;</span>
                        {secondShort}
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
                        <Heart size={20} color={theme.accent} fill={theme.gold} />
                    </div>
                    <Divider theme={theme} />
                </Reveal>
            </footer>
        </div>
    );
}
