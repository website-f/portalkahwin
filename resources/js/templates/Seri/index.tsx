// ============================================================
// Seri / Nikah Seri — Malaysian wedding e-invitation
// Islamic Teal: deep teal / emerald-blue + gold. Original inline
// SVG Islamic geometry: {8/3} girih octagram stars, octagon–square
// tessellation, self-drawing mihrab (pointed-arch) frame with
// rosette medallions. Signature cover: teal curtains part →
// gold geometry draws itself in → card zooms to reveal Bismillah.
// Single self-contained file — visually distinct from Khat.
// ============================================================

import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
    type ReactNode,
} from 'react';
import { PkSec } from '../PkSec';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import {
    Calendar,
    Check,
    ChevronDown,
    Clock,
    Copy,
    Gift,
    Heart,
    MapPin,
    Navigation,
    Phone,
} from 'lucide-react';
import type { TemplateProps } from '../types';
import { useCardText } from '../cardText';

// ---------- fonts (system stacks only, no network) ----------
const SERIF = "'Cormorant Garamond', 'EB Garamond', 'Playfair Display', Georgia, 'Times New Roman', serif";
const NAMES = "var(--pk-name, 'Cormorant Garamond'), 'EB Garamond', 'Playfair Display', Georgia, 'Times New Roman', serif";
const ARABIC =
    "'Traditional Arabic', 'Amiri', 'Scheherazade New', 'Noto Naskh Arabic', 'Segoe UI', serif";

// ---------- color helpers ----------
function normHex(hex: string): string {
    let h = hex.replace('#', '').trim();
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    return h.length === 6 ? h : '000000';
}
function withAlpha(hex: string, a: number): string {
    const h = normHex(hex);
    const n = parseInt(h, 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
}
function shade(hex: string, amt: number): string {
    const h = normHex(hex);
    const n = parseInt(h, 16);
    const clamp = (v: number) => Math.min(255, Math.max(0, Math.round(v)));
    const r = clamp(((n >> 16) & 255) + amt);
    const g = clamp(((n >> 8) & 255) + amt);
    const b = clamp((n & 255) + amt);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

// ---------- theme ----------
function buildTheme(palette?: {
    primary: string;
    secondary: string;
    accent: string;
    bg: string;
    text: string;
}) {
    // Honor data.palette; fall back to Seri teal/gold defaults.
    const primary = palette?.primary ?? '#0a3b40'; // deep teal ink
    const secondary = palette?.secondary ?? '#5fb0a9'; // aqua support
    const gold = palette?.accent ?? '#e6c063';
    const bg = palette?.bg ?? '#04191c'; // near-black teal ground
    const text = palette?.text ?? '#eaf5f0';
    return {
        primary,
        secondary,
        gold,
        bg,
        text,
        goldLight: shade(gold, 55),
        goldDeep: shade(gold, -60),
        teal: shade(primary, 18),
        bgSoft: shade(bg, 20),
        bgDeep: shade(bg, -8),
    };
}
type Theme = ReturnType<typeof buildTheme>;

// ---------- motion variants ----------
const containerV: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.13, delayChildren: 0.05 } },
};
const itemV: Variants = {
    hidden: { opacity: 0, y: 26 },
    show: { opacity: 1, y: 0, transition: { duration: 0.72, ease: 'easeOut' } },
};
// Cover: content zooms in after the frame begins drawing.
const ZOOM_DELAY = 1.9;
const coverWrapV: Variants = {
    hidden: { opacity: 0, scale: 0.82 },
    show: {
        opacity: 1,
        scale: 1,
        transition: {
            duration: 0.85,
            delay: ZOOM_DELAY,
            ease: [0.16, 1, 0.3, 1],
            when: 'beforeChildren',
            staggerChildren: 0.12,
            delayChildren: ZOOM_DELAY + 0.15,
        },
    },
};
// Self-drawing stroke (frame + medallions), staggered after curtains part.
const FRAME_DELAY = 1.25;
const drawV: Variants = {
    hidden: { pathLength: 0, opacity: 0 },
    show: (i: number = 0) => ({
        pathLength: 1,
        opacity: 1,
        transition: {
            pathLength: { duration: 1.5, ease: 'easeInOut', delay: FRAME_DELAY + i * 0.12 },
            opacity: { duration: 0.3, delay: FRAME_DELAY + i * 0.12 },
        },
    }),
};

// ---------- countdown ----------
type TimeLeft = { d: number; h: number; m: number; s: number } | null;
function calcLeft(target?: string): TimeLeft {
    if (!target) return null;
    const t = new Date(target).getTime();
    if (Number.isNaN(t)) return null;
    const diff = t - Date.now();
    if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0 };
    return {
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
    };
}
function useCountdown(target: string | undefined, active: boolean): TimeLeft {
    const [left, setLeft] = useState<TimeLeft>(() => calcLeft(target));
    useEffect(() => {
        if (!active || !target) return;
        setLeft(calcLeft(target));
        const id = window.setInterval(() => setLeft(calcLeft(target)), 1000);
        return () => window.clearInterval(id);
    }, [target, active]);
    return left;
}

// ============================================================
//  Inline SVG geometry (all original)
// ============================================================

// {8/3} girih octagram — a single self-intersecting star polygon,
// visually sharper / interlaced (distinct from Khat's two squares).
const STAR83 =
    'M12 2 L19.07 19.07 L2 12 L19.07 4.93 L12 22 L4.93 4.93 L22 12 L4.93 19.07 Z';
// Regular octagon outline (for rosette rings).
const OCTAGON =
    'M12 2 L19.07 4.93 L22 12 L19.07 19.07 L12 22 L4.93 19.07 L2 12 L4.93 4.93 Z';

function SeriStar({
    size = 24,
    stroke,
    fill = 'none',
    sw = 1.4,
    style,
    className,
}: {
    size?: number;
    stroke: string;
    fill?: string;
    sw?: number;
    style?: CSSProperties;
    className?: string;
}) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
            style={style}
            className={className}
        >
            <path
                d={STAR83}
                stroke={stroke}
                strokeWidth={sw}
                fill={fill}
                fillRule="evenodd"
                strokeLinejoin="round"
            />
        </svg>
    );
}

