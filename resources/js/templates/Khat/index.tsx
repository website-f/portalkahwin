// ============================================================
// Khat / Islamic Elegant — Malaysian wedding e-invitation
// Deep emerald + gold, original inline SVG Islamic geometry:
// self-drawing arabesque frame (pathLength), 8-point stars,
// interlaced lattice, gold shimmer. Single self-contained file.
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
import { PrayerSection } from '../../components/PrayerSection';
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
import { OpeningGate } from '../OpeningGate';
import { useCardText } from '../cardText';
import { REVEAL_TIMING, TEMPLATE_ART } from '../templateArt';

/**
 * Entrance personality for this design, from its art direction — the
 * catalogue used to share one easing curve, which made every card feel
 * the same however differently it was coloured.
 */
const MOTION = REVEAL_TIMING[TEMPLATE_ART['khat'].reveal];


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
    // Honor data.palette; fall back to Khat emerald/gold defaults.
    const primary = palette?.primary ?? '#0e3d2f';
    const secondary = palette?.secondary ?? '#8fb7a4';
    const gold = palette?.accent ?? '#d4af37';
    const bg = palette?.bg ?? '#04140f';
    const text = palette?.text ?? '#f5edd6';
    return {
        primary,
        secondary,
        gold,
        bg,
        text,
        goldLight: shade(gold, 55),
        goldDeep: shade(gold, -55),
        bgSoft: shade(bg, 16),
        bgDeep: shade(bg, -10),
    };
}
type Theme = ReturnType<typeof buildTheme>;

// ---------- motion variants ----------
const containerV: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.13, delayChildren: 0.05 } },
};
const itemV: Variants = {
    hidden: { opacity: 0, y: MOTION.y },
    show: { opacity: 1, y: 0, transition: { duration: MOTION.duration, ease: MOTION.ease } },
};
const drawV: Variants = {
    hidden: { pathLength: 0, opacity: 0 },
    show: (i: number = 0) => ({
        pathLength: 1,
        opacity: 1,
        transition: {
            pathLength: { duration: 1.7, ease: 'easeInOut', delay: 0.15 + i * 0.14 },
            opacity: { duration: 0.35, delay: 0.15 + i * 0.14 },
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
//  Inline SVG ornaments (all original)
// ============================================================

// Geometric 8-point star (two interlaced squares — "khatam").
function GeoStar({
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
    const c = 12;
    const r = 10;
    const d = r * 0.7071;
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
                d={`M ${c - r} ${c} L ${c} ${c - r} L ${c + r} ${c} L ${c} ${c + r} Z`}
                stroke={stroke}
                strokeWidth={sw}
                fill={fill}
                strokeLinejoin="round"
            />
            <path
                d={`M ${c - d} ${c - d} L ${c + d} ${c - d} L ${c + d} ${c + d} L ${c - d} ${c + d} Z`}
                stroke={stroke}
                strokeWidth={sw}
                fill={fill}
                strokeLinejoin="round"
            />
        </svg>
    );
}

// Geometric divider with central stars + tapering gold rules.
function Divider({ gold }: { gold: string }) {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                margin: '10px 0',
            }}
        >
            <span
                style={{
                    height: 1,
                    width: 'clamp(36px, 14vw, 74px)',
                    background: `linear-gradient(90deg, transparent, ${gold})`,
                }}
            />
            <GeoStar size={20} stroke={gold} />
            <GeoStar size={11} stroke={withAlpha(gold, 0.75)} />
            <GeoStar size={20} stroke={gold} />
            <span
                style={{
                    height: 1,
                    width: 'clamp(36px, 14vw, 74px)',
                    background: `linear-gradient(270deg, transparent, ${gold})`,
                }}
            />
        </div>
    );
}

// Subtle full-bleed interlaced lattice background.
function LatticeBg({ gold }: { gold: string }) {
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
                opacity: 0.07,
                pointerEvents: 'none',
                zIndex: 0,
            }}
        >
            <defs>
                <pattern
                    id="khatLattice"
                    width="64"
                    height="64"
                    patternUnits="userSpaceOnUse"
                >
                    <path
                        d="M32 6 L58 32 L32 58 L6 32 Z"
                        fill="none"
                        stroke={gold}
                        strokeWidth="1"
                    />
                    <path
                        d="M14 14 L50 14 L50 50 L14 50 Z"
                        fill="none"
                        stroke={gold}
                        strokeWidth="1"
                    />
                    <circle cx="32" cy="32" r="2" fill={gold} />
                    <circle cx="0" cy="0" r="1.4" fill={gold} />
                    <circle cx="64" cy="64" r="1.4" fill={gold} />
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#khatLattice)" />
        </svg>
    );
}

