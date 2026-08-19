// ============================================================
// Peranakan / "Pusaka Peranakan" wedding e-invitation template.
// A vibrant Straits-Chinese (Nyonya) tile-heritage skin.
// Self-contained: all ornaments are original inline SVG / CSS.
// No external images, fonts, CDNs or network requests.
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
import { useCardText } from '../cardText';
import { REVEAL_TIMING, TEMPLATE_ART } from '../templateArt';
import { PrayerSection } from '../../components/PrayerSection';

/**
 * Entrance personality for this design, from its art direction — the
 * catalogue used to share one easing curve, which made every card feel
 * the same however differently it was coloured.
 */
const MOTION = REVEAL_TIMING[TEMPLATE_ART['peranakan'].reveal];


// ---------- typography ---------------------------------------------------
const SERIF = "'Cormorant Garamond', 'Playfair Display', Georgia, 'Times New Roman', serif";
const NAMES = "var(--pk-name, 'Cormorant Garamond'), 'Playfair Display', Georgia, 'Times New Roman', serif";
const BODY = "'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', sans-serif";
const ARABIC = "'Traditional Arabic', 'Scheherazade New', 'Amiri', 'Noto Naskh Arabic', serif";

// ---------- depth --------------------------------------------------------
const SHADOW = '0 12px 32px rgba(0,0,0,0.34)';

// ---------- theme --------------------------------------------------------
interface Theme {
    primary: string;
    secondary: string;
    accent: string;
    bg: string;
    text: string;
    teal: string;
    tealDeep: string;
    tealLight: string;
    coral: string;
    coralDeep: string;
    gold: string;
    goldDeep: string;
    cream: string;
    card: string;
    line: string;
}

// =========================================================================
//  Small original SVG ornaments  (Nyonya floral-tile motifs)
// =========================================================================

interface TileColors {
    base: string;
    petal: string;
    petalAlt: string;
    center: string;
    corner: string;
    line: string;
}

function tileColors(theme: Theme): TileColors {
    return {
        base: theme.tealDeep,
        petal: theme.coral,
        petalAlt: theme.gold,
        center: theme.gold,
        corner: theme.goldDeep,
        line: 'rgba(242,201,76,0.30)',
    };
}

/**
 * A single Peranakan floral tile — a peony-in-square with corner
 * quarter-flowers that fuse into full blooms when tiled edge-to-edge.
 * Drawn in a 0..100 coordinate box (no <svg> wrapper) so it can be
 * dropped into a <pattern>, an overlay <svg>, etc.
 */
function TileMotif({ base, petal, petalAlt, center, corner, line }: TileColors) {
    return (
        <>
            <rect x={3} y={3} width={94} height={94} rx={10} fill={base} stroke={line} strokeWidth={1.5} />
            {([
                [3, 3, 0],
                [97, 3, 90],
                [97, 97, 180],
                [3, 97, 270],
            ] as const).map(([cx, cy, rot], i) => (
                <g key={`c${i}`} transform={`translate(${cx} ${cy}) rotate(${rot})`}>
                    <path d="M0 0 L20 0 A20 20 0 0 1 0 20 Z" fill={corner} opacity={0.9} />
                    <path d="M0 0 L11 0 A11 11 0 0 1 0 11 Z" fill={petal} />
                </g>
            ))}
            <g transform="translate(50 50)">
                {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
                    <g key={`o${a}`} transform={`rotate(${a})`}>
                        <ellipse cx={0} cy={-19} rx={7.5} ry={13} fill={petal} />
                    </g>
                ))}
                {[22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].map((a) => (
                    <g key={`i${a}`} transform={`rotate(${a})`}>
                        <ellipse cx={0} cy={-11} rx={5} ry={9} fill={petalAlt} />
                    </g>
                ))}
                <circle r={6.5} fill={center} />
                <circle r={2.6} fill={base} />
            </g>
        </>
    );
}

/** A tiny 6-petal peony used for crests and corner flourishes. */
function MiniPeony({ petal, center, base }: { petal: string; center: string; base: string }) {
    return (
        <g>
            {[0, 60, 120, 180, 240, 300].map((a) => (
                <g key={a} transform={`rotate(${a})`}>
                    <ellipse cx={0} cy={-9} rx={4.5} ry={8} fill={petal} />
                </g>
            ))}
            <circle r={4.5} fill={center} />
            <circle r={1.8} fill={base} />
        </g>
    );
}

