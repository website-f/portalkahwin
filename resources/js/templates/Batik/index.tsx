// ============================================================
// Batik Nusantara wedding e-invitation template.
// Indigo / navy ink + antique gold. Self-contained: every
// visual (the repeating batik motif, envelope, ornaments) is
// original inline SVG / CSS. No external images, fonts, CDNs.
//
// Signature cover animation: a closed batik-patterned envelope
// whose top flap folds open (rotateX) while the inner card
// slides up and zooms in to reveal the couple.
// ============================================================

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
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
const AMP = '&'; // literal ampersand for JSX text

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

// ---------- theme --------------------------------------------------------
interface Theme {
    primary: string; // indigo ink / headings
    secondary: string; // supporting
    accent: string; // antique gold — lines, buttons
    bg: string; // page background (warm ivory)
    text: string; // body text
    indigo: string; // envelope / bands
    indigoDeep: string; // dramatic cover backdrop
    goldLight: string; // gold highlight
    cream: string; // inner card
    card: string; // panels
    line: string; // hairlines
}

// =========================================================================
//  Original repeating batik motif (kawung rosettes + parang tendrils + dots)
// =========================================================================

/**
 * A seamlessly tileable batik motif rendered as an inline SVG <pattern>.
 * Each instance needs a unique `id` so multiple url(#id) fills don't collide.
 */
function BatikPattern({
    id,
    stroke,
    dot,
    strokeWidth = 1.4,
    opacity = 1,
}: {
    id: string;
    stroke: string;
    dot?: string;
    strokeWidth?: number;
    opacity?: number;
}) {
    const T = 90; // tile size in px (userSpaceOnUse)
    const dotColor = dot ?? stroke;
    // kawung rosette centres — corners + centre make the tile seamless.
    const centres: Array<[number, number]> = [
        [0, 0],
        [T, 0],
        [0, T],
        [T, T],
        [T / 2, T / 2],
    ];

    return (
        <svg
            aria-hidden="true"
            width="100%"
            height="100%"
            style={{ position: 'absolute', inset: 0, opacity, display: 'block' }}
        >
            <defs>
                <pattern id={id} width={T} height={T} patternUnits="userSpaceOnUse">
                    <g fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round">
                        {/* diagonal parang tendrils (corner-to-corner → tiles cleanly) */}
                        <path d={`M0 0 C ${T * 0.34} ${T * 0.24}, ${T * 0.66} ${T * 0.76}, ${T} ${T}`} opacity={0.55} />
                        <path
                            d={`M${T} 0 C ${T * 0.66} ${T * 0.24}, ${T * 0.34} ${T * 0.76}, 0 ${T}`}
                            opacity={0.28}
                        />
                        {/* kawung — interlocking ovals */}
                        {centres.map(([cx, cy]) => (
                            <g key={`o-${cx}-${cy}`}>
                                <ellipse cx={cx} cy={cy - 18} rx={7.5} ry={15} />
                                <ellipse cx={cx} cy={cy + 18} rx={7.5} ry={15} />
                                <ellipse cx={cx - 18} cy={cy} rx={15} ry={7.5} />
                                <ellipse cx={cx + 18} cy={cy} rx={15} ry={7.5} />
                            </g>
                        ))}
                    </g>
                    {/* cecek dots */}
                    <g fill={dotColor} stroke="none">
                        {centres.map(([cx, cy]) => (
                            <circle key={`d-${cx}-${cy}`} cx={cx} cy={cy} r={2.6} />
                        ))}
                        <circle cx={T / 2} cy={0} r={1.7} />
                        <circle cx={0} cy={T / 2} r={1.7} />
                        <circle cx={T} cy={T / 2} r={1.7} />
                        <circle cx={T / 2} cy={T} r={1.7} />
                    </g>
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#${id})`} />
        </svg>
    );
}

/** A small batik rosette medallion (also used as the envelope wax seal). */
function BatikSeal({ theme, size = 60 }: { theme: Theme; size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 60 60" aria-hidden="true" style={{ display: 'block' }}>
            <circle cx={30} cy={30} r={28} fill={theme.indigoDeep} stroke={theme.accent} strokeWidth={2} />
            <circle cx={30} cy={30} r={22} fill="none" stroke={theme.goldLight} strokeWidth={1} opacity={0.7} />
            <g fill="none" stroke={theme.accent} strokeWidth={1.6} strokeLinecap="round">
                <ellipse cx={30} cy={19} rx={5} ry={10} />
                <ellipse cx={30} cy={41} rx={5} ry={10} />
                <ellipse cx={19} cy={30} rx={10} ry={5} />
                <ellipse cx={41} cy={30} rx={10} ry={5} />
            </g>
            <circle cx={30} cy={30} r={3.4} fill={theme.goldLight} />
        </svg>
    );
}