// Self-drawing arabesque corner flourish (pathLength animated).
function CornerFlourish({
    gold,
    corner,
    index,
    animate,
}: {
    gold: string;
    corner: 'tl' | 'tr' | 'bl' | 'br';
    index: number;
    animate: boolean;
}) {
    const map: Record<string, CSSProperties> = {
        tl: { top: 4, left: 4, transform: 'none' },
        tr: { top: 4, right: 4, transform: 'scaleX(-1)' },
        bl: { bottom: 4, left: 4, transform: 'scaleY(-1)' },
        br: { bottom: 4, right: 4, transform: 'scale(-1, -1)' },
    };
    // Symmetric double-scroll emanating from the (4,4) corner.
    const d =
        'M4 4 C 4 21 13 31 30 31 C 19 31 15 24 18 19 C 21 14 29 17 28 27 ' +
        'M4 4 C 21 4 31 13 31 30 C 31 19 24 15 19 18 C 14 21 17 29 27 28';
    const common = {
        variants: drawV,
        custom: index,
        initial: animate ? ('hidden' as const) : false,
        animate: animate ? ('show' as const) : false,
    };
    return (
        <svg
            aria-hidden
            width={64}
            height={64}
            viewBox="0 0 42 42"
            fill="none"
            style={{ position: 'absolute', overflow: 'visible', zIndex: 2, ...map[corner] }}
        >
            <motion.path
                d={d}
                stroke={gold}
                strokeWidth={1.3}
                strokeLinecap="round"
                fill="none"
                {...common}
            />
            <motion.circle cx={4} cy={4} r={2.4} fill={gold} {...common} />
            <motion.path
                d="M4 4 L 11 11"
                stroke={withAlpha(gold, 0.8)}
                strokeWidth={1}
                {...common}
            />
        </svg>
    );
}