// scalloped / ogee frame path, computed once (clockwise, all bumps outward)
function scallopPath(w: number, h: number, target: number): string {
    const nx = Math.max(3, Math.round(w / (2 * target)));
    const ny = Math.max(4, Math.round(h / (2 * target)));
    const rx = w / (2 * nx);
    const ry = h / (2 * ny);
    let d = 'M0 0';
    for (let i = 0; i < nx; i++) d += ` a ${rx} ${rx} 0 0 1 ${2 * rx} 0`;
    for (let i = 0; i < ny; i++) d += ` a ${ry} ${ry} 0 0 1 0 ${2 * ry}`;
    for (let i = 0; i < nx; i++) d += ` a ${rx} ${rx} 0 0 1 ${-2 * rx} 0`;
    for (let i = 0; i < ny; i++) d += ` a ${ry} ${ry} 0 0 1 0 ${-2 * ry}`;
    return `${d} Z`;
}
const CARTOUCHE_SCALLOP = scallopPath(272, 352, 16);

/** The central ornate framed cartouche that holds the couple names. */
function Cartouche({ theme }: { theme: Theme }) {
    return (
        <svg
            viewBox="0 0 320 400"
            width="100%"
            height="100%"
            role="img"
            aria-label="Bingkai cartouche Peranakan"
            style={{ display: 'block', overflow: 'visible' }}
        >
            <path
                d={CARTOUCHE_SCALLOP}
                transform="translate(24 24)"
                fill={theme.tealDeep}
                fillOpacity={0.62}
                stroke={theme.gold}
                strokeWidth={2.5}
                strokeLinejoin="round"
            />
            <rect x={44} y={44} width={232} height={312} rx={16} fill="none" stroke={theme.gold} strokeWidth={1} opacity={0.7} />
            <rect x={50} y={50} width={220} height={300} rx={12} fill="none" stroke={theme.coral} strokeWidth={1} opacity={0.55} />
            <g transform="translate(160 20)">
                <MiniPeony petal={theme.coral} center={theme.gold} base={theme.tealDeep} />
            </g>
            <g transform="translate(160 380)">
                <MiniPeony petal={theme.coral} center={theme.gold} base={theme.tealDeep} />
            </g>
            {([
                [62, 62],
                [258, 62],
                [258, 338],
                [62, 338],
            ] as const).map(([x, y], i) => (
                <g key={i} transform={`translate(${x} ${y}) scale(0.7)`}>
                    <MiniPeony petal={theme.gold} center={theme.coral} base={theme.tealDeep} />
                </g>
            ))}
        </svg>
    );
}

/** A corner tile flourish for the cover + gallery placeholders. */
function TileCorner({ theme }: { theme: Theme }) {
    return (
        <svg width={120} height={120} viewBox="0 0 120 120" aria-hidden="true">
            <path d="M8 46 L8 8 L46 8" fill="none" stroke={theme.gold} strokeWidth={2.4} strokeLinecap="round" />
            <path d="M18 34 L18 18 L34 18" fill="none" stroke={theme.coral} strokeWidth={1.6} strokeLinecap="round" />
            <g transform="translate(26 26)">
                {[0, 60, 120, 180, 240, 300].map((a) => (
                    <g key={a} transform={`rotate(${a})`}>
                        <ellipse cx={0} cy={-9} rx={4.2} ry={7.5} fill={a % 120 === 0 ? theme.coral : theme.gold} />
                    </g>
                ))}
                <circle r={4} fill={theme.gold} />
                <circle r={1.6} fill={theme.tealDeep} />
            </g>
            {([
                [54, 20],
                [70, 20],
                [20, 54],
                [20, 70],
            ] as const).map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r={2.4} fill={theme.gold} opacity={0.8} />
            ))}
        </svg>
    );
}