/** Divider: gold hairlines flanking a centre batik diamond. */
function BatikDivider({ theme }: { theme: Theme }) {
    return (
        <svg
            width={230}
            height={26}
            viewBox="0 0 230 26"
            aria-hidden="true"
            style={{ display: 'block', margin: '18px auto 0', maxWidth: '80%' }}
        >
            <line x1="20" y1="13" x2="95" y2="13" stroke={theme.accent} strokeWidth={1.1} />
            <line x1="135" y1="13" x2="210" y2="13" stroke={theme.accent} strokeWidth={1.1} />
            <g fill="none" stroke={theme.accent} strokeWidth={1.3}>
                <ellipse cx={115} cy={13} rx={4} ry={9} />
                <ellipse cx={115} cy={13} rx={9} ry={4} />
            </g>
            <circle cx={115} cy={13} r={2.2} fill={theme.accent} />
            <circle cx={104} cy={13} r={1.6} fill={theme.accent} />
            <circle cx={126} cy={13} r={1.6} fill={theme.accent} />
        </svg>
    );
}

// =========================================================================
//  Motion helpers
// =========================================================================

function Reveal({
    children,
    disabled,
    delay = 0,
    y = 26,
    style,
}: {
    children: ReactNode;
    disabled?: boolean;
    delay?: number;
    y?: number;
    style?: CSSProperties;
}) {
    if (disabled) {
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
                    fontSize: 'clamp(32px, 6.5vw, 48px)',
                    fontWeight: 600,
                    color: theme.primary,
                    margin: 0,
                    lineHeight: 1.1,
                }}
            >
                {title}
            </h2>
            <BatikDivider theme={theme} />
        </div>
    );
}

// =========================================================================
//  Countdown (guarded, self-cleaning interval)
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
        if (Number.isNaN(t)) return;
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
                padding: '16px 12px',
                borderRadius: 14,
                background: theme.card,
                border: `1px solid ${theme.line}`,
                boxShadow: '0 8px 24px rgba(19,28,56,0.10)',
                textAlign: 'center',
            }}
        >
            <div
                style={{
                    fontFamily: SERIF,
                    fontSize: 'clamp(30px, 7vw, 42px)',
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
    theme,
    patternId,
}: {
    children: ReactNode;
    style?: CSSProperties;
    background?: string;
    theme: Theme;
    patternId?: string;
}) {
    return (
        <section
            style={{
                position: 'relative',
                padding: 'clamp(62px, 11vw, 122px) 20px',
                background,
                overflow: 'hidden',
                ...style,
            }}
        >
            {patternId && (
                <div aria-hidden="true" style={{ position: 'absolute', inset: 0, opacity: 0.05, pointerEvents: 'none' }}>
                    <BatikPattern id={patternId} stroke={theme.accent} />
                </div>
            )}
            <div style={{ maxWidth: 720, margin: '0 auto', position: 'relative', zIndex: 1 }}>{children}</div>
        </section>
    );
}

// =========================================================================
//  Cover — the batik envelope that opens on load
// =========================================================================