// Rosette medallion: octagon ring + inner octagram + center pip.
function Rosette({
    size = 30,
    stroke,
    style,
    className,
}: {
    size?: number;
    stroke: string;
    style?: CSSProperties;
    className?: string;
}) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
            style={style}
            className={className}
        >
            <path d={OCTAGON} stroke={withAlpha(stroke, 0.55)} strokeWidth={1} strokeLinejoin="round" />
            <path
                d={STAR83}
                stroke={stroke}
                strokeWidth={1.2}
                fill="none"
                fillRule="evenodd"
                strokeLinejoin="round"
            />
            <circle cx={12} cy={12} r={1.5} fill={stroke} />
        </svg>
    );
}

// Divider: tapering gold rules flanking twin rosettes + a center star.
function Divider({ gold }: { gold: string }) {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 9,
                margin: '10px 0',
            }}
        >
            <span
                style={{
                    height: 1,
                    width: 'clamp(30px, 12vw, 66px)',
                    background: `linear-gradient(90deg, transparent, ${gold})`,
                }}
            />
            <Rosette size={16} stroke={withAlpha(gold, 0.8)} />
            <SeriStar size={22} stroke={gold} />
            <Rosette size={16} stroke={withAlpha(gold, 0.8)} />
            <span
                style={{
                    height: 1,
                    width: 'clamp(30px, 12vw, 66px)',
                    background: `linear-gradient(270deg, transparent, ${gold})`,
                }}
            />
        </div>
    );
}

// Full-bleed octagon–square tessellation (the 4.8.8 tiling).
function TessBg({ gold, teal }: { gold: string; teal: string }) {
    return (
        <svg
            aria-hidden
            width="100%"
            height="100%"
            style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                opacity: 0.08,
                pointerEvents: 'none',
                zIndex: 0,
            }}
        >
            <defs>
                <pattern id="seriTess" width="60" height="60" patternUnits="userSpaceOnUse">
                    {/* octagon (corner-cut square) */}
                    <path
                        d="M21 8 L39 8 L52 21 L52 39 L39 52 L21 52 L8 39 L8 21 Z"
                        fill="none"
                        stroke={gold}
                        strokeWidth="1"
                    />
                    {/* diamond in the shared corner gap (tiles into full squares) */}
                    <path d="M0 -9 L9 0 L0 9 L-9 0 Z" fill="none" stroke={teal} strokeWidth="1" />
                    <path d="M60 -9 L69 0 L60 9 L51 0 Z" fill="none" stroke={teal} strokeWidth="1" />
                    <circle cx="30" cy="30" r="1.6" fill={gold} />
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#seriTess)" />
        </svg>
    );
}

// A stroke path that either draws itself (pathLength) or renders full.
function DrawPath({
    d,
    stroke,
    sw = 1.4,
    fill = 'none',
    animate,
    index = 0,
    opacity = 1,
}: {
    d: string;
    stroke: string;
    sw?: number;
    fill?: string;
    animate: boolean;
    index?: number;
    opacity?: number;
}) {
    if (!animate)
        return (
            <path
                d={d}
                stroke={stroke}
                strokeWidth={sw}
                fill={fill}
                fillRule="evenodd"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                style={{ opacity }}
            />
        );
    return (
        <motion.path
            d={d}
            stroke={stroke}
            strokeWidth={sw}
            fill={fill}
            fillRule="evenodd"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            variants={drawV}
            custom={index}
            initial="hidden"
            animate="show"
            style={{ opacity: fill === 'none' ? undefined : opacity }}
        />
    );
}
function DrawDot({
    cx,
    cy,
    r,
    fill,
    animate,
    index = 0,
}: {
    cx: number;
    cy: number;
    r: number;
    fill: string;
    animate: boolean;
    index?: number;
}) {
    if (!animate) return <circle cx={cx} cy={cy} r={r} fill={fill} />;
    return (
        <motion.circle
            cx={cx}
            cy={cy}
            r={r}
            fill={fill}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: FRAME_DELAY + index * 0.12, duration: 0.45 }}
        />
    );
}

// ---------- reveal wrappers ----------
function Section({
    reduce,
    children,
    style,
}: {
    reduce: boolean;
    children: ReactNode;
    style?: CSSProperties;
}) {
    if (reduce) return <section style={style}>{children}</section>;
    return (
        <motion.section
            style={style}
            variants={containerV}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
        >
            {children}
        </motion.section>
    );
}
function Fade({
    reduce,
    children,
    style,
    className,
    variants = itemV,
}: {
    reduce: boolean;
    children: ReactNode;
    style?: CSSProperties;
    className?: string;
    variants?: Variants;
}) {
    if (reduce)
        return (
            <div className={className} style={style}>
                {children}
            </div>
        );
    return (
        <motion.div className={className} style={style} variants={variants}>
            {children}
        </motion.div>
    );
}

function SectionTitle({
    t,
    title,
    kicker,
    shimmerClass,
}: {
    t: Theme;
    title: string;
    kicker?: string;
    shimmerClass: string;
}) {
    return (
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
            {kicker && (
                <div
                    style={{
                        fontFamily: SERIF,
                        letterSpacing: '0.34em',
                        textTransform: 'uppercase',
                        fontSize: 12,
                        color: t.secondary,
                        marginBottom: 6,
                    }}
                >
                    {kicker}
                </div>
            )}
            <h2
                className={shimmerClass}
                style={{
                    fontFamily: SERIF,
                    fontSize: 'clamp(26px, 7.5vw, 40px)',
                    fontWeight: 600,
                    margin: 0,
                    letterSpacing: '0.02em',
                }}
            >
                {title}
            </h2>
            <Divider gold={t.gold} />
        </div>
    );
}

// Signature particle layer — a slow, faint upward drift of gold geometric
// motes/sparkles. GPU-cheap: transform + opacity keyframes only, ≤16 nodes,
// pointer-events none, behind the cover content, gated off when motion is off.
function GoldMotes({ t }: { t: Theme }) {
    const motes = useMemo(
        () =>
            Array.from({ length: 14 }, (_, i) => ({
                key: i,
                left: (i * 7.3 + 3) % 100,
                delay: (i % 7) * 1.7,
                dur: 13 + (i % 5) * 2.6,
                size: 8 + (i % 3) * 5,
            })),
        [],
    );
    return (
        <div
            aria-hidden
            style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 2 }}
        >
            {motes.map((m) => (
                <div
                    key={m.key}
                    className="seri-mote"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: `${m.left}%`,
                        willChange: 'transform',
                        animation: `seriRise ${m.dur}s linear ${m.delay}s infinite`,
                    }}
                >
                    <SeriStar size={m.size} stroke={withAlpha(t.gold, 0.7)} sw={1.2} />
                </div>
            ))}
        </div>
    );
}