/** A footer medallion — a peony inside a beaded scalloped ring. */
function Medallion({ theme }: { theme: Theme }) {
    return (
        <svg width={150} height={150} viewBox="0 0 160 160" aria-hidden="true">
            <circle cx={80} cy={80} r={58} fill="none" stroke={theme.gold} strokeWidth={2} />
            <circle cx={80} cy={80} r={50} fill={theme.tealDeep} fillOpacity={0.5} stroke={theme.coral} strokeWidth={1} />
            {Array.from({ length: 16 }, (_, i) => i).map((i) => {
                const a = (i / 16) * Math.PI * 2;
                return (
                    <circle
                        key={i}
                        cx={80 + Math.cos(a) * 58}
                        cy={80 + Math.sin(a) * 58}
                        r={2.6}
                        fill={i % 2 ? theme.coral : theme.gold}
                    />
                );
            })}
            <g transform="translate(80 80) scale(1.4)">
                <MiniPeony petal={theme.coral} center={theme.gold} base={theme.tealDeep} />
            </g>
        </svg>
    );
}

/** Divider: gold lines flanking a short repeating tile-motif strip. */
function TileDivider({ theme }: { theme: Theme }) {
    return (
        <svg
            width={236}
            height={28}
            viewBox="0 0 236 28"
            aria-hidden="true"
            style={{ display: 'block', margin: '18px auto 0' }}
        >
            <line x1={16} y1={14} x2={92} y2={14} stroke={theme.accent} strokeWidth={1.4} />
            <line x1={144} y1={14} x2={220} y2={14} stroke={theme.accent} strokeWidth={1.4} />
            <circle cx={16} cy={14} r={2.5} fill={theme.accent} />
            <circle cx={220} cy={14} r={2.5} fill={theme.accent} />
            {[104, 118, 132].map((x, i) => (
                <g key={x} transform={`translate(${x} 14) rotate(45)`}>
                    <rect
                        x={-6}
                        y={-6}
                        width={12}
                        height={12}
                        rx={2}
                        fill={i === 1 ? theme.coral : 'none'}
                        stroke={theme.gold}
                        strokeWidth={1.3}
                    />
                    <circle r={1.8} fill={theme.gold} />
                </g>
            ))}
        </svg>
    );
}

/** Static tiled-pattern field for the cover background. */
function TileField({ theme, patternId }: { theme: Theme; patternId: string }) {
    const c = tileColors(theme);
    return (
        <svg
            aria-hidden="true"
            width="100%"
            height="100%"
            style={{ position: 'absolute', inset: 0, zIndex: 0 }}
        >
            <defs>
                <pattern id={patternId} width={94} height={94} patternUnits="userSpaceOnUse">
                    <g transform="scale(0.94)">
                        <TileMotif {...c} />
                    </g>
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill={theme.teal} />
            <rect width="100%" height="100%" fill={`url(#${patternId})`} opacity={0.55} />
        </svg>
    );
}

/**
 * Signature twinkle — a handful of tiles gently pulse their opacity on a
 * staggered cadence. GPU-cheap: opacity keyframes only. Capped at 6 tiles.
 */
function TwinkleTiles({ theme }: { theme: Theme }) {
    const c = tileColors(theme);
    const tiles = useMemo(
        () => [
            { left: 6, top: 10, size: 52, delay: 0, dur: 4.6 },
            { left: 80, top: 14, size: 44, delay: 1.1, dur: 5.3 },
            { left: 12, top: 70, size: 48, delay: 0.6, dur: 4.9 },
            { left: 78, top: 66, size: 56, delay: 1.7, dur: 5.7 },
            { left: 44, top: 8, size: 38, delay: 2.1, dur: 4.2 },
            { left: 46, top: 82, size: 40, delay: 0.9, dur: 5.0 },
        ],
        [],
    );
    return (
        <div
            aria-hidden="true"
            style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 1 }}
        >
            {tiles.map((t, i) => (
                <span
                    key={i}
                    style={{
                        position: 'absolute',
                        left: `${t.left}%`,
                        top: `${t.top}%`,
                        width: t.size,
                        height: t.size,
                        animation: `pk-twinkle ${t.dur}s ease-in-out ${t.delay}s infinite alternate`,
                        willChange: 'opacity',
                    }}
                >
                    <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ display: 'block' }}>
                        <TileMotif {...c} />
                    </svg>
                </span>
            ))}
        </div>
    );
}