function EnvelopeCover({
    theme,
    data,
    groomShort,
    brideShort,
    motionOff,
}: {
    theme: Theme;
    data: TemplateProps['data'];
    groomShort: string;
    brideShort: string;
    motionOff: boolean;
}) {

    const tr = useCardText();
    // Floating gold motifs drifting behind the envelope (cover flourish).
    const motifs = useMemo(
        () =>
            Array.from({ length: 10 }, (_, i) => ({
                key: i,
                left: (i * 9.5 + 4) % 100,
                delay: (i % 5) * 1.3,
                dur: 11 + (i % 4) * 3,
                size: 10 + (i % 3) * 6,
            })),
        [],
    );

    const cardInner = (
        <div
            style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 12,
                background: theme.cream,
                border: `1.5px solid ${theme.accent}`,
                boxShadow: 'inset 0 0 0 4px rgba(255,255,255,0.5), 0 22px 48px rgba(19,28,56,0.4)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '22px 18px',
                overflow: 'hidden',
            }}
        >
            <div aria-hidden="true" style={{ position: 'absolute', inset: 0, opacity: 0.06 }}>
                <BatikPattern id="batik-card-face" stroke={theme.accent} />
            </div>
            <div style={{ position: 'relative', zIndex: 1, width: '100%' }}>
                {data.bismillah && (
                    <div
                        style={{
                            direction: 'rtl',
                            fontFamily: ARABIC,
                            fontSize: 'clamp(19px, 5.4vw, 27px)',
                            color: theme.primary,
                            lineHeight: 1.9,
                            marginBottom: 8,
                        }}
                    >
                        بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ
                    </div>
                )}
                <div
                    style={{
                        fontFamily: BODY,
                        fontSize: 12,
                        letterSpacing: '0.34em',
                        textTransform: 'uppercase',
                        color: theme.secondary,
                    }}
                >
                    {tr("Walimatulurus")}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 2px' }}>
                    <BatikSeal theme={theme} size={44} />
                </div>
                <div
                    style={{
                        fontFamily: SERIF,
                        fontSize: 'clamp(30px, 8.5vw, 46px)',
                        fontWeight: 600,
                        color: theme.primary,
                        lineHeight: 1.06,
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
                        margin: '1px 0',
                    }}
                >
                    {AMP}
                </div>
                <div
                    style={{
                        fontFamily: SERIF,
                        fontSize: 'clamp(30px, 8.5vw, 46px)',
                        fontWeight: 600,
                        color: theme.primary,
                        lineHeight: 1.06,
                    }}
                >
                    {brideShort}
                </div>
                {data.dateLabel && (
                    <div style={{ fontFamily: SERIF, fontSize: 'clamp(15px, 4vw, 20px)', color: theme.secondary, marginTop: 8 }}>
                        {data.dateLabel}
                    </div>
                )}
            </div>
        </div>
    );

    const flapFace = (
        <>
            <div aria-hidden="true" style={{ position: 'absolute', inset: 0, opacity: 0.22 }}>
                <BatikPattern id="batik-flap" stroke={theme.goldLight} />
            </div>
            <div style={{ position: 'absolute', bottom: '14%', left: '50%', transform: 'translateX(-50%)' }}>
                <BatikSeal theme={theme} size={58} />
            </div>
        </>
    );

    return (
        <section
            style={{
                position: 'relative',
                minHeight: 'var(--pk-vh, 100vh)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '64px 20px 44px',
                // Clear the absolutely-positioned scroll cue below (~66px tall from the
                // bottom edge) so centred content can never sit underneath it.
                paddingBottom: 'var(--pk-cue-clear, 96px)',
                overflow: 'hidden',
                background: `radial-gradient(120% 90% at 50% 8%, ${theme.indigo}, ${theme.indigoDeep} 70%)`,
            }}
        >
            {/* faint batik wash on the backdrop */}
            <div aria-hidden="true" style={{ position: 'absolute', inset: 0, opacity: 0.16, pointerEvents: 'none' }}>
                <BatikPattern id="batik-cover-bg" stroke={theme.goldLight} />
            </div>

            {/* drifting motifs */}
            {!motionOff && (
                <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                    {motifs.map((m) => (
                        <svg
                            key={m.key}
                            width={m.size}
                            height={m.size}
                            viewBox="0 0 20 20"
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: `${m.left}%`,
                                animation: `pk-drift ${m.dur}s linear ${m.delay}s infinite`,
                                willChange: 'transform',
                            }}
                        >
                            <g fill="none" stroke={theme.goldLight} strokeWidth={1.4} opacity={0.6}>
                                <ellipse cx={10} cy={5} rx={2.4} ry={4.6} />
                                <ellipse cx={10} cy={15} rx={2.4} ry={4.6} />
                                <ellipse cx={5} cy={10} rx={4.6} ry={2.4} />
                                <ellipse cx={15} cy={10} rx={4.6} ry={2.4} />
                            </g>
                        </svg>
                    ))}
                </div>
            )}

            {/* stage */}
            <div
                style={{
                    position: 'relative',
                    zIndex: 2,
                    width: 'min(86vw, 400px)',
                    aspectRatio: '10 / 12',
                    maxHeight: '74vh',
                    perspective: 1500,
                }}
            >
                <div style={{ position: 'relative', width: '100%', height: '100%', transformStyle: 'preserve-3d' }}>
                    {/* envelope body */}
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            borderRadius: 16,
                            overflow: 'hidden',
                            background: `linear-gradient(160deg, ${theme.indigo}, ${theme.indigoDeep})`,
                            border: `1.5px solid ${theme.accent}`,
                            boxShadow: '0 30px 70px rgba(19,28,56,0.5)',
                        }}
                    >
                        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, opacity: 0.2 }}>
                            <BatikPattern id="batik-body" stroke={theme.goldLight} />
                        </div>
                        <div
                            aria-hidden="true"
                            style={{ position: 'absolute', inset: 10, borderRadius: 10, border: `1px solid ${theme.goldLight}`, opacity: 0.4 }}
                        />
                    </div>

                    {/* inner card — slides up + zooms in */}
                    <motion.div
                        style={{
                            position: 'absolute',
                            top: '11%',
                            bottom: '11%',
                            left: '8%',
                            right: '8%',
                            zIndex: 3,
                            transformOrigin: 'center',
                        }}
                        initial={motionOff ? false : { y: '26%', scale: 0.52, opacity: 0 }}
                        animate={motionOff ? undefined : { y: '-40%', scale: 1.12, opacity: 1 }}
                        transition={{ delay: 1.0, duration: 1.15, ease: EASE_OUT }}
                    >
                        {cardInner}
                    </motion.div>

                    {/* top flap — folds open on rotateX */}
                    <motion.div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: '56%',
                            zIndex: motionOff ? 1 : 4,
                            transformOrigin: 'top center',
                            transformStyle: 'preserve-3d',
                            backfaceVisibility: 'hidden',
                            clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
                            background: `linear-gradient(180deg, ${theme.indigo}, ${theme.indigoDeep})`,
                            borderTop: `1.5px solid ${theme.accent}`,
                        }}
                        initial={motionOff ? { rotateX: -175 } : { rotateX: 0 }}
                        animate={motionOff ? undefined : { rotateX: -175 }}
                        transition={{ delay: 0.5, duration: 0.95, ease: EASE_OUT }}
                    >
                        {flapFace}
                    </motion.div>
                </div>
            </div>

            {/* scroll cue */}
            <motion.div
                initial={motionOff ? false : { opacity: 0 }}
                animate={motionOff ? undefined : { opacity: 1 }}
                transition={{ duration: 1, delay: 2.1 }}
                style={{
                    position: 'absolute',
                    bottom: 24,
                    left: 0,
                    right: 0,
                    zIndex: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    color: theme.goldLight,
                }}
            >
                <span style={{ fontFamily: BODY, fontSize: 11, letterSpacing: '0.26em', textTransform: 'uppercase' }}>Skrol</span>
                <motion.div
                    animate={motionOff ? undefined : { y: [0, 9, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ willChange: 'transform' }}
                >
                    <ChevronDown size={22} />
                </motion.div>
            </motion.div>
        </section>
    );
}

