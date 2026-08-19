// ============================================================
// Marble / "Marmar Mewah" quiet-luxury wedding e-invitation.
// White marble + gold foil. Self-contained: all ornaments are
// original inline SVG / CSS. No external images, fonts, CDNs
// or network requests.
// ============================================================

import { useEffect, useState } from 'react';import type { CSSProperties, ReactNode } from 'react';
import { PkSec } from '../PkSec';
import { PrayerSection } from '../../components/PrayerSection';
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
const MOTION = REVEAL_TIMING[TEMPLATE_ART['marble'].reveal];


// ---------- typography ---------------------------------------------------
const SERIF = "'Cormorant Garamond', 'EB Garamond', 'Playfair Display', Georgia, 'Times New Roman', serif";
const NAMES = "var(--pk-name, 'Cormorant Garamond'), 'EB Garamond', 'Playfair Display', Georgia, 'Times New Roman', serif";
const BODY = "'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', sans-serif";
const ARABIC = "'Traditional Arabic', 'Scheherazade New', 'Amiri', 'Noto Naskh Arabic', serif";

// ---------- marble surface (static, layered CSS gradients) ---------------
const MARBLE_BG =
    'radial-gradient(120% 80% at 18% 12%, rgba(255,255,255,0.95), rgba(255,255,255,0) 42%),' +
    'radial-gradient(110% 90% at 82% 24%, rgba(233,231,227,0.85), rgba(233,231,227,0) 48%),' +
    'radial-gradient(95% 80% at 62% 90%, rgba(222,220,215,0.72), rgba(222,220,215,0) 52%),' +
    'linear-gradient(135deg, #f7f6f4 0%, #edece9 52%, #f4f3f1 100%)';

// subtle marble tint used to alternate section panels
const PANEL_BG = 'linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,255,255,0.12))';

// ---------- theme --------------------------------------------------------
interface Theme {
    primary: string;
    secondary: string;
    accent: string;
    bg: string;
    text: string;
    gold: string;
    goldDeep: string;
    veinGrey: string;
    card: string;
    line: string;
}

// =========================================================================
//  Small original SVG ornaments
// =========================================================================

/** Thin gold corner bracket with a tiny diamond — quiet, hairline. */
function CornerBracket({ theme }: { theme: Theme }) {
    return (
        <svg width={84} height={84} viewBox="0 0 84 84" aria-hidden="true" style={{ display: 'block' }}>
            <path d="M14 14 L14 62" stroke={theme.gold} strokeWidth={1} fill="none" strokeLinecap="round" />
            <path d="M14 14 L62 14" stroke={theme.gold} strokeWidth={1} fill="none" strokeLinecap="round" />
            <rect x={10} y={10} width={8} height={8} transform="rotate(45 14 14)" fill="none" stroke={theme.gold} strokeWidth={1} />
        </svg>
    );
}

/** Concentric hairline gold ring with four diamond ticks — the monogram frame. */
function MonogramRing({ theme }: { theme: Theme }) {
    return (
        <svg
            width="100%"
            height="100%"
            viewBox="0 0 200 200"
            aria-hidden="true"
            style={{ display: 'block', overflow: 'visible' }}
        >
            <circle cx={100} cy={100} r={86} fill="none" stroke={theme.gold} strokeWidth={1} />
            <circle cx={100} cy={100} r={73} fill="none" stroke={theme.gold} strokeWidth={0.6} opacity={0.5} />
            {[0, 90, 180, 270].map((deg) => (
                <g key={deg} transform={`rotate(${deg} 100 100)`}>
                    <rect x={96} y={10} width={8} height={8} transform="rotate(45 100 14)" fill={theme.gold} />
                </g>
            ))}
        </svg>
    );
}

/**
 * Gold monogram — the rotating hairline ring plus static couple initials.
 * The ring may spin very slowly (transform only); the initials never move.
 */