// ============================================================
//  Main template
// ============================================================
export default function SeriTemplate({ data, preview, slots }: TemplateProps) {
    const tr = useCardText();
    const prefersReduce = useReducedMotion();
    const reduce = !!preview || !!prefersReduce;
    const animate = !reduce; // full signature intro only when motion is allowed

    const t = useMemo(() => buildTheme(data.palette), [data.palette]);
    const countdown = useCountdown(data.receptionAt, !preview);

    const [copied, setCopied] = useState(false);
    const copyTimer = useRef<number | undefined>(undefined);
    useEffect(() => () => window.clearTimeout(copyTimer.current), []);

    const markCopied = () => {
        setCopied(true);
        window.clearTimeout(copyTimer.current);
        copyTimer.current = window.setTimeout(() => setCopied(false), 2000);
    };
    const copyAccount = (raw: string) => {
        const value = raw.trim();
        const fallback = () => {
            try {
                const ta = document.createElement('textarea');
                ta.value = value;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
            } catch {
                /* clipboard unavailable — ignore */
            }
            markCopied();
        };
        try {
            if (navigator.clipboard?.writeText) {
                navigator.clipboard.writeText(value).then(markCopied).catch(fallback);
            } else {
                fallback();
            }
        } catch {
            fallback();
        }
    };

    const shimmerClass = reduce ? 'seri-gold-text' : 'seri-gold-text seri-shimmer';

    // ---------- shared style objects ----------
    const wrapInner: CSSProperties = {
        maxWidth: 680,
        margin: '0 auto',
        padding: '0 24px',
        position: 'relative',
        zIndex: 1,
    };
    const sectionPad: CSSProperties = {
        padding: 'clamp(52px, 12vw, 96px) 0',
        position: 'relative',
    };
    const panel: CSSProperties = {
        background: `linear-gradient(160deg, ${withAlpha(t.teal, 0.5)}, ${withAlpha(t.bg, 0.35)})`,
        border: `1px solid ${withAlpha(t.gold, 0.28)}`,
        borderRadius: 16,
        padding: '22px 20px',
        boxShadow: `inset 0 1px 0 ${withAlpha(t.gold, 0.12)}`,
    };
    const goldBtn: CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 9,
        padding: '13px 22px',
        borderRadius: 999,
        border: `1px solid ${withAlpha(t.gold, 0.55)}`,
        background: `linear-gradient(135deg, ${withAlpha(t.gold, 0.2)}, ${withAlpha(t.gold, 0.04)})`,
        color: t.gold,
        fontFamily: SERIF,
        fontWeight: 600,
        fontSize: 16,
        letterSpacing: '0.02em',
        textDecoration: 'none',
        cursor: 'pointer',
    };
    const bodyText: CSSProperties = {
        fontFamily: SERIF,
        fontSize: 'clamp(17px, 4.4vw, 20px)',
        lineHeight: 1.75,
        color: t.text,
    };

    const css = `
    .seri-gold-text {
      background-image: linear-gradient(100deg, ${t.goldDeep} 0%, ${t.gold} 28%, ${t.goldLight} 44%, #fff6d8 50%, ${t.goldLight} 56%, ${t.gold} 72%, ${t.goldDeep} 100%);
      background-size: 230% auto;
      -webkit-background-clip: text; background-clip: text;
      -webkit-text-fill-color: transparent; color: transparent;
    }
    .seri-shimmer { animation: seriShimmer 7s linear infinite; }
    @keyframes seriShimmer { 0% { background-position: 0% center; } 100% { background-position: 230% center; } }
    .seri-btn { transition: transform .2s ease, box-shadow .2s ease, background .25s ease; }
    .seri-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 26px rgba(0,0,0,.32); background: linear-gradient(135deg, ${withAlpha(t.gold, 0.3)}, ${withAlpha(t.gold, 0.08)}); }
    .seri-twinkle { animation: seriTwinkle 3.6s ease-in-out infinite; }
    @keyframes seriTwinkle { 0%,100% { opacity:.25 } 50% { opacity:.75 } }
    @keyframes seriRise {
      0%   { transform: translate3d(0, 100vh, 0) rotate(0deg); opacity: 0; }
      14%  { opacity: .55; }
      86%  { opacity: .55; }
      100% { transform: translate3d(0, -18vh, 0) rotate(140deg); opacity: 0; }
    }
    @media (prefers-reduced-motion: reduce) { .seri-shimmer, .seri-twinkle, .seri-mote { animation: none; } }
  `;

    const hasGallery = !!data.galleryImages && data.galleryImages.length > 0;
    const groomShort = data.groomShort ?? data.groomName;
    const brideShort = data.brideShort ?? data.brideName;

    // Bottom-corner + apex rosette medallions on the mihrab arch.
    const medallions: Array<{ x: number; y: number; s: number; i: number }> = [
        { x: 40, y: 150, s: 1.7, i: 1.6 },
        { x: 260, y: 150, s: 1.7, i: 2.0 },
        { x: 150, y: 46, s: 1.15, i: 2.4 },
    ];

    return (
        <div
            style={{
                position: 'relative',
                background: `radial-gradient(135% 82% at 50% -6%, ${t.bgSoft} 0%, ${t.bg} 48%, ${t.bgDeep} 100%)`,
                color: t.text,
                fontFamily: SERIF,
                overflow: 'hidden',
                width: '100%',
            }}
        >
            <style>{css}</style>
            <TessBg gold={t.gold} teal={t.secondary} />

            {/* ============ 1. COVER (curtain → geometry draw → zoom) ============ */}
            <div
                style={{
                    position: 'relative',
                    minHeight: preview ? 540 : '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    padding: 'clamp(40px, 9vw, 72px) 22px',
                    // Room for the scroll cue at bottom:26 — see Floral for the rationale.
                    paddingBottom: 'var(--pk-cue-clear, 96px)',
                    overflow: 'hidden',
                    zIndex: 1,
                }}
            >
                {/* optional user cover image, very faint behind the arch */}
                {data.coverImage && (
                    <div
                        aria-hidden
                        style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundImage: `url(${data.coverImage})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            opacity: 0.16,
                            filter: 'saturate(0.75)',
                        }}
                    />
                )}

                {/* Signature: faint gold geometric motes rising behind the arch */}
                {animate && <GoldMotes t={t} />}

                {/* Self-drawing gold mihrab (pointed-arch) frame + rosettes.
                    Lives in its own centred, responsively-sized box so the arch
                    reads as a symmetric doorway framing the content — never a
                    single line down the middle. Centred via left/top 50% +
                    translate(-50%,-50%); the symmetric viewBox (arch is mirrored
                    about x=150) plus xMidYMid meet keep both legs and the curved
                    apex balanced at every width, behind the cover content. */}
                <div
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: 'min(92vw, 460px)',
                        aspectRatio: '300 / 460',
                        maxHeight: '92%',
                        pointerEvents: 'none',
                        zIndex: 1,
                    }}
                >
                    <svg
                        width="100%"
                        height="100%"
                        viewBox="0 0 300 460"
                        preserveAspectRatio="xMidYMid meet"
                        fill="none"
                        aria-hidden
                        style={{ position: 'absolute', inset: 0, display: 'block' }}
                    >
                        {/* outer arch */}
                        <DrawPath
                            d="M40 445 L40 150 Q40 55 150 26 Q260 55 260 150 L260 445 Z"
                            stroke={t.gold}
                            sw={1.6}
                            animate={animate}
                            index={0}
                        />
                        {/* inner arch (hairline) */}
                        <DrawPath
                            d="M52 445 L52 150 Q52 68 150 42 Q248 68 248 150 L248 445 Z"
                            stroke={withAlpha(t.gold, 0.55)}
                            sw={0.8}
                            animate={animate}
                            index={0.7}
                        />
                        {/* rosette medallions */}
                        {medallions.map((m) => (
                            <g key={`${m.x}-${m.y}`} transform={`translate(${m.x} ${m.y}) scale(${m.s})`}>
                                <DrawPath
                                    d="M0 -10 L7.07 -7.07 L10 0 L7.07 7.07 L0 10 L-7.07 7.07 L-10 0 L-7.07 -7.07 Z"
                                    stroke={withAlpha(t.gold, 0.7)}
                                    sw={1.1}
                                    animate={animate}
                                    index={m.i}
                                />
                                <DrawPath
                                    d="M0 -10 L7.07 7.07 L-10 0 L7.07 -7.07 L0 10 L-7.07 -7.07 L10 0 L-7.07 7.07 Z"
                                    stroke={t.gold}
                                    sw={1.2}
                                    animate={animate}
                                    index={m.i + 0.3}
                                />
                                <DrawDot cx={0} cy={0} r={1.7} fill={t.gold} animate={animate} index={m.i + 0.6} />
                            </g>
                        ))}
                    </svg>
                </div>

                {/* Cover content (zooms in) */}
                {animate ? (
                    <motion.div
                        style={{ position: 'relative', zIndex: 3, width: '100%', maxWidth: 440 }}
                        variants={coverWrapV}
                        initial="hidden"
                        animate="show"
                    >
                        <CoverContent
                            t={t}
                            data={data}
                            reduce={reduce}
                            shimmerClass={shimmerClass}
                            groomShort={groomShort}
                            brideShort={brideShort}
                        />
                    </motion.div>
                ) : (
                    <div style={{ position: 'relative', zIndex: 3, width: '100%', maxWidth: 440 }}>
                        <CoverContent
                            t={t}
                            data={data}
                            reduce={reduce}
                            shimmerClass={shimmerClass}
                            groomShort={groomShort}
                            brideShort={brideShort}
                        />
                    </div>
                )}

                {/* Scroll cue */}
                {!preview &&
                    (reduce ? (
                        <div style={{ position: 'absolute', bottom: 26, color: t.gold, zIndex: 3 }}>
                            <ChevronDown size={26} />
                        </div>
                    ) : (
                        <motion.div
                            style={{ position: 'absolute', bottom: 26, color: t.gold, zIndex: 3, willChange: 'transform' }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1, y: [0, 9, 0] }}
                            transition={{
                                opacity: { delay: ZOOM_DELAY + 0.9, duration: 0.6 },
                                y: { duration: 1.7, repeat: Infinity, ease: 'easeInOut', delay: ZOOM_DELAY + 0.9 },
                            }}
                        >
                            <ChevronDown size={26} />
                        </motion.div>
                    ))}

                {/* Two teal curtains that part — the signature open. */}
                {animate && (
                    <div
                        aria-hidden
                        style={{ position: 'absolute', inset: 0, zIndex: 20, pointerEvents: 'none', overflow: 'hidden' }}
                    >
                        {(['left', 'right'] as const).map((side) => (
                            <motion.div
                                key={side}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    bottom: 0,
                                    left: side === 'left' ? 0 : 'auto',
                                    right: side === 'right' ? 0 : 'auto',
                                    width: '52%',
                                    background: `
                                        repeating-linear-gradient(90deg, rgba(0,0,0,0.28) 0px, rgba(0,0,0,0) 13px, rgba(255,255,255,0.05) 25px, rgba(0,0,0,0.28) 38px),
                                        linear-gradient(180deg, ${shade(t.primary, 22)}, ${t.primary} 55%, ${shade(t.primary, -14)})`,
                                    borderInlineEnd: side === 'left' ? `2px solid ${withAlpha(t.gold, 0.6)}` : undefined,
                                    borderInlineStart: side === 'right' ? `2px solid ${withAlpha(t.gold, 0.6)}` : undefined,
                                    boxShadow: `inset 0 0 60px ${withAlpha('#000000', 0.5)}`,
                                }}
                                initial={{ x: 0 }}
                                animate={{ x: side === 'left' ? '-101%' : '101%' }}
                                transition={{ duration: 1.05, ease: [0.76, 0, 0.24, 1], delay: 0.2 }}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* ============ 2. OPENING ============ */}
            <Section reduce={reduce} style={sectionPad}>
                <div style={{ ...wrapInner, textAlign: 'center' }}>
                    <Fade reduce={reduce}>
                        <SeriStar size={26} stroke={t.gold} style={{ margin: '0 auto 18px' }} />
                    </Fade>
                    {data.openingLine && (
                        <Fade reduce={reduce}>
                            <p style={{ ...bodyText, margin: '0 auto', maxWidth: 560 }}>{data.openingLine}</p>
                        </Fade>
                    )}
                    {/* Short doa accent — Al-Furqan : 74 */}
                    <Fade reduce={reduce}>
                        <div style={{ ...panel, marginTop: 30, textAlign: 'center' }}>
                            <div
                                dir="rtl"
                                style={{
                                    fontFamily: ARABIC,
                                    fontSize: 'clamp(20px, 6vw, 28px)',
                                    lineHeight: 1.95,
                                    color: t.gold,
                                }}
                            >
                                رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ
                            </div>
                            <p
                                style={{
                                    fontFamily: SERIF,
                                    fontStyle: 'italic',
                                    fontSize: 15,
                                    lineHeight: 1.7,
                                    color: t.secondary,
                                    margin: '12px 0 0',
                                }}
                            >
                                “Wahai Tuhan kami, kurniakanlah kepada kami pasangan dan zuriat keturunan
                                yang menjadi penyejuk mata hati.”
                                <br />
                                Surah Al-Furqan : 74
                            </p>
                        </div>
                    </Fade>
                </div>
            </Section>

            {/* ============ 3. COUPLE ============ */}
            <Section reduce={reduce} style={sectionPad}>
                <div style={{ ...wrapInner, textAlign: 'center' }}>
                    <SectionTitle t={t} title={tr("Pasangan Bahagia")} shimmerClass={shimmerClass} />

                    <Fade reduce={reduce}>
                        <h3
                            style={{
                                fontFamily: NAMES,
                                fontSize: 'clamp(30px, 9vw, 46px)',
                                fontWeight: 600,
                                color: t.text,
                                margin: '18px 0 4px',
                            }}
                        >
                            {data.groomName}
                        </h3>
                    </Fade>
                    {data.groomParents && (
                        <Fade reduce={reduce}>
                            <p style={{ fontFamily: SERIF, fontSize: 16, color: t.secondary, margin: 0 }}>
                                {data.groomParents}
                            </p>
                        </Fade>
                    )}

                    <Fade reduce={reduce}>
                        <div style={{ margin: '22px 0' }}>
                            <Divider gold={t.gold} />
                        </div>
                    </Fade>

                    <Fade reduce={reduce}>
                        <h3
                            style={{
                                fontFamily: NAMES,
                                fontSize: 'clamp(30px, 9vw, 46px)',
                                fontWeight: 600,
                                color: t.text,
                                margin: '0 0 4px',
                            }}
                        >
                            {data.brideName}
                        </h3>
                    </Fade>
                    {data.brideParents && (
                        <Fade reduce={reduce}>
                            <p style={{ fontFamily: SERIF, fontSize: 16, color: t.secondary, margin: 0 }}>
                                {data.brideParents}
                            </p>
                        </Fade>
                    )}
                </div>
            </Section>

            {/* Sections below are hidden in the compact preview */}
            {!preview && (
                <>
                    {/* ============ 4. DATE + COUNTDOWN ============ */}
                    <Section reduce={reduce} style={sectionPad}>
                        <div style={{ ...wrapInner, textAlign: 'center' }}>
                            <SectionTitle
                                t={t}
                                kicker="Menghitung Hari"
                                title={tr("Tarikh Majlis")}
                                shimmerClass={shimmerClass}
                            />

                            {data.hijriLabel && (
                                <Fade reduce={reduce}>
                                    <div
                                        style={{
                                            fontFamily: ARABIC,
                                            fontSize: 18,
                                            color: t.gold,
                                            marginBottom: 6,
                                        }}
                                    >
                                        {data.hijriLabel}
                                    </div>
                                </Fade>
                            )}
                            {data.dateLabel && (
                                <Fade reduce={reduce}>
                                    <div
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 10,
                                            fontFamily: SERIF,
                                            fontSize: 'clamp(22px, 6.5vw, 32px)',
                                            fontWeight: 600,
                                            color: t.text,
                                        }}
                                    >
                                        <Calendar size={22} color={t.gold} />
                                        {data.dateLabel}
                                    </div>
                                </Fade>
                            )}
                            {data.timeLabel && (
                                <Fade reduce={reduce}>
                                    <div
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            fontFamily: SERIF,
                                            fontSize: 18,
                                            color: t.secondary,
                                            marginTop: 8,
                                        }}
                                    >
                                        <Clock size={18} color={t.gold} />
                                        {data.timeLabel}
                                    </div>
                                </Fade>
                            )}

                            {countdown && (
                                <Fade reduce={reduce}>
                                    <div
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(4, 1fr)',
                                            gap: 'clamp(8px, 2.5vw, 16px)',
                                            maxWidth: 460,
                                            margin: '30px auto 0',
                                        }}
                                    >
                                        {[
                                            { label: tr("Hari"), value: countdown.d },
                                            { label: tr("Jam"), value: countdown.h },
                                            { label: tr("Minit"), value: countdown.m },
                                            { label: tr("Saat"), value: countdown.s },
                                        ].map((u) => (
                                            <div key={u.label} style={{ ...panel, padding: '16px 6px', position: 'relative' }}>
                                                <SeriStar
                                                    size={13}
                                                    stroke={withAlpha(t.gold, 0.7)}
                                                    style={{
                                                        position: 'absolute',
                                                        top: 6,
                                                        left: '50%',
                                                        transform: 'translateX(-50%)',
                                                    }}
                                                />
                                                <div
                                                    className={shimmerClass}
                                                    style={{
                                                        fontFamily: SERIF,
                                                        fontSize: 'clamp(26px, 8vw, 38px)',
                                                        fontWeight: 700,
                                                        lineHeight: 1.1,
                                                        marginTop: 6,
                                                    }}
                                                >
                                                    {String(u.value).padStart(2, '0')}
                                                </div>
                                                <div
                                                    style={{
                                                        fontFamily: SERIF,
                                                        fontSize: 12,
                                                        letterSpacing: '0.16em',
                                                        textTransform: 'uppercase',
                                                        color: t.secondary,
                                                        marginTop: 4,
                                                    }}
                                                >
                                                    {u.label}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Fade>
                            )}
                        </div>
                    </Section>

                    {/* ============ 5. ATUR CARA ============ */}
                    <PkSec name="program">{data.program && data.program.length > 0 && (
                        <Section reduce={reduce} style={sectionPad}>
                            <div style={wrapInner}>
                                <SectionTitle
                                    t={t}
                                    kicker="Susunan Majlis"
                                    title={tr("Atur Cara")}
                                    shimmerClass={shimmerClass}
                                />
                                <div style={{ maxWidth: 520, margin: '0 auto' }}>
                                    {data.program.map((p, i) => {
                                        const last = i === data.program!.length - 1;
                                        return (
                                            <Fade key={`${p.time}-${i}`} reduce={reduce}>
                                                <div style={{ display: 'flex', gap: 16 }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                        <SeriStar size={26} stroke={t.gold} fill={withAlpha(t.gold, 0.12)} />
                                                        {!last && (
                                                            <span
                                                                style={{
                                                                    flex: 1,
                                                                    width: 1,
                                                                    minHeight: 34,
                                                                    background: `linear-gradient(180deg, ${withAlpha(
                                                                        t.gold,
                                                                        0.55,
                                                                    )}, ${withAlpha(t.gold, 0.15)})`,
                                                                    marginTop: 2,
                                                                }}
                                                            />
                                                        )}
                                                    </div>
                                                    <div style={{ paddingBottom: last ? 0 : 26, marginTop: -2 }}>
                                                        <div
                                                            style={{
                                                                fontFamily: SERIF,
                                                                fontSize: 15,
                                                                letterSpacing: '0.08em',
                                                                color: t.gold,
                                                            }}
                                                        >
                                                            {p.time}
                                                        </div>
                                                        <div
                                                            style={{
                                                                fontFamily: SERIF,
                                                                fontSize: 'clamp(18px, 5vw, 22px)',
                                                                fontWeight: 600,
                                                                color: t.text,
                                                            }}
                                                        >
                                                            {p.title}
                                                        </div>
                                                    </div>
                                                </div>
                                            </Fade>
                                        );
                                    })}
                                </div>
                            </div>
                        </Section>
                    )}</PkSec>

                    {/* ============ 6. LOKASI ============ */}
                    <PkSec name="location">{(data.venueName || data.venueAddress) && (
                        <Section reduce={reduce} style={sectionPad}>
                            <div style={{ ...wrapInner, textAlign: 'center' }}>
                                <SectionTitle
                                    t={t}
                                    kicker="Tempat Berlangsung"
                                    title={tr("Lokasi Majlis")}
                                    shimmerClass={shimmerClass}
                                />
                                <Fade reduce={reduce}>
                                    <div style={{ ...panel, textAlign: 'center' }}>
                                        <MapPin size={26} color={t.gold} style={{ marginBottom: 8 }} />
                                        {data.venueName && (
                                            <div
                                                style={{
                                                    fontFamily: SERIF,
                                                    fontSize: 'clamp(22px, 6vw, 28px)',
                                                    fontWeight: 600,
                                                    color: t.text,
                                                }}
                                            >
                                                {data.venueName}
                                            </div>
                                        )}
                                        {data.venueAddress && (
                                            <p
                                                style={{
                                                    fontFamily: SERIF,
                                                    fontSize: 16,
                                                    lineHeight: 1.7,
                                                    color: t.secondary,
                                                    margin: '8px 0 0',
                                                }}
                                            >
                                                {data.venueAddress}
                                            </p>
                                        )}
                                        {(data.mapsUrl || data.wazeUrl) && (
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    gap: 12,
                                                    justifyContent: 'center',
                                                    flexWrap: 'wrap',
                                                    marginTop: 20,
                                                }}
                                            >
                                                {data.mapsUrl && (
                                                    <a
                                                        className="seri-btn"
                                                        style={goldBtn}
                                                        href={data.mapsUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        <MapPin size={18} /> Google Maps
                                                    </a>
                                                )}
                                                {data.wazeUrl && (
                                                    <a
                                                        className="seri-btn"
                                                        style={goldBtn}
                                                        href={data.wazeUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        <Navigation size={18} /> Waze
                                                    </a>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </Fade>
                            </div>
                        </Section>
                    )}</PkSec>

                    {/* ============ 7. RSVP ============ */}
                    <PkSec name="rsvp">{slots?.rsvp && (
                        <Section reduce={reduce} style={sectionPad}>
                            <div style={wrapInner}>
                                <SectionTitle
                                    t={t}
                                    kicker="Khabarkan Kehadiran"
                                    title={tr("RSVP Kehadiran")}
                                    shimmerClass={shimmerClass}
                                />
                                <Fade reduce={reduce}>
                                    <div style={panel}>{slots.rsvp}</div>
                                </Fade>
                            </div>
                        </Section>
                    )}</PkSec>

                    {/* ============ 8. UCAPAN ============ */}
                    <PkSec name="wishes"><Section reduce={reduce} style={sectionPad}>
                        <div style={wrapInner}>
                            <SectionTitle
                                t={t}
                                kicker="Buku Tetamu"
                                title={tr("Ucapan & Doa")}
                                shimmerClass={shimmerClass}
                            />
                            <Fade reduce={reduce}>
                                {slots?.wishes ? (
                                    <div style={panel}>{slots.wishes}</div>
                                ) : (
                                    <div style={{ ...panel, textAlign: 'center' }}>
                                        <Heart size={28} color={t.gold} style={{ marginBottom: 10 }} />
                                        <p style={{ ...bodyText, margin: 0 }}>
                                            Titipkan ucapan dan doa restu anda buat pasangan pengantin di ruangan ini.
                                        </p>
                                    </div>
                                )}
                            </Fade>
                        </div>
                    </Section></PkSec>

                    {/* ============ 8b. SENARAI HADIAH ============ */}
                    <PkSec name="wishlist">{slots?.wishlist && (
                        <Section reduce={reduce} style={sectionPad}>
                            <div style={wrapInner}>
                                <SectionTitle
                                    t={t}
                                    kicker="Tanda Ingatan"
                                    title={tr("Senarai Hadiah")}
                                    shimmerClass={shimmerClass}
                                />
                                <Fade reduce={reduce}>
                                    <div style={panel}>{slots.wishlist}</div>
                                </Fade>
                            </div>
                        </Section>
                    )}</PkSec>

                    {/* ============ 9. HUBUNGI ============ */}
                    <PkSec name="contacts">{data.contacts && data.contacts.length > 0 && (
                        <Section reduce={reduce} style={sectionPad}>
                            <div style={{ ...wrapInner, textAlign: 'center' }}>
                                <SectionTitle
                                    t={t}
                                    kicker="Sebarang Pertanyaan"
                                    title={tr("Hubungi Kami")}
                                    shimmerClass={shimmerClass}
                                />
                                <div style={{ display: 'grid', gap: 12, maxWidth: 460, margin: '0 auto' }}>
                                    {data.contacts.map((c, i) => (
                                        <Fade key={`${c.phone}-${i}`} reduce={reduce}>
                                            <a
                                                className="seri-btn"
                                                href={`tel:${c.phone.replace(/\s+/g, '')}`}
                                                style={{
                                                    ...panel,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    gap: 12,
                                                    textDecoration: 'none',
                                                    color: t.text,
                                                }}
                                            >
                                                <span style={{ textAlign: 'left' }}>
                                                    <span style={{ display: 'block', fontFamily: SERIF, fontSize: 19, fontWeight: 600 }}>
                                                        {c.name}
                                                    </span>
                                                    {c.role && (
                                                        <span
                                                            style={{
                                                                display: 'block',
                                                                fontFamily: SERIF,
                                                                fontSize: 14,
                                                                color: t.secondary,
                                                            }}
                                                        >
                                                            {c.role}
                                                        </span>
                                                    )}
                                                </span>
                                                <span
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 8,
                                                        color: t.gold,
                                                        fontFamily: SERIF,
                                                        fontSize: 15,
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    <Phone size={18} /> {c.phone}
                                                </span>
                                            </a>
                                        </Fade>
                                    ))}
                                </div>
                            </div>
                        </Section>
                    )}</PkSec>

                    {/* ============ 10. SALAM KAUT ============ */}
                    <PkSec name="gift">{data.gift && (
                        <Section reduce={reduce} style={sectionPad}>
                            <div style={{ ...wrapInner, textAlign: 'center' }}>
                                <SectionTitle
                                    t={t}
                                    kicker="Salam Kaut"
                                    title={tr("Tanda Ingatan")}
                                    shimmerClass={shimmerClass}
                                />
                                <Fade reduce={reduce}>
                                    <div style={{ ...panel, textAlign: 'center' }}>
                                        <Gift size={28} color={t.gold} style={{ marginBottom: 10 }} />
                                        {data.gift.note && (
                                            <p
                                                style={{
                                                    fontFamily: SERIF,
                                                    fontStyle: 'italic',
                                                    fontSize: 17,
                                                    color: t.secondary,
                                                    margin: '0 0 16px',
                                                }}
                                            >
                                                {data.gift.note}
                                            </p>
                                        )}
                                        {data.gift.bankName && (
                                            <div style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 600, color: t.text }}>
                                                {data.gift.bankName}
                                            </div>
                                        )}
                                        {data.gift.accountName && (
                                            <div style={{ fontFamily: SERIF, fontSize: 16, color: t.secondary, marginTop: 2 }}>
                                                {data.gift.accountName}
                                            </div>
                                        )}
                                        {data.gift.accountNo && (
                                            <div style={{ marginTop: 14 }}>
                                                <div
                                                    className={shimmerClass}
                                                    style={{
                                                        fontFamily: SERIF,
                                                        fontSize: 'clamp(22px, 6vw, 28px)',
                                                        fontWeight: 700,
                                                        letterSpacing: '0.06em',
                                                    }}
                                                >
                                                    {data.gift.accountNo}
                                                </div>
                                                <button
                                                    type="button"
                                                    className="seri-btn"
                                                    onClick={() => copyAccount(data.gift!.accountNo!)}
                                                    style={{ ...goldBtn, marginTop: 14 }}
                                                >
                                                    {copied ? (
                                                        <>
                                                            <Check size={18} /> Telah disalin
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Copy size={18} /> Salin No. Akaun
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                        {data.gift.qrUrl && (
                                            <div style={{ marginTop: 18 }}>
                                                <img
                                                    src={data.gift.qrUrl}
                                                    alt="DuitNow QR"
                                                    loading="lazy"
                                                    style={{
                                                        width: 168,
                                                        height: 168,
                                                        objectFit: 'contain',
                                                        borderRadius: 12,
                                                        border: `1px solid ${withAlpha(t.gold, 0.35)}`,
                                                        background: withAlpha('#ffffff', 0.9),
                                                        padding: 8,
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </Fade>
                            </div>
                        </Section>
                    )}</PkSec>

                    {/* ============ 11. GALERI ============ */}
                    <PkSec name="gallery"><Section reduce={reduce} style={sectionPad}>
                        <div style={wrapInner}>
                            <SectionTitle
                                t={t}
                                kicker="Kenangan"
                                title={tr("Galeri Memori")}
                                shimmerClass={shimmerClass}
                            />
                            <Fade reduce={reduce}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                                    {hasGallery
                                        ? data.galleryImages!.map((src, i) => (
                                              <div
                                                  key={i}
                                                  style={{
                                                      position: 'relative',
                                                      paddingBottom: '100%',
                                                      borderRadius: 12,
                                                      overflow: 'hidden',
                                                      border: `1px solid ${withAlpha(t.gold, 0.32)}`,
                                                  }}
                                              >
                                                  <img
                                                      src={src}
                                                      alt={`Galeri ${i + 1}`}
                                                      loading="lazy"
                                                      style={{
                                                          position: 'absolute',
                                                          inset: 0,
                                                          width: '100%',
                                                          height: '100%',
                                                          objectFit: 'cover',
                                                      }}
                                                  />
                                              </div>
                                          ))
                                        : [0, 1, 2, 3, 4, 5].map((i) => (
                                              <div
                                                  key={i}
                                                  style={{
                                                      position: 'relative',
                                                      paddingBottom: '100%',
                                                      borderRadius: 12,
                                                      border: `1px dashed ${withAlpha(t.gold, 0.35)}`,
                                                      background: withAlpha(t.gold, 0.04),
                                                  }}
                                              >
                                                  <div
                                                      style={{
                                                          position: 'absolute',
                                                          inset: 0,
                                                          display: 'grid',
                                                          placeItems: 'center',
                                                      }}
                                                  >
                                                      <SeriStar size={28} stroke={withAlpha(t.gold, 0.5)} />
                                                  </div>
                                              </div>
                                          ))}
                                </div>
                            </Fade>
                        </div>
                    </Section></PkSec>
                </>
            )}

            {/* ============ 12. FOOTER ============ */}
            <Section reduce={reduce} style={{ ...sectionPad, paddingBottom: 'clamp(56px, 12vw, 88px)' }}>
                <div style={{ ...wrapInner, textAlign: 'center' }}>
                    <Fade reduce={reduce}>
                        <Rosette size={34} stroke={t.gold} className="seri-twinkle" style={{ margin: '0 auto 16px' }} />
                    </Fade>
                    <Fade reduce={reduce}>
                        <div
                            dir="rtl"
                            style={{
                                fontFamily: ARABIC,
                                fontSize: 'clamp(20px, 6vw, 28px)',
                                lineHeight: 1.9,
                                color: t.gold,
                            }}
                        >
                            بَارَكَ اللّٰهُ لَكُمَا وَجَمَعَ بَيْنَكُمَا فِيْ خَيْرٍ
                        </div>
                    </Fade>
                    <Fade reduce={reduce}>
                        <p
                            style={{
                                fontFamily: SERIF,
                                fontStyle: 'italic',
                                fontSize: 15,
                                color: t.secondary,
                                margin: '10px 0 22px',
                            }}
                        >
                            Semoga Allah memberkati pasangan ini, mengurniakan mawaddah wa rahmah, dan
                            menghimpunkan kalian berdua dalam kebaikan hingga ke syurga.
                        </p>
                    </Fade>
                    <Fade reduce={reduce}>
                        <div
                            className={shimmerClass}
                            style={{ fontFamily: NAMES, fontSize: 'clamp(28px, 8vw, 38px)', fontWeight: 600 }}
                        >
                            {groomShort} &amp; {brideShort}
                        </div>
                    </Fade>
                    <Fade reduce={reduce}>
                        <div
                            style={{
                                fontFamily: SERIF,
                                letterSpacing: '0.3em',
                                textTransform: 'uppercase',
                                fontSize: 14,
                                color: t.text,
                                marginTop: 10,
                            }}
                        >
                            Terima Kasih
                        </div>
                    </Fade>
                    <Fade reduce={reduce}>
                        <div style={{ marginTop: 22 }}>
                            <Divider gold={t.gold} />
                            <div
                                style={{
                                    fontFamily: SERIF,
                                    fontSize: 12,
                                    letterSpacing: '0.18em',
                                    textTransform: 'uppercase',
                                    color: withAlpha(t.secondary, 0.8),
                                    marginTop: 6,
                                }}
                            >
                                Dijemput menerusi PortalKahwin
                            </div>
                        </div>
                    </Fade>
                </div>
            </Section>
        </div>
    );
}

// ---------- cover inner content (shared by animated + reduced paths) ----------
function CoverContent({
    t,
    data,
    reduce,
    shimmerClass,
    groomShort,
    brideShort,
}: {
    t: Theme;
    data: TemplateProps['data'];
    reduce: boolean;
    shimmerClass: string;
    groomShort: string;
    brideShort: string;
}) {
    const tr = useCardText();
    return (
        <>
            <Fade reduce={reduce}>
                <SeriStar size={30} stroke={t.gold} className="seri-twinkle" style={{ margin: '0 auto 18px' }} />
            </Fade>

            {data.bismillah !== false && (
                <Fade reduce={reduce}>
                    <div
                        dir="rtl"
                        className={shimmerClass}
                        style={{
                            fontFamily: ARABIC,
                            fontSize: 'clamp(24px, 8vw, 40px)',
                            lineHeight: 1.7,
                            margin: '0 0 6px',
                            fontWeight: 500,
                        }}
                    >
                        بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ
                    </div>
                </Fade>
            )}

            <Fade reduce={reduce}>
                <div
                    style={{
                        fontFamily: SERIF,
                        letterSpacing: '0.42em',
                        textTransform: 'uppercase',
                        fontSize: 12,
                        color: t.secondary,
                        margin: '14px 0 4px',
                    }}
                >
                    {tr("Walimatulurus")}
                </div>
            </Fade>

            <Fade reduce={reduce}>
                <div style={{ margin: '10px 0 4px' }}>
                    <div
                        className={shimmerClass}
                        style={{
                            fontFamily: NAMES,
                            fontSize: 'clamp(40px, 14vw, 68px)',
                            lineHeight: 1.05,
                            fontWeight: 600,
                        }}
                    >
                        {groomShort}
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 14,
                            margin: '6px 0',
                        }}
                    >
                        <span style={{ height: 1, width: 40, background: withAlpha(t.gold, 0.6) }} />
                        <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 26, color: t.gold }}>&amp;</span>
                        <span style={{ height: 1, width: 40, background: withAlpha(t.gold, 0.6) }} />
                    </div>
                    <div
                        className={shimmerClass}
                        style={{
                            fontFamily: NAMES,
                            fontSize: 'clamp(40px, 14vw, 68px)',
                            lineHeight: 1.05,
                            fontWeight: 600,
                        }}
                    >
                        {brideShort}
                    </div>
                </div>
            </Fade>

            {data.dateLabel && (
                <Fade reduce={reduce}>
                    <div
                        style={{
                            fontFamily: SERIF,
                            fontSize: 16,
                            letterSpacing: '0.06em',
                            color: t.text,
                            marginTop: 12,
                        }}
                    >
                        {data.dateLabel}
                    </div>
                </Fade>
            )}
        </>
    );
}