// =========================================================================
//  Main template
// =========================================================================

export default function BatikTemplate({ data, preview, slots }: TemplateProps) {
    const tr = useCardText();
    const p = data.palette;
    const theme: Theme = {
        primary: p?.primary ?? '#20305a',
        secondary: p?.secondary ?? '#5d6a8a',
        accent: p?.accent ?? '#b78a2e',
        bg: p?.bg ?? '#f5efe1',
        text: p?.text ?? '#39415a',
        indigo: '#22315a',
        indigoDeep: '#131c38',
        goldLight: '#e0be6b',
        cream: '#fbf6ea',
        card: '#fffdf8',
        line: 'rgba(183,138,46,0.34)',
    };

    const reduce = useReducedMotion();
    const motionOff = !!preview || !!reduce;

    const groomShort = data.groomShort ?? data.groomName;
    const brideShort = data.brideShort ?? data.brideName;

    const countdown = useCountdown(data.receptionAt);

    // Parallax for the decorative batik band.
    const { scrollYProgress } = useScroll();
    const bandY = useTransform(scrollYProgress, [0, 1], [-50, 50]);

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
        backgroundImage: 'radial-gradient(120% 60% at 50% 0%, rgba(255,255,255,0.6), rgba(255,255,255,0) 55%)',
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

    const panelStyle: CSSProperties = {
        background: theme.card,
        border: `1px solid ${theme.line}`,
        borderRadius: 18,
        padding: '34px 24px',
        textAlign: 'center',
        boxShadow: '0 12px 30px rgba(19,28,56,0.08)',
    };

    return (
        <div style={rootStyle}>
            <style>{`
                @keyframes pk-drift {
                    0%   { transform: translateY(-14vh) rotate(0deg); opacity: 0; }
                    12%  { opacity: 0.8; }
                    100% { transform: translateY(118vh) rotate(200deg); opacity: 0; }
                }
                @media (prefers-reduced-motion: reduce) {
                    * { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; }
                }
            `}</style>

            {/* ---------------------------------------------------------- */}
            {/* 1. COVER — envelope open + zoom                             */}
            {/* ---------------------------------------------------------- */}
            <EnvelopeCover
                theme={theme}
                data={data}
                groomShort={groomShort}
                brideShort={brideShort}
                motionOff={motionOff}
            />

            {/* ---------------------------------------------------------- */}
            {/* 2. OPENING                                                  */}
            {/* ---------------------------------------------------------- */}
            {data.openingLine && (
                <Section theme={theme}>
                    <Reveal disabled={motionOff}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
                                <BatikSeal theme={theme} size={54} />
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
                            <BatikDivider theme={theme} />
                        </div>
                    </Reveal>
                </Section>
            )}

            {/* ---- decorative parallax batik band ---- */}
            <div style={{ position: 'relative', height: 130, overflow: 'hidden', background: theme.indigo }}>
                <motion.div
                    aria-hidden="true"
                    style={{ position: 'absolute', left: 0, right: 0, top: -60, bottom: -60, y: motionOff ? 0 : bandY }}
                >
                    <BatikPattern id="batik-band" stroke={theme.goldLight} opacity={0.5} />
                </motion.div>
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <BatikSeal theme={theme} size={66} />
                </div>
            </div>

            {/* ---------------------------------------------------------- */}
            {/* 3. COUPLE                                                   */}
            {/* ---------------------------------------------------------- */}
            <Section theme={theme} background="rgba(255,255,255,0.45)" patternId="batik-couple">
                <SectionHeading theme={theme} eyebrow={tr("Pasangan Bahagia")} title={tr("Pengantin")} />

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26 }}>
                    <Reveal disabled={motionOff} delay={0.05} style={{ textAlign: 'center', width: '100%' }}>
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
                            <p style={{ margin: '8px 0 0', color: theme.secondary, fontSize: 16 }}>{data.groomParents}</p>
                        )}
                    </Reveal>

                    <Reveal disabled={motionOff} delay={0.15} style={{ width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                            <svg width={56} height={16} viewBox="0 0 56 16" aria-hidden="true">
                                <line x1="0" y1="8" x2="46" y2="8" stroke={theme.accent} strokeWidth={1.2} />
                                <circle cx={52} cy={8} r={3} fill={theme.accent} />
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
                                {AMP}
                            </span>
                            <svg width={56} height={16} viewBox="0 0 56 16" aria-hidden="true">
                                <circle cx={4} cy={8} r={3} fill={theme.accent} />
                                <line x1="10" y1="8" x2="56" y2="8" stroke={theme.accent} strokeWidth={1.2} />
                            </svg>
                        </div>
                    </Reveal>

                    <Reveal disabled={motionOff} delay={0.25} style={{ textAlign: 'center', width: '100%' }}>
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
                            <p style={{ margin: '8px 0 0', color: theme.secondary, fontSize: 16 }}>{data.brideParents}</p>
                        )}
                    </Reveal>
                </div>
            </Section>

            {/* ---------------------------------------------------------- */}
            {/* 4. DATE + COUNTDOWN                                         */}
            {/* ---------------------------------------------------------- */}
            <Section theme={theme} patternId="batik-date">
                <SectionHeading
                    theme={theme}
                    eyebrow={tr("Menghitung Hari")}
                    title={tr("Kira Detik Bahagia")}
                    icon={<Calendar size={15} />}
                />

                <Reveal disabled={motionOff}>
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
                            <div style={{ marginTop: 6, color: theme.secondary, fontStyle: 'italic' }}>{data.hijriLabel}</div>
                        )}
                    </div>
                </Reveal>

                {countdown && (
                    <Reveal disabled={motionOff} delay={0.15}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 34 }}>
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
                <Section theme={theme} background="rgba(255,255,255,0.45)" patternId="batik-program">
                    <SectionHeading theme={theme} eyebrow={tr("Tertib Majlis")} title={tr("Atur Cara")} />

                    <div style={{ position: 'relative', maxWidth: 480, margin: '0 auto' }}>
                        <div
                            aria-hidden="true"
                            style={{ position: 'absolute', left: 11, top: 6, bottom: 6, width: 2, background: theme.line }}
                        />
                        {data.program.map((item: ProgramItem, i: number) => (
                            <Reveal
                                key={`${item.time}-${i}`}
                                disabled={motionOff}
                                delay={i * 0.08}
                                y={18}
                                style={{ position: 'relative', paddingLeft: 40, marginBottom: 26 }}
                            >
                                <span
                                    aria-hidden="true"
                                    style={{
                                        position: 'absolute',
                                        left: 3,
                                        top: 5,
                                        width: 18,
                                        height: 18,
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
            )}

            {/* ---------------------------------------------------------- */}
            {/* 6. LOKASI                                                   */}
            {/* ---------------------------------------------------------- */}
            {(data.venueName || data.venueAddress || data.mapsUrl || data.wazeUrl) && (
                <Section theme={theme} patternId="batik-venue">
                    <SectionHeading theme={theme} eyebrow={tr("Lokasi Majlis")} title={tr("Lokasi")} icon={<MapPin size={15} />} />
                    <Reveal disabled={motionOff}>
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
                                <p style={{ color: theme.secondary, fontSize: 17, maxWidth: 440, margin: '12px auto 0' }}>
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
                                            style={{ ...buttonBase, background: theme.accent, color: '#fff', borderColor: theme.accent }}
                                        >
                                            <MapPin size={17} />
                                            Google Maps
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
                <Section theme={theme} background="rgba(255,255,255,0.45)">
                    <SectionHeading theme={theme} eyebrow={tr("Kesahihan Kehadiran")} title={tr("RSVP Kehadiran")} />
                    <Reveal disabled={motionOff}>{slots.rsvp}</Reveal>
                </Section>
            )}

            {/* ---------------------------------------------------------- */}
            {/* 8. UCAPAN                                                   */}
            {/* ---------------------------------------------------------- */}
            <Section theme={theme}>
                <SectionHeading theme={theme} eyebrow={tr("Doa & Restu")} title={tr("Ucapan Kasih")} />
                <Reveal disabled={motionOff}>
                    {slots?.wishes ?? (
                        <div style={panelStyle}>
                            <p style={{ margin: 0, color: theme.secondary, fontSize: 17 }}>Ruangan ucapan akan dipaparkan di sini.</p>
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
                <Section theme={theme}>
                    <SectionHeading theme={theme} eyebrow={tr("Tanda Ingatan")} title={tr("Senarai Hadiah")} />
                    <Reveal disabled={motionOff}>{slots.wishlist}</Reveal>
                </Section>
            )}

            {/* ---------------------------------------------------------- */}
            {/* 9. HUBUNGI                                                  */}
            {/* ---------------------------------------------------------- */}
            {data.contacts && data.contacts.length > 0 && (
                <Section theme={theme} background="rgba(255,255,255,0.45)" patternId="batik-contact">
                    <SectionHeading theme={theme} eyebrow={tr("Sebarang Pertanyaan")} title={tr("Hubungi")} icon={<Phone size={15} />} />
                    <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                        {data.contacts.map((c: Contact, i: number) => (
                            <Reveal key={`${c.phone}-${i}`} disabled={motionOff} delay={i * 0.08}>
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
                                        boxShadow: '0 8px 20px rgba(19,28,56,0.06)',
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
                                            <span style={{ display: 'block', fontSize: 13, color: theme.secondary }}>{c.role}</span>
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
                <Section theme={theme} patternId="batik-gift">
                    <SectionHeading theme={theme} eyebrow={tr("Tanda Kasih")} title={tr("Salam Kaut")} icon={<Gift size={15} />} />
                    <Reveal disabled={motionOff}>
                        <div
                            style={{
                                maxWidth: 420,
                                margin: '0 auto',
                                background: theme.card,
                                border: `1px solid ${theme.line}`,
                                borderRadius: 20,
                                padding: '30px 26px',
                                textAlign: 'center',
                                boxShadow: '0 14px 34px rgba(19,28,56,0.10)',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                                <span
                                    style={{
                                        width: 54,
                                        height: 54,
                                        borderRadius: '50%',
                                        background: 'rgba(183,138,46,0.14)',
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
                                <div style={{ fontFamily: SERIF, fontSize: 26, color: theme.primary }}>{data.gift.bankName}</div>
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
                                            background: copied ? theme.primary : theme.accent,
                                            color: '#fff',
                                            borderColor: copied ? theme.primary : theme.accent,
                                        }}
                                    >
                                        {copied ? <Check size={16} /> : <Copy size={16} />}
                                        {copied ? 'Telah disalin' : 'Salin nombor'}
                                    </button>
                                </div>
                            )}
                            {data.gift.note && (
                                <p style={{ marginTop: 18, color: theme.secondary, fontStyle: 'italic', fontSize: 15 }}>
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
            <Section theme={theme} background="rgba(255,255,255,0.45)" patternId="batik-gallery">
                <SectionHeading theme={theme} eyebrow={tr("Kenangan")} title={tr("Galeri Memori")} icon={<ImageIcon size={15} />} />
                <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                    {data.galleryImages && data.galleryImages.length > 0
                        ? data.galleryImages.map((src, i) => (
                              <Reveal key={`${src}-${i}`} disabled={motionOff} delay={i * 0.06}>
                                  <div
                                      style={{
                                          borderRadius: 14,
                                          overflow: 'hidden',
                                          border: `1px solid ${theme.line}`,
                                          boxShadow: '0 10px 24px rgba(19,28,56,0.08)',
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
                              <Reveal key={`ph-${i}`} disabled={motionOff} delay={i * 0.08}>
                                  <div
                                      style={{
                                          position: 'relative',
                                          borderRadius: 14,
                                          border: `1px solid ${theme.line}`,
                                          aspectRatio: '3 / 4',
                                          background: 'rgba(183,138,46,0.06)',
                                          overflow: 'hidden',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          gap: 12,
                                      }}
                                  >
                                      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, opacity: 0.12 }}>
                                          <BatikPattern id={`batik-ph-${i}`} stroke={theme.accent} />
                                      </div>
                                      <div style={{ position: 'relative', zIndex: 1 }}>
                                          <BatikSeal theme={theme} size={48} />
                                      </div>
                                      <span
                                          style={{
                                              position: 'relative',
                                              zIndex: 1,
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
                    padding: 'clamp(64px, 12vw, 118px) 20px 50px',
                    overflow: 'hidden',
                    background: `linear-gradient(180deg, ${theme.indigo}, ${theme.indigoDeep})`,
                    color: theme.cream,
                }}
            >
                <div aria-hidden="true" style={{ position: 'absolute', inset: 0, opacity: 0.18, pointerEvents: 'none' }}>
                    <BatikPattern id="batik-footer" stroke={theme.goldLight} />
                </div>
                <Reveal disabled={motionOff} style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
                        <BatikSeal theme={theme} size={80} />
                    </div>
                    <div
                        style={{
                            fontFamily: SERIF,
                            fontSize: 'clamp(30px, 7.5vw, 44px)',
                            fontWeight: 600,
                            color: theme.cream,
                            lineHeight: 1.2,
                        }}
                    >
                        {groomShort}
                        <span style={{ color: theme.goldLight, fontStyle: 'italic', margin: '0 12px' }}>{AMP}</span>
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
                            color: theme.goldLight,
                        }}
                    >
                        Terima Kasih
                        <Heart size={20} color={theme.goldLight} fill={theme.goldLight} />
                    </div>
                    <BatikDivider theme={theme} />
                    <div
                        style={{
                            marginTop: 22,
                            fontFamily: BODY,
                            fontSize: 12,
                            letterSpacing: '0.24em',
                            textTransform: 'uppercase',
                            color: theme.cream,
                            opacity: 0.7,
                        }}
                    >
                        Dibina dengan
                        <Heart
                            size={12}
                            color={theme.goldLight}
                            fill={theme.goldLight}
                            style={{ display: 'inline', verticalAlign: 'middle', margin: '0 5px' }}
                        />
                        PortalKahwin
                    </div>
                </Reveal>
            </footer>
        </div>
    );
}