function Monogram({
    theme,
    g0,
    b0,
    boxSize,
    fontSize,
    spin,
}: {
    theme: Theme;
    g0: string;
    b0: string;
    boxSize: number | string;
    fontSize: number | string;
    spin: boolean;
}) {
    return (
        <div style={{ position: 'relative', width: boxSize, height: boxSize, margin: '0 auto' }}>
            <motion.div
                style={{ position: 'absolute', inset: 0, willChange: spin ? 'transform' : undefined }}
                animate={spin ? { rotate: 360 } : undefined}
                transition={spin ? { duration: 90, ease: 'linear', repeat: Infinity } : undefined}
            >
                <MonogramRing theme={theme} />
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
                <span
                    style={{
                        fontFamily: SERIF,
                        display: 'inline-flex',
                        alignItems: 'baseline',
                        gap: '0.14em',
                        color: theme.primary,
                        fontSize,
                        fontWeight: 400,
                        letterSpacing: '0.03em',
                        lineHeight: 1,
                    }}
                >
                    <span>{g0}</span>
                    <span style={{ color: theme.gold, fontStyle: 'italic', fontSize: '0.66em' }}>&amp;</span>
                    <span>{b0}</span>
                </span>
            </div>
        </div>
    );
}

/** A small gold ornament — diamond within a hairline ring (for placeholders). */
function GoldOrnament({ theme, size = 60 }: { theme: Theme; size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 60 60" aria-hidden="true" style={{ display: 'block' }}>
            <circle cx={30} cy={30} r={22} fill="none" stroke={theme.gold} strokeWidth={1} />
            <rect x={22} y={22} width={16} height={16} transform="rotate(45 30 30)" fill="none" stroke={theme.gold} strokeWidth={0.8} opacity={0.7} />
            <rect x={26.5} y={26.5} width={7} height={7} transform="rotate(45 30 30)" fill={theme.gold} />
        </svg>
    );
}

/** Divider: a slim gold line broken by a tiny centre diamond. */
function Divider({ theme }: { theme: Theme }) {
    return (
        <svg
            width={200}
            height={16}
            viewBox="0 0 200 16"
            aria-hidden="true"
            style={{ display: 'block', margin: '18px auto 0' }}
        >
            <line x1="28" y1="8" x2="90" y2="8" stroke={theme.gold} strokeWidth={1} />
            <line x1="110" y1="8" x2="172" y2="8" stroke={theme.gold} strokeWidth={1} />
            <rect x="96" y="4" width="8" height="8" transform="rotate(45 100 8)" fill={theme.gold} />
        </svg>
    );
}

/** Static marble veins drawn as thin curved paths (grey + a whisper of gold). */
function MarbleVeins({ theme }: { theme: Theme }) {
    return (
        <svg
            aria-hidden="true"
            viewBox="0 0 400 760"
            preserveAspectRatio="none"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}
        >
            <path d="M-10 92 C 100 40, 224 158, 412 74" fill="none" stroke={theme.veinGrey} strokeWidth={1.4} />
            <path d="M-10 300 C 118 250, 262 360, 412 282" fill="none" stroke={theme.veinGrey} strokeWidth={0.9} />
            <path d="M-10 522 C 108 470, 282 592, 412 512" fill="none" stroke={theme.veinGrey} strokeWidth={1.6} />
            <path d="M-10 692 C 140 640, 300 742, 412 682" fill="none" stroke={theme.gold} strokeWidth={0.7} opacity={0.32} />
        </svg>
    );
}

/**
 * Signature gold-vein shimmer — a few thin gold gradient veins whose opacity
 * gently pulses. GPU-cheap: animates opacity only. Three elements.
 */