/** ≤10 tiny gold dots that drift on a gentle transform loop. */
function GoldDots({ theme }: { theme: Theme }) {
    const dots = useMemo(
        () =>
            Array.from({ length: 6 }, (_, i) => ({
                key: i,
                left: (i * 15 + 8) % 92,
                top: (i * 23 + 12) % 82,
                delay: (i % 3) * 1.3,
                dur: 6 + (i % 3) * 2,
                size: 5 + (i % 3) * 3,
            })),
        [],
    );
    return (
        <div
            aria-hidden="true"
            style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 1 }}
        >
            {dots.map((d) => (
                <span
                    key={d.key}
                    style={{
                        position: 'absolute',
                        left: `${d.left}%`,
                        top: `${d.top}%`,
                        width: d.size,
                        height: d.size,
                        borderRadius: '50%',
                        background: theme.gold,
                        boxShadow: `0 0 6px ${theme.gold}`,
                        animation: `pk-drift ${d.dur}s ease-in-out ${d.delay}s infinite alternate`,
                        willChange: 'transform',
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
            <TileDivider theme={theme} />
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

/** Countdown value in a tile-framed panel (gold corner studs). */
function CountdownBox({ theme, value, label }: { theme: Theme; value: number; label: string }) {
    return (
        <div
            style={{
                position: 'relative',
                minWidth: 72,
                padding: '18px 12px',
                borderRadius: 12,
                background: theme.card,
                border: `1.5px solid ${theme.line}`,
                boxShadow: SHADOW,
                textAlign: 'center',
            }}
        >
            {([
                { top: 5, left: 5 },
                { top: 5, right: 5 },
                { bottom: 5, left: 5 },
                { bottom: 5, right: 5 },
            ] as const).map((pos, i) => (
                <span
                    key={i}
                    aria-hidden="true"
                    style={{
                        position: 'absolute',
                        width: 6,
                        height: 6,
                        transform: 'rotate(45deg)',
                        background: theme.gold,
                        ...pos,
                    }}
                />
            ))}
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

export default function PeranakanTemplate({ data, preview, slots }: TemplateProps) {
    const tr = useCardText();
    const reduce = useReducedMotion() ?? false;
    const rawId = useId();
    const patternId = `pk-tile-${rawId.replace(/:/g, '')}`;

    const p = data.palette;
    const theme: Theme = {
        primary: p?.primary ?? '#f6b352',
        secondary: p?.secondary ?? '#e8734f',
        accent: p?.accent ?? '#f2c94c',
        bg: p?.bg ?? '#0d5b58',
        text: p?.text ?? '#fdf3e3',
        teal: '#0d5b58',
        tealDeep: '#083f3d',
        tealLight: '#12726d',
        coral: '#e8734f',
        coralDeep: '#c85535',
        gold: '#f2c94c',
        goldDeep: '#d9a72f',
        cream: '#fdf3e3',
        card: '#0a4b48',
        line: 'rgba(242,201,76,0.38)',
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
        backgroundImage: `radial-gradient(120% 60% at 50% 0%, ${theme.tealLight}55, rgba(0,0,0,0) 55%)`,
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

    const cardStyle: CSSProperties = {
        background: theme.card,
        border: `1px solid ${theme.line}`,
        borderRadius: 18,
        padding: '34px 24px',
        textAlign: 'center',
        boxShadow: SHADOW,
    };

    const coverTextShadow = '0 2px 12px rgba(0,0,0,0.5)';
    const altBg = 'rgba(0,0,0,0.16)';

    return (
        <div style={rootStyle}>
            <style>{`
                @keyframes pk-twinkle {
                    0%   { opacity: 0.25; }
                    100% { opacity: 0.72; }
                }
                @keyframes pk-drift {
                    0%   { transform: translate3d(0, 0, 0); }
                    100% { transform: translate3d(7px, -9px, 0); }
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
                <TileField theme={theme} patternId={patternId} />
                {!preview && !reduce && <TwinkleTiles theme={theme} />}
                {!preview && !reduce && <GoldDots theme={theme} />}

                <div style={{ position: 'absolute', top: 0, left: 0, zIndex: 2, opacity: 0.92 }}>
                    <TileCorner theme={theme} />
                </div>
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        zIndex: 2,
                        opacity: 0.92,
                        transform: 'scaleX(-1)',
                    }}
                >
                    <TileCorner theme={theme} />
                </div>

                <div style={{ position: 'relative', zIndex: 3, width: '100%', maxWidth: 560, textShadow: coverTextShadow }}>
                    {data.bismillah && (
                        <motion.div
                            initial={preview ? false : { opacity: 0, y: -12 }}
                            animate={preview ? undefined : { opacity: 1, y: 0 }}
                            transition={{ duration: 1.2, delay: 0.2, ease: 'easeOut' }}
                            style={{ direction: bismillahCustom ? undefined : 'rtl', marginBottom: 28 }}
                        >
                            <div
                                style={{
                                    fontFamily: bismillahCustom ? SERIF : ARABIC,
                                    fontSize: 'clamp(24px, 6vw, 38px)',
                                    color: theme.gold,
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
                            width: 'min(82vw, 360px)',
                            aspectRatio: '320 / 400',
                            margin: '0 auto',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <motion.div
                            initial={preview ? false : { opacity: 0, scale: 0.7 }}
                            animate={preview ? undefined : { opacity: 1, scale: 1 }}
                            transition={{ duration: 1.5, ease: 'easeOut' }}
                            style={{ position: 'absolute', inset: 0 }}
                        >
                            <Cartouche theme={theme} />
                        </motion.div>

                        <motion.div
                            initial={preview ? false : { opacity: 0, scale: 0.92 }}
                            animate={preview ? undefined : { opacity: 1, scale: 1 }}
                            transition={{ duration: 1, delay: 0.7, ease: 'easeOut' }}
                            style={{ position: 'relative', zIndex: 2, maxWidth: '64%' }}
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
                        style={{ marginTop: 28 }}
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
                                    color: theme.text,
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
                        color: theme.gold,
                        textShadow: coverTextShadow,
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
                        animate={!preview && !reduce ? { y: [0, 9, 0] } : undefined}
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
                            <TileDivider theme={theme} />
                        </div>
                    </Reveal>
                </Section>
            )}

            {/* ---------------------------------------------------------- */}
            {/* 3. COUPLE                                                   */}
            {/* ---------------------------------------------------------- */}
            <Section background={altBg}>
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
                                <line x1="0" y1="10" x2="38" y2="10" stroke={theme.accent} strokeWidth={1.2} />
                                <g transform="translate(48 10) rotate(45)">
                                    <rect x={-5} y={-5} width={10} height={10} rx={2} fill={theme.coral} stroke={theme.gold} strokeWidth={1} />
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
                                <g transform="translate(8 10) rotate(45)">
                                    <rect x={-5} y={-5} width={10} height={10} rx={2} fill={theme.coral} stroke={theme.gold} strokeWidth={1} />
                                </g>
                                <line x1="18" y1="10" x2="56" y2="10" stroke={theme.accent} strokeWidth={1.2} />
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
                <Section background={altBg}>
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
                                            color: theme.tealDeep,
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
                                            color: theme.gold,
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
                <Section background={altBg}>
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
                        <div style={cardStyle}>
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
                <Section background={altBg}>
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
                                        boxShadow: SHADOW,
                                    }}
                                >
                                    <span
                                        style={{
                                            flex: '0 0 auto',
                                            width: 44,
                                            height: 44,
                                            borderRadius: '50%',
                                            background: theme.accent,
                                            color: theme.tealDeep,
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
                                boxShadow: SHADOW,
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                                <span
                                    style={{
                                        width: 54,
                                        height: 54,
                                        borderRadius: '50%',
                                        background: 'rgba(242,201,76,0.16)',
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
                                            background: copied ? theme.coral : theme.accent,
                                            color: copied ? theme.cream : theme.tealDeep,
                                            borderColor: copied ? theme.coral : theme.accent,
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
            <PkSec name="gallery"><Section background={altBg}>
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
                                          boxShadow: SHADOW,
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
                                          background: 'rgba(242,201,76,0.06)',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          gap: 10,
                                          color: theme.accent,
                                      }}
                                  >
                                      <TileCorner theme={theme} />
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
                        <Medallion theme={theme} />
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
                        <Heart size={20} color={theme.coralDeep} fill={theme.coral} />
                    </div>
                    <TileDivider theme={theme} />
                </Reveal>
            </footer>
        </div>
    );
}