// Signature: slow-rising faint gold geometric motes (cover flourish).
// GPU-cheap — each mote animates transform + opacity only. Capped at 14.
function GoldMotes({ gold }: { gold: string }) {
    const motes = useMemo(
        () =>
            Array.from({ length: 14 }, (_, i) => ({
                key: i,
                left: (i * 7 + 5) % 100,
                delay: (i % 7) * 1.6,
                dur: 12 + (i % 5) * 2.4,
                size: 7 + (i % 4) * 4,
            })),
        [],
    );
    return (
        <div
            aria-hidden
            style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}
        >
            {motes.map((m) => (
                <span
                    key={m.key}
                    style={{
                        position: 'absolute',
                        left: `${m.left}%`,
                        bottom: '-8%',
                        animation: `khatRise ${m.dur}s linear ${m.delay}s infinite`,
                        willChange: 'transform',
                    }}
                >
                    <GeoStar size={m.size} stroke={withAlpha(gold, 0.6)} />
                </span>
            ))}
        </div>
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

// ============================================================
//  Main template
// ============================================================
export default function KhatTemplate(props: TemplateProps) {
    const { data, preview } = props;
    return (
        <OpeningGate
            reveal="envelope"
            data={data}
            preview={preview}
            panelColor={data.palette?.primary ?? '#0e3d2f'}
            accentColor={data.palette?.accent ?? '#d4af37'}
        >
            <KhatTemplateInner {...props} />
        </OpeningGate>
    );
}

function KhatTemplateInner({ data, preview, slots }: TemplateProps) {
    const tr = useCardText();
    const prefersReduce = useReducedMotion();
    const reduce = !!preview || !!prefersReduce;

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

    const shimmerClass = reduce
        ? 'khat-gold-text'
        : 'khat-gold-text khat-shimmer';

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
        background: withAlpha(t.gold, 0.05),
        border: `1px solid ${withAlpha(t.gold, 0.28)}`,
        borderRadius: 16,
        padding: '22px 20px',
    };
    const goldBtn: CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 9,
        padding: '13px 22px',
        borderRadius: 999,
        border: `1px solid ${withAlpha(t.gold, 0.55)}`,
        background: `linear-gradient(135deg, ${withAlpha(t.gold, 0.18)}, ${withAlpha(
            t.gold,
            0.04,
        )})`,
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
    .khat-gold-text {
      background-image: linear-gradient(100deg, ${t.goldDeep} 0%, ${t.gold} 28%, ${t.goldLight} 44%, #fff7dd 50%, ${t.goldLight} 56%, ${t.gold} 72%, ${t.goldDeep} 100%);
      background-size: 230% auto;
      -webkit-background-clip: text; background-clip: text;
      -webkit-text-fill-color: transparent; color: transparent;
    }
    .khat-shimmer { animation: khatShimmer 7s linear infinite; }
    @keyframes khatShimmer { 0% { background-position: 0% center; } 100% { background-position: 230% center; } }
    .khat-btn { transition: transform .2s ease, box-shadow .2s ease, background .25s ease; }
    .khat-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 26px rgba(0,0,0,.28); background: linear-gradient(135deg, ${withAlpha(
        t.gold,
        0.28,
    )}, ${withAlpha(t.gold, 0.08)}); }
    .khat-twinkle { animation: khatTwinkle 3.6s ease-in-out infinite; }
    @keyframes khatTwinkle { 0%,100% { opacity:.2 } 50% { opacity:.7 } }
    @keyframes khatRise {
      0% { transform: translateY(0) rotate(0deg); opacity: 0; }
      14% { opacity: 0.5; }
      86% { opacity: 0.5; }
      100% { transform: translateY(-104vh) rotate(140deg); opacity: 0; }
    }
    @media (prefers-reduced-motion: reduce) { .khat-shimmer, .khat-twinkle { animation: none; } }
  `;

    const hasGallery = !!data.galleryImages && data.galleryImages.length > 0;

    const groomShort = data.groomShort ?? data.groomName;
    const brideShort = data.brideShort ?? data.brideName;

    // Bride-side hosting → render the bride's name first.
    const brideFirst = (data.inviteSide === 'bride' || data.inviteSide === 'both_bride');
    const firstShort = brideFirst ? brideShort : groomShort;
    const secondShort = brideFirst ? groomShort : brideShort;
    const firstName = brideFirst ? data.brideName : data.groomName;
    const secondName = brideFirst ? data.groomName : data.brideName;
    const firstParents = brideFirst ? data.brideParents : data.groomParents;
    const secondParents = brideFirst ? data.groomParents : data.brideParents;

    // Walimah heading: undefined = template default, '' = hide, else custom.
    const walimahText = data.walimahLabel ?? tr('Walimatulurus');

    return (
        <div
            style={{
                position: 'relative',
                background: `radial-gradient(130% 80% at 50% -8%, ${t.bgSoft} 0%, ${t.bg} 46%, ${t.bgDeep} 100%)`,
                color: t.text,
                fontFamily: SERIF,
                overflow: 'hidden',
                width: '100%',
            }}
        >
            <style>{css}</style>
            <LatticeBg gold={t.gold} />

            {/* ============ 1. COVER ============ */}
            <div
                style={{
                    position: 'relative',
                    minHeight: preview ? 'var(--pk-vh, 540px)' : '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    padding: 'clamp(40px, 9vw, 72px) 22px',
                    // Room for the scroll cue at bottom:26 — see Floral for the rationale.
                    paddingBottom: 'var(--pk-cue-clear, 96px)',
                    zIndex: 1,
                }}
            >
                {/* optional user cover image, very faint behind the frame */}
                {data.coverImage && (
                    <div
                        aria-hidden
                        style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundImage: `url(${data.coverImage})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            opacity: 0.14,
                            filter: 'saturate(0.7)',
                        }}
                    />
                )}

                {/* Signature rising gold motes (behind the frame + content) */}
                {!reduce && <GoldMotes gold={t.gold} />}

                {/* Self-drawing arabesque frame */}
                <div
                    style={{
                        position: 'absolute',
                        inset: 'clamp(16px, 4vw, 30px)',
                        pointerEvents: 'none',
                        zIndex: 1,
                    }}
                >
                    <svg
                        width="100%"
                        height="100%"
                        viewBox="0 0 300 460"
                        preserveAspectRatio="none"
                        fill="none"
                        aria-hidden
                        style={{ position: 'absolute', inset: 0 }}
                    >
                        <motion.rect
                            x={6}
                            y={6}
                            width={288}
                            height={448}
                            rx={5}
                            fill="none"
                            stroke={t.gold}
                            strokeWidth={1.4}
                            vectorEffect="non-scaling-stroke"
                            variants={drawV}
                            custom={0}
                            initial={reduce ? false : 'hidden'}
                            animate={reduce ? false : 'show'}
                        />
                        <motion.rect
                            x={14}
                            y={14}
                            width={272}
                            height={432}
                            rx={3}
                            fill="none"
                            stroke={withAlpha(t.gold, 0.5)}
                            strokeWidth={0.7}
                            vectorEffect="non-scaling-stroke"
                            variants={drawV}
                            custom={1}
                            initial={reduce ? false : 'hidden'}
                            animate={reduce ? false : 'show'}
                        />
                    </svg>
                    <CornerFlourish gold={t.gold} corner="tl" index={2} animate={!reduce} />
                    <CornerFlourish gold={t.gold} corner="tr" index={2.4} animate={!reduce} />
                    <CornerFlourish gold={t.gold} corner="bl" index={2.8} animate={!reduce} />
                    <CornerFlourish gold={t.gold} corner="br" index={3.2} animate={!reduce} />
                </div>

                {/* Cover content */}
                <motion.div
                    style={{ position: 'relative', zIndex: 3, width: '100%', maxWidth: 460 }}
                    variants={reduce ? undefined : containerV}
                    initial={reduce ? undefined : 'hidden'}
                    animate={reduce ? undefined : 'show'}
                >
                    <Fade reduce={reduce}>
                        <GeoStar
                            size={30}
                            stroke={t.gold}
                            className="khat-twinkle"
                            style={{ margin: '0 auto 18px' }}
                        />
                    </Fade>

                    {/* Bismillah */}
                    {data.bismillah !== false && (
                        <Fade reduce={reduce}>
                            {data.bismillahText ? (
                                <div
                                    className={shimmerClass}
                                    style={{
                                        fontFamily: SERIF,
                                        fontSize: 'clamp(24px, 8vw, 40px)',
                                        lineHeight: 1.7,
                                        margin: '0 0 6px',
                                        fontWeight: 500,
                                        textAlign: 'center',
                                    }}
                                >
                                    {data.bismillahText}
                                </div>
                            ) : (
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
                            )}
                        </Fade>
                    )}

                    {walimahText.trim() && (
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
                                {walimahText}
                            </div>
                        </Fade>
                    )}

                    {/* Short names */}
                    <Fade reduce={reduce}>
                        <div style={{ margin: '10px 0 4px' }}>
                            <div
                                className={shimmerClass}
                                style={{
                                    fontFamily: SERIF,
                                    fontSize: 'clamp(40px, 14vw, 68px)',
                                    lineHeight: 1.05,
                                    fontWeight: 600,
                                }}
                            >
                                {firstShort}
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
                                <span
                                    style={{
                                        height: 1,
                                        width: 40,
                                        background: withAlpha(t.gold, 0.6),
                                    }}
                                />
                                <span
                                    style={{
                                        fontFamily: SERIF,
                                        fontStyle: 'italic',
                                        fontSize: 26,
                                        color: t.gold,
                                    }}
                                >
                                    &amp;
                                </span>
                                <span
                                    style={{
                                        height: 1,
                                        width: 40,
                                        background: withAlpha(t.gold, 0.6),
                                    }}
                                />
                            </div>
                            <div
                                className={shimmerClass}
                                style={{
                                    fontFamily: SERIF,
                                    fontSize: 'clamp(40px, 14vw, 68px)',
                                    lineHeight: 1.05,
                                    fontWeight: 600,
                                }}
                            >
                                {secondShort}
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
                </motion.div>

                {/* Scroll cue */}
                {!preview &&
                    (reduce ? (
                        <div
                            style={{
                                position: 'absolute',
                                bottom: 26,
                                color: t.gold,
                                zIndex: 3,
                            }}
                        >
                            <ChevronDown size={26} />
                        </div>
                    ) : (
                        <motion.div
                            style={{ position: 'absolute', bottom: 26, color: t.gold, zIndex: 3, willChange: 'transform' }}
                            animate={{ y: [0, 9, 0] }}
                            transition={{ duration: 1.7, repeat: Infinity, ease: 'easeInOut' }}
                        >
                            <ChevronDown size={26} />
                        </motion.div>
                    ))}
            </div>

            {/* ============ 2. OPENING ============ */}
            <Section reduce={reduce} style={sectionPad}>
                <div style={{ ...wrapInner, textAlign: 'center' }}>
                    <Fade reduce={reduce}>
                        <GeoStar size={26} stroke={t.gold} style={{ margin: '0 auto 18px' }} />
                    </Fade>
                    {data.openingLine && (
                        <Fade reduce={reduce}>
                            <p style={{ ...bodyText, margin: '0 auto', maxWidth: 560 }}>
                                {data.openingLine}
                            </p>
                        </Fade>
                    )}
                    {/* Doa / blessing accent — Ar-Rum : 21 */}
                    <Fade reduce={reduce}>
                        <div style={{ ...panel, marginTop: 30, textAlign: 'center' }}>
                            <div
                                dir="rtl"
                                style={{
                                    fontFamily: ARABIC,
                                    fontSize: 'clamp(20px, 6vw, 28px)',
                                    lineHeight: 1.9,
                                    color: t.gold,
                                }}
                            >
                                وَمِنْ آيَاتِهِ أَنْ خَلَقَ لَكُمْ مِنْ أَنْفُسِكُمْ أَزْوَاجًا
                                لِتَسْكُنُوا إِلَيْهَا وَجَعَلَ بَيْنَكُمْ مَوَدَّةً وَرَحْمَةً
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
                                “Dan di antara tanda-tanda kekuasaan-Nya, Dia menciptakan untukmu
                                pasangan hidup dari jenismu sendiri, supaya kamu berasa tenteram
                                dan dijadikan-Nya rasa kasih sayang di antara kamu.”
                                <br />
                                Surah Ar-Rum : 21
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
                            {firstName}
                        </h3>
                    </Fade>
                    {firstParents && (
                        <Fade reduce={reduce}>
                            <p style={{ fontFamily: SERIF, fontSize: 16, color: t.secondary, margin: 0 }}>
                                {firstParents}
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
                            {secondName}
                        </h3>
                    </Fade>
                    {secondParents && (
                        <Fade reduce={reduce}>
                            <p style={{ fontFamily: SERIF, fontSize: 16, color: t.secondary, margin: 0 }}>
                                {secondParents}
                            </p>
                        </Fade>
                    )}
                </div>
            </Section>

            {/* Sections below are hidden in the compact preview */}
            {!preview && (
                <>
                    <PrayerSection text={data.prayer} primary={t.text} accent={t.gold} secondary={t.secondary} serif={SERIF} />

                    {/* ============ 4. DATE + COUNTDOWN ============ */}
                    <Section reduce={reduce} style={sectionPad}>
                        <div style={{ ...wrapInner, textAlign: 'center' }}>
                            <SectionTitle
                                t={t}
                                kicker="Menuju Hari Bahagia"
                                title={tr("Save The Date")}
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
                                            <div
                                                key={u.label}
                                                style={{
                                                    ...panel,
                                                    padding: '16px 6px',
                                                    position: 'relative',
                                                }}
                                            >
                                                <GeoStar
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
                                    kicker="Rentak Majlis"
                                    title={tr("Atur Cara")}
                                    shimmerClass={shimmerClass}
                                />
                                <div style={{ maxWidth: 520, margin: '0 auto' }}>
                                    {data.program.map((p, i) => {
                                        const last = i === data.program!.length - 1;
                                        return (
                                            <Fade key={`${p.time}-${i}`} reduce={reduce}>
                                                <div style={{ display: 'flex', gap: 16 }}>
                                                    {/* bullet + connector */}
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            alignItems: 'center',
                                                        }}
                                                    >
                                                        <GeoStar size={26} stroke={t.gold} fill={withAlpha(t.gold, 0.12)} />
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
                                                        className="khat-btn"
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
                                                        className="khat-btn"
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
                                            Titipkan ucapan dan doa restu anda buat pasangan
                                            pengantin di ruangan ini.
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
                                    title={tr("Hubungi")}
                                    shimmerClass={shimmerClass}
                                />
                                <div
                                    style={{
                                        display: 'grid',
                                        gap: 12,
                                        maxWidth: 460,
                                        margin: '0 auto',
                                    }}
                                >
                                    {data.contacts.map((c, i) => (
                                        <Fade key={`${c.phone}-${i}`} reduce={reduce}>
                                            <a
                                                className="khat-btn"
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
                                                    <span
                                                        style={{
                                                            display: 'block',
                                                            fontFamily: SERIF,
                                                            fontSize: 19,
                                                            fontWeight: 600,
                                                        }}
                                                    >
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
                                    kicker="Salam Kasih"
                                    title={tr("Tanda Kasih")}
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
                                            <div
                                                style={{
                                                    fontFamily: SERIF,
                                                    fontSize: 20,
                                                    fontWeight: 600,
                                                    color: t.text,
                                                }}
                                            >
                                                {data.gift.bankName}
                                            </div>
                                        )}
                                        {data.gift.accountName && (
                                            <div
                                                style={{
                                                    fontFamily: SERIF,
                                                    fontSize: 16,
                                                    color: t.secondary,
                                                    marginTop: 2,
                                                }}
                                            >
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
                                                    className="khat-btn"
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
                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(3, 1fr)',
                                        gap: 10,
                                    }}
                                >
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
                                                      <GeoStar
                                                          size={28}
                                                          stroke={withAlpha(t.gold, 0.5)}
                                                      />
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
                        <GeoStar
                            size={30}
                            stroke={t.gold}
                            className="khat-twinkle"
                            style={{ margin: '0 auto 16px' }}
                        />
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
                            بَارَكَ اللّٰهُ لَكُمَا وَبَارَكَ عَلَيْكُمَا وَجَمَعَ بَيْنَكُمَا فِيْ
                            خَيْرٍ
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
                            Semoga Allah memberkati pernikahan ini, dan menghimpunkan kalian
                            berdua dalam kebaikan.
                        </p>
                    </Fade>
                    <Fade reduce={reduce}>
                        <div
                            className={shimmerClass}
                            style={{
                                fontFamily: SERIF,
                                fontSize: 'clamp(28px, 8vw, 38px)',
                                fontWeight: 600,
                            }}
                        >
                            {firstShort} &amp;{' '}
                            {secondShort}
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
                        </div>
                    </Fade>
                </div>
            </Section>
        </div>
    );
}