function GoldShimmer({ theme }: { theme: Theme }) {
    const veins = [
        { d: 'M-20 130 C 120 60, 260 220, 440 150', dur: 6.5, delay: 0 },
        { d: 'M-20 370 C 140 306, 300 448, 440 384', dur: 8, delay: 1.4 },
        { d: 'M-20 620 C 118 560, 300 700, 440 636', dur: 9, delay: 2.4 },
    ];
    return (
        <svg
            aria-hidden="true"
            viewBox="0 0 400 760"
            preserveAspectRatio="none"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}
        >
            <defs>
                <linearGradient id="pk-gold-vein" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={theme.gold} stopOpacity="0" />
                    <stop offset="50%" stopColor={theme.gold} stopOpacity="1" />
                    <stop offset="100%" stopColor={theme.gold} stopOpacity="0" />
                </linearGradient>
            </defs>
            {veins.map((v, i) => (
                <path
                    key={i}
                    d={v.d}
                    fill="none"
                    stroke="url(#pk-gold-vein)"
                    strokeWidth={1.2}
                    style={{ animation: `pk-shimmer ${v.dur}s ease-in-out ${v.delay}s infinite`, willChange: 'opacity' }}
                />
            ))}
        </svg>
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
    const reduce = useReducedMotion() ?? false;
    if (preview || reduce) {
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
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
            {eyebrow && (
                <div
                    style={{
                        fontFamily: BODY,
                        fontSize: 13,
                        letterSpacing: '0.34em',
                        textTransform: 'uppercase',
                        color: theme.gold,
                        marginBottom: 12,
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
                    fontSize: 'clamp(32px, 6.4vw, 48px)',
                    fontWeight: 400,
                    letterSpacing: '0.02em',
                    color: theme.primary,
                    margin: 0,
                    lineHeight: 1.12,
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
                padding: '18px 12px',
                borderRadius: 4,
                background: theme.card,
                border: `1px solid ${theme.line}`,
                boxShadow: '0 8px 24px rgba(43,42,40,0.05)',
                textAlign: 'center',
            }}
        >
            <div
                style={{
                    fontFamily: SERIF,
                    fontSize: 'clamp(28px, 7vw, 40px)',
                    fontWeight: 400,
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
                    letterSpacing: '0.2em',
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
                padding: 'clamp(64px, 12vw, 128px) 20px',
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

export default function MarbleTemplate({ data, preview, slots }: TemplateProps) {
    const tr = useCardText();
    const reduce = useReducedMotion() ?? false;
    const staticMode = Boolean(preview) || reduce;
    const p = data.palette;
    const theme: Theme = {
        primary: p?.primary ?? '#2b2a28',
        secondary: p?.secondary ?? '#8a877f',
        accent: p?.accent ?? '#b89a5e',
        bg: p?.bg ?? '#f5f4f2',
        text: p?.text ?? '#33312e',
        gold: p?.accent ?? '#b89a5e',
        goldDeep: '#8f7642',
        veinGrey: 'rgba(92,90,84,0.18)',
        card: 'linear-gradient(155deg, #ffffff 0%, #f6f5f2 100%)',
        line: 'rgba(184,154,94,0.38)',
    };

    const groomShort = data.groomShort ?? data.groomName;
    const brideShort = data.brideShort ?? data.brideName;
    const g0 = (groomShort ?? '').trim().charAt(0).toUpperCase();
    const b0 = (brideShort ?? '').trim().charAt(0).toUpperCase();

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
        backgroundImage:
            groundPattern('diamond', theme.accent, 0.045) + ',' +
            'radial-gradient(100% 50% at 50% 0%, rgba(255,255,255,0.6), rgba(255,255,255,0) 55%),' +
            'radial-gradient(80% 40% at 50% 100%, rgba(255,255,255,0.4), rgba(255,255,255,0) 55%)',
        WebkitFontSmoothing: 'antialiased',
        overflowX: 'hidden',
    };

    const buttonBase: CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: '13px 24px',
        borderRadius: 999,
        fontFamily: BODY,
        fontSize: 15,
        fontWeight: 600,
        letterSpacing: '0.04em',
        textDecoration: 'none',
        cursor: 'pointer',
        border: `1px solid ${theme.gold}`,
        transition: 'transform 0.15s ease',
    };

    const monoSize = 'min(46vw, 200px)';

    return (
        <div style={rootStyle}>
            <style>{`
                @keyframes pk-shimmer {
                    0%, 100% { opacity: 0.12; }
                    50%      { opacity: 0.5; }
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
                    padding: '72px 20px 48px',
                    // Clear the absolutely-positioned scroll cue below (~66px tall from the
                    // bottom edge) so centred content can never sit underneath it.
                    paddingBottom: 'var(--pk-cue-clear, 96px)',
                    overflow: 'hidden',
                    background: MARBLE_BG,
                }}
            >
                <MarbleVeins theme={theme} />
                {!staticMode && <GoldShimmer theme={theme} />}

                <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 1, opacity: 0.7 }}>
                    <CornerBracket theme={theme} />
                </div>
                <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 1, opacity: 0.7, transform: 'scaleX(-1)' }}>
                    <CornerBracket theme={theme} />
                </div>

                <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 560 }}>
                    {data.bismillah && (
                        <motion.div
                            initial={staticMode ? false : { opacity: 0, y: -12 }}
                            animate={staticMode ? undefined : { opacity: 1, y: 0 }}
                            transition={{ duration: 1.2, delay: 0.2, ease: 'easeOut' }}
                            style={{ direction: bismillahCustom ? undefined : 'rtl', marginBottom: 34 }}
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

                    <motion.div
                        initial={staticMode ? false : { opacity: 0, scale: 0.9 }}
                        animate={staticMode ? undefined : { opacity: 1, scale: 1 }}
                        transition={{ duration: 1.4, ease: 'easeOut' }}
                        style={{ width: monoSize, height: monoSize, margin: '0 auto' }}
                    >
                        <Monogram
                            theme={theme}
                            g0={g0}
                            b0={b0}
                            boxSize="100%"
                            fontSize="clamp(30px, 8vw, 46px)"
                            spin={!staticMode}
                        />
                    </motion.div>

                    <motion.div
                        initial={staticMode ? false : { opacity: 0, y: 18 }}
                        animate={staticMode ? undefined : { opacity: 1, y: 0 }}
                        transition={{ duration: 1, delay: 0.5, ease: 'easeOut' }}
                        style={{ marginTop: 40 }}
                    >
                        <div
                            style={{
                                fontFamily: BODY,
                                fontSize: 12,
                                letterSpacing: '0.34em',
                                textTransform: 'uppercase',
                                color: theme.secondary,
                                marginBottom: 14,
                            }}
                        >
                            Raikan Cinta
                        </div>
                        <div
                            style={{
                                fontFamily: NAMES,
                                fontSize: 'clamp(32px, 8vw, 50px)',
                                fontWeight: 400,
                                letterSpacing: '0.03em',
                                color: theme.primary,
                                lineHeight: 1.12,
                            }}
                        >
                            {firstShort}
                        </div>
                        <div
                            style={{
                                fontFamily: SERIF,
                                fontStyle: 'italic',
                                fontSize: 'clamp(22px, 5vw, 30px)',
                                color: theme.gold,
                                margin: '4px 0',
                            }}
                        >
                            &amp;
                        </div>
                        <div
                            style={{
                                fontFamily: NAMES,
                                fontSize: 'clamp(32px, 8vw, 50px)',
                                fontWeight: 400,
                                letterSpacing: '0.03em',
                                color: theme.primary,
                                lineHeight: 1.12,
                            }}
                        >
                            {secondShort}
                        </div>
                        {/* a single hairline gold rule */}
                        <div
                            aria-hidden="true"
                            style={{ width: 72, height: 1, background: theme.gold, margin: '24px auto 0', opacity: 0.8 }}
                        />
                    </motion.div>

                    <motion.div
                        initial={staticMode ? false : { opacity: 0, y: 14 }}
                        animate={staticMode ? undefined : { opacity: 1, y: 0 }}
                        transition={{ duration: 1, delay: 0.9, ease: 'easeOut' }}
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
                                    marginTop: 10,
                                }}
                            >
                                {data.dateLabel}
                            </div>
                        )}
                    </motion.div>
                </div>

                {/* scroll cue */}
                <motion.div
                    initial={staticMode ? false : { opacity: 0 }}
                    animate={staticMode ? undefined : { opacity: 1 }}
                    transition={{ duration: 1, delay: 1.4 }}
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
                        animate={staticMode ? undefined : { y: [0, 8, 0] }}
                        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
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
                                <Heart size={22} color={theme.gold} />
                            </div>
                            <p
                                style={{
                                    fontFamily: SERIF,
                                    fontSize: 'clamp(21px, 4.4vw, 30px)',
                                    fontWeight: 400,
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
            <Section background={PANEL_BG}>
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
                                fontWeight: 400,
                                letterSpacing: '0.02em',
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
                            <svg width={56} height={16} viewBox="0 0 56 16" aria-hidden="true">
                                <line x1="0" y1="8" x2="42" y2="8" stroke={theme.gold} strokeWidth={1} />
                                <rect x="46" y="4" width="8" height="8" transform="rotate(45 50 8)" fill={theme.gold} />
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
                            <svg width={56} height={16} viewBox="0 0 56 16" aria-hidden="true">
                                <rect x="2" y="4" width="8" height="8" transform="rotate(45 6 8)" fill={theme.gold} />
                                <line x1="14" y1="8" x2="56" y2="8" stroke={theme.gold} strokeWidth={1} />
                            </svg>
                        </div>
                    </Reveal>

                    <Reveal preview={preview} delay={0.25} style={{ textAlign: 'center', width: '100%' }}>
                        <h3
                            style={{
                                fontFamily: NAMES,
                                fontSize: 'clamp(30px, 7vw, 48px)',
                                fontWeight: 400,
                                letterSpacing: '0.02em',
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

            <PrayerSection text={data.prayer} primary={theme.primary} accent={theme.gold} secondary={theme.secondary} serif={SERIF} />

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
                                <Calendar size={20} color={theme.gold} />
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
                                <Clock size={17} color={theme.gold} />
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
                <Section background={PANEL_BG}>
                    <SectionHeading theme={theme} eyebrow={tr("Rentak Majlis")} title={tr("Atur Cara")} />

                    <div style={{ position: 'relative', maxWidth: 480, margin: '0 auto' }}>
                        <div
                            aria-hidden="true"
                            style={{
                                position: 'absolute',
                                left: 11,
                                top: 6,
                                bottom: 6,
                                width: 1,
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
                                        top: 8,
                                        width: 14,
                                        height: 14,
                                        background: theme.gold,
                                        border: `2px solid ${theme.bg}`,
                                        boxShadow: `0 0 0 1px ${theme.gold}`,
                                        transform: 'rotate(45deg)',
                                    }}
                                />
                                <div
                                    style={{
                                        fontFamily: BODY,
                                        fontSize: 13,
                                        letterSpacing: '0.14em',
                                        textTransform: 'uppercase',
                                        color: theme.gold,
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
                                        fontWeight: 400,
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
                                            background: theme.gold,
                                            color: '#fff',
                                            borderColor: theme.gold,
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
                <Section background={PANEL_BG}>
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
                                borderRadius: 6,
                                padding: '34px 24px',
                                textAlign: 'center',
                                boxShadow: '0 12px 30px rgba(43,42,40,0.05)',
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
                <Section background={PANEL_BG}>
                    <SectionHeading theme={theme} eyebrow={tr("Tanda Ingatan")} title={tr("Senarai Hadiah")} />
                    <Reveal preview={preview}>{slots.wishlist}</Reveal>
                </Section>
            )}</PkSec>

            {/* ---------------------------------------------------------- */}
            {/* 9. HUBUNGI                                                  */}
            {/* ---------------------------------------------------------- */}
            <PkSec name="contacts">{data.contacts && data.contacts.length > 0 && (
                <Section background={PANEL_BG}>
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
                                        borderRadius: 6,
                                        background: theme.card,
                                        border: `1px solid ${theme.line}`,
                                        textDecoration: 'none',
                                        color: theme.text,
                                        boxShadow: '0 8px 20px rgba(43,42,40,0.04)',
                                    }}
                                >
                                    <span
                                        style={{
                                            flex: '0 0 auto',
                                            width: 44,
                                            height: 44,
                                            borderRadius: '50%',
                                            background: theme.gold,
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
                                                fontSize: 22,
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
                                borderRadius: 8,
                                padding: '30px 26px',
                                textAlign: 'center',
                                boxShadow: '0 14px 34px rgba(43,42,40,0.06)',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                                <span
                                    style={{
                                        width: 54,
                                        height: 54,
                                        borderRadius: '50%',
                                        background: 'rgba(184,154,94,0.14)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: theme.gold,
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
                                            background: copied ? theme.goldDeep : theme.gold,
                                            color: '#fff',
                                            borderColor: copied ? theme.goldDeep : theme.gold,
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
            <PkSec name="gallery"><Section background={PANEL_BG}>
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
                                          borderRadius: 6,
                                          overflow: 'hidden',
                                          border: `1px solid ${theme.line}`,
                                          boxShadow: '0 10px 24px rgba(43,42,40,0.06)',
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
                                          borderRadius: 6,
                                          border: `1px solid ${theme.line}`,
                                          aspectRatio: '3 / 4',
                                          background: 'rgba(184,154,94,0.05)',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          gap: 12,
                                          color: theme.gold,
                                      }}
                                  >
                                      <GoldOrnament theme={theme} />
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
                    padding: 'clamp(64px, 12vw, 118px) 20px 48px',
                    overflow: 'hidden',
                }}
            >
                <Reveal preview={preview}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
                        <Monogram
                            theme={theme}
                            g0={g0}
                            b0={b0}
                            boxSize={120}
                            fontSize="clamp(24px, 6vw, 32px)"
                            spin={false}
                        />
                    </div>
                    <div
                        style={{
                            fontFamily: NAMES,
                            fontSize: 'clamp(28px, 7vw, 42px)',
                            fontWeight: 400,
                            letterSpacing: '0.02em',
                            color: theme.primary,
                            lineHeight: 1.2,
                        }}
                    >
                        {firstShort}
                        <span style={{ color: theme.gold, fontStyle: 'italic', margin: '0 12px' }}>&amp;</span>
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
                        <Heart size={20} color={theme.gold} fill={theme.gold} />
                    </div>
                    <Divider theme={theme} />
                </Reveal>
            </footer>
        </div>
    );
}
