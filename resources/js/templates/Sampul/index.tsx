// ============================================================
// Sampul (Sampul Diraja) — an elegant envelope wedding e-invite.
// Signature: a closed cream envelope with an antique-gold wax
// seal. Click to break the seal, open the flap and let the
// invitation card slide out and zoom to fullscreen.
// Category: modern. Self-contained: React + framer-motion v13 +
// lucide-react only. All visuals are original inline SVG / CSS.
// No external images, fonts, CDNs or network calls.
// ============================================================

import {
    useEffect,
    useId,
    useMemo,
    useState,
    type CSSProperties,
    type ReactNode,
} from 'react';
import { PkSec } from '../PkSec';
import { BrandLogo } from '../../components/BrandLogo';
import { motion, useReducedMotion } from 'framer-motion';
import {
    Mail,
    ChevronDown,
    Heart,
    Calendar,
    Clock,
    MapPin,
    Navigation,
    Phone,
    Copy,
    Check,
    Gift,
    Image as ImageIcon,
} from 'lucide-react';

import type { TemplateProps, ProgramItem, Contact } from '../types';
import { useCardText } from '../cardText';

// ---------- typography ---------------------------------------------------
const SERIF = "'Cormorant Garamond', 'Playfair Display', Georgia, 'Times New Roman', serif";
const NAMES = "var(--pk-name, 'Cormorant Garamond'), 'Playfair Display', Georgia, 'Times New Roman', serif";
const BODY = "'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', sans-serif";
const ARABIC = "'Traditional Arabic', 'Scheherazade New', 'Amiri', 'Noto Naskh Arabic', serif";

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];
const EASE_FLAP: [number, number, number, number] = [0.65, 0, 0.35, 1];

// ---------- theme --------------------------------------------------------
interface Theme {
    primary: string;
    secondary: string;
    accent: string;
    bg: string;
    text: string;
    gold: string;
    goldDeep: string;
    goldSoft: string;
    cream: string;
    creamDeep: string;
    card: string;
    line: string;
}

// =========================================================================
//  Small original SVG ornaments (all drawn by hand, no assets)
// =========================================================================

/** Deterministic irregular "pressed wax" outline. */
function waxBlob(cx: number, cy: number, r: number, points: number): string {
    let d = '';
    for (let i = 0; i < points; i += 1) {
        const a = (i / points) * Math.PI * 2;
        const wobble = 1 + 0.05 * Math.sin(i * 2.3) + (i % 2 ? 0.035 : -0.02);
        const rr = r * wobble;
        const x = cx + Math.cos(a) * rr;
        const y = cy + Math.sin(a) * rr;
        d += `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)} `;
    }
    return `${d}Z`;
}

/** Antique-gold wax seal stamped with the couple's initials. */
function WaxSeal({
    uid,
    theme,
    initials,
    size = 116,
}: {
    uid: string;
    theme: Theme;
    initials: string;
    size?: number | string;
}) {
    const edge = useMemo(() => waxBlob(50, 50, 42, 22), []);
    return (
        <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Cap lilin emas">
            <defs>
                <radialGradient id={`${uid}-seal`} cx="40%" cy="34%" r="78%">
                    <stop offset="0%" stopColor={theme.goldSoft} />
                    <stop offset="52%" stopColor={theme.gold} />
                    <stop offset="100%" stopColor={theme.goldDeep} />
                </radialGradient>
            </defs>
            <path
                d={edge}
                fill={`url(#${uid}-seal)`}
                stroke={theme.goldDeep}
                strokeWidth={0.8}
                strokeLinejoin="round"
            />
            <circle cx="50" cy="50" r="34" fill="none" stroke={theme.goldSoft} strokeWidth={1.4} opacity={0.75} />
            <circle cx="50" cy="50" r="30" fill="none" stroke={theme.goldDeep} strokeWidth={0.8} opacity={0.5} />
            <text
                x="50"
                y="58"
                textAnchor="middle"
                fontFamily={SERIF}
                fontSize="24"
                fontWeight={600}
                fill={theme.goldDeep}
            >
                {initials}
            </text>
            {/* soft top highlight */}
            <ellipse cx="40" cy="34" rx="16" ry="9" fill="#fff" opacity={0.18} />
        </svg>
    );
}

/** Corner filigree for framed cards. */
function CornerFlourish({ color }: { color: string }) {
    return (
        <svg width={62} height={62} viewBox="0 0 62 62" aria-hidden="true" style={{ display: 'block' }}>
            <path d="M3 3 C 3 26 10 40 34 40" fill="none" stroke={color} strokeWidth={1.4} strokeLinecap="round" />
            <path d="M3 3 C 26 3 40 10 40 34" fill="none" stroke={color} strokeWidth={1.4} strokeLinecap="round" />
            <path d="M3 3 C 3 16 6 24 18 24" fill="none" stroke={color} strokeWidth={1} strokeLinecap="round" opacity={0.6} />
            <path d="M3 3 C 16 3 24 6 24 18" fill="none" stroke={color} strokeWidth={1} strokeLinecap="round" opacity={0.6} />
            <circle cx={40} cy={34} r={2} fill={color} />
            <circle cx={34} cy={40} r={2} fill={color} />
        </svg>
    );
}

/** Gold divider: hairlines flanking a centre lozenge. */
function Divider({ theme }: { theme: Theme }) {
    return (
        <svg
            width={210}
            height={22}
            viewBox="0 0 210 22"
            aria-hidden="true"
            style={{ display: 'block', margin: '16px auto 0' }}
        >
            <line x1="26" y1="11" x2="90" y2="11" stroke={theme.accent} strokeWidth={1} />
            <line x1="120" y1="11" x2="184" y2="11" stroke={theme.accent} strokeWidth={1} />
            <g transform="translate(105 11)">
                <rect x="-5" y="-5" width="10" height="10" transform="rotate(45)" fill="none" stroke={theme.accent} strokeWidth={1} />
                <circle r="1.8" fill={theme.accent} />
            </g>
            <circle cx="20" cy="11" r="1.6" fill={theme.accent} />
            <circle cx="190" cy="11" r="1.6" fill={theme.accent} />
        </svg>
    );
}

/** A thin double-rule framed card with gold corner flourishes. */
function FramedCard({
    theme,
    children,
    style,
}: {
    theme: Theme;
    children: ReactNode;
    style?: CSSProperties;
}) {
    return (
        <div
            style={{
                position: 'relative',
                background: theme.card,
                border: `1px solid ${theme.line}`,
                boxShadow: `0 20px 50px -24px rgba(74,54,38,0.45), inset 0 0 0 4px ${theme.cream}`,
                borderRadius: 6,
                ...style,
            }}
        >
            <span style={{ position: 'absolute', top: 8, left: 8, opacity: 0.85 }}>
                <CornerFlourish color={theme.accent} />
            </span>
            <span style={{ position: 'absolute', top: 8, right: 8, opacity: 0.85, transform: 'scaleX(-1)' }}>
                <CornerFlourish color={theme.accent} />
            </span>
            <span style={{ position: 'absolute', bottom: 8, left: 8, opacity: 0.85, transform: 'scaleY(-1)' }}>
                <CornerFlourish color={theme.accent} />
            </span>
            <span style={{ position: 'absolute', bottom: 8, right: 8, opacity: 0.85, transform: 'scale(-1,-1)' }}>
                <CornerFlourish color={theme.accent} />
            </span>
            {children}
        </div>
    );
}

/** Signature: a few drifting gold shimmer sparkles (cover flourish).
 *  GPU-cheap — each sparkle twinkles via transform + opacity only. Capped
 *  at 12 elements and disabled under preview / reduced-motion by the caller. */
function GoldSparkles({ color }: { color: string }) {
    const stars = useMemo(
        () =>
            Array.from({ length: 12 }, (_, i) => ({
                key: i,
                left: (i * 8.5 + 4) % 100,
                top: (i * 13 + 6) % 92,
                delay: (i % 6) * 0.9,
                dur: 3.4 + (i % 5) * 0.8,
                size: 6 + (i % 3) * 5,
            })),
        [],
    );
    return (
        <div
            aria-hidden="true"
            style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}
        >
            {stars.map((s) => (
                <svg
                    key={s.key}
                    width={s.size}
                    height={s.size}
                    viewBox="0 0 20 20"
                    style={{
                        position: 'absolute',
                        left: `${s.left}%`,
                        top: `${s.top}%`,
                        animation: `pk-sm-sparkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
                        willChange: 'transform, opacity',
                    }}
                >
                    <path
                        d="M10 0 C 11 6 14 9 20 10 C 14 11 11 14 10 20 C 9 14 6 11 0 10 C 6 9 9 6 10 0 Z"
                        fill={color}
                    />
                </svg>
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
    y = 26,
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
            transition={{ duration: 0.7, delay, ease: EASE_OUT }}
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
                        fontSize: 12,
                        letterSpacing: '0.34em',
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
                padding: 'clamp(60px, 11vw, 118px) 20px',
                background,
                ...style,
            }}
        >
            <div style={{ maxWidth: 720, margin: '0 auto', position: 'relative', zIndex: 1 }}>{children}</div>
        </section>
    );
}

// =========================================================================
//  Countdown (live, guarded, with interval cleanup)
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
                minWidth: 70,
                padding: '16px 10px',
                borderRadius: 12,
                background: theme.card,
                border: `1px solid ${theme.line}`,
                boxShadow: '0 8px 24px rgba(74,54,38,0.10)',
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

export default function SampulTemplate({ data, preview, slots }: TemplateProps) {
    const tr = useCardText();
    const uid = useId().replace(/:/g, '');
    const reduce = useReducedMotion() ?? false;

    const p = data.palette;
    const theme: Theme = {
        primary: p?.primary ?? '#4b3626',
        secondary: p?.secondary ?? '#8a725a',
        accent: p?.accent ?? '#b8912e',
        bg: p?.bg ?? '#f5ecdb',
        text: p?.text ?? '#4a3b2f',
        gold: p?.accent ?? '#b8912e',
        goldDeep: '#836215',
        goldSoft: '#e8ca79',
        cream: '#fbf5ea',
        creamDeep: '#efe2cb',
        card: '#fdf8ef',
        line: 'rgba(184,145,46,0.36)',
    };

    const groomShort = data.groomShort ?? data.groomName;
    const brideShort = data.brideShort ?? data.brideName;
    const gInit = (groomShort || 'G').trim().charAt(0).toUpperCase();
    const bInit = (brideShort || 'B').trim().charAt(0).toUpperCase();
    const initials = `${gInit}&${bInit}`;

    // Envelope open state. In preview we start already opened so
    // thumbnails render the full card.
    const [opened, setOpened] = useState<boolean>(!!preview);
    const [envGone, setEnvGone] = useState<boolean>(!!preview);

    const openEnvelope = () => {
        if (opened) return;
        setOpened(true);
        if (reduce) {
            // No long choreography for reduced-motion users.
            setEnvGone(true);
        }
    };

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

    const locked = !envGone;

    const rootStyle: CSSProperties = {
        fontFamily: BODY,
        fontSize: 18,
        lineHeight: 1.7,
        color: theme.text,
        background: theme.bg,
        backgroundImage:
            'radial-gradient(120% 60% at 50% 0%, rgba(255,255,255,0.6), rgba(255,255,255,0) 55%)',
        WebkitFontSmoothing: 'antialiased',
        position: 'relative',
        ...(locked ? { height: '100vh', overflow: 'hidden' } : { overflowX: 'hidden' }),
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

    const bismillah = data.bismillah ? (
        <div
            style={{
                direction: 'rtl',
                fontFamily: ARABIC,
                fontSize: 'clamp(22px, 5.5vw, 34px)',
                color: theme.primary,
                lineHeight: 1.9,
            }}
        >
            بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ
        </div>
    ) : null;

    return (
        <div style={rootStyle}>
            <style>{`
                @keyframes pk-sm-pulse {
                    0%,100% { transform: translateY(0); opacity: 0.85; }
                    50%     { transform: translateY(4px); opacity: 1; }
                }
                @keyframes pk-sm-glow {
                    0%,100% { opacity: 0.35; }
                    50%     { opacity: 0.6; }
                }
                @keyframes pk-sm-sparkle {
                    0%,100% { transform: translateY(4px) scale(0.6); opacity: 0; }
                    50%     { transform: translateY(-4px) scale(1); opacity: 0.85; }
                }
                @media (prefers-reduced-motion: reduce) {
                    * { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; }
                }
            `}</style>

            {/* ---------------------------------------------------------- */}
            {/* ENVELOPE OVERLAY — the click-to-open cover                  */}
            {/* ---------------------------------------------------------- */}
            {!envGone && (
                <motion.div
                    role="button"
                    tabIndex={0}
                    aria-label={tr("Ketik untuk membuka jemputan")}
                    onClick={openEnvelope}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openEnvelope();
                        }
                    }}
                    initial={false}
                    animate={opened ? { opacity: 0 } : { opacity: 1 }}
                    transition={{ duration: reduce ? 0.001 : 0.55, delay: opened && !reduce ? 1.35 : 0 }}
                    onAnimationComplete={() => {
                        if (opened) setEnvGone(true);
                    }}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 60,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 26,
                        padding: 24,
                        background: `radial-gradient(120% 90% at 50% 30%, ${theme.cream}, ${theme.creamDeep})`,
                        cursor: opened ? 'default' : 'pointer',
                        pointerEvents: opened ? 'none' : 'auto',
                    }}
                >
                    {/* ambient glow behind the envelope */}
                    <div
                        aria-hidden="true"
                        style={{
                            position: 'absolute',
                            width: 'min(120vw, 640px)',
                            height: 'min(120vw, 640px)',
                            borderRadius: '50%',
                            background: `radial-gradient(circle, ${theme.gold}22, transparent 62%)`,
                            animation: reduce || preview ? undefined : 'pk-sm-glow 5s ease-in-out infinite',
                        }}
                    />

                    {/* Envelope stack (perspective parent for the 3D flap) */}
                    <motion.div
                        initial={false}
                        animate={opened ? { scale: reduce ? 1 : 2.35, y: reduce ? 0 : '-6%' } : { scale: 1, y: 0 }}
                        transition={{ duration: reduce ? 0.001 : 1, delay: opened && !reduce ? 1.05 : 0, ease: EASE_OUT }}
                        style={{
                            position: 'relative',
                            width: 'min(82vw, 360px)',
                            aspectRatio: '3 / 2',
                            perspective: 1400,
                            zIndex: 1,
                        }}
                    >
                        {/* Back / inside panel (z0) */}
                        <svg
                            viewBox="0 0 300 200"
                            preserveAspectRatio="none"
                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0 }}
                            aria-hidden="true"
                        >
                            <rect x="4" y="4" width="292" height="192" rx="10" fill={theme.creamDeep} />
                            <rect
                                x="14"
                                y="14"
                                width="272"
                                height="150"
                                rx="6"
                                fill="rgba(74,54,38,0.10)"
                            />
                        </svg>

                        {/* Invitation card (z1) — slides up out of the pocket */}
                        <motion.div
                            initial={false}
                            animate={opened ? { y: reduce ? 0 : '-44%' } : { y: 0 }}
                            transition={{ duration: reduce ? 0.001 : 0.75, delay: opened && !reduce ? 0.72 : 0, ease: EASE_OUT }}
                            style={{
                                position: 'absolute',
                                left: '11%',
                                width: '78%',
                                top: '9%',
                                height: '90%',
                                zIndex: 1,
                                borderRadius: 6,
                                background: theme.card,
                                border: `1px solid ${theme.line}`,
                                boxShadow: `inset 0 0 0 3px ${theme.cream}, 0 10px 24px -12px rgba(74,54,38,0.5)`,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textAlign: 'center',
                                padding: '6% 8%',
                                overflow: 'hidden',
                            }}
                        >
                            <div
                                style={{
                                    fontFamily: BODY,
                                    fontSize: 'clamp(7px, 2vw, 10px)',
                                    letterSpacing: '0.3em',
                                    textTransform: 'uppercase',
                                    color: theme.accent,
                                }}
                            >
                                {tr("Walimatulurus")}
                            </div>
                            <div
                                style={{
                                    fontFamily: NAMES,
                                    fontSize: 'clamp(15px, 5vw, 26px)',
                                    fontWeight: 600,
                                    color: theme.primary,
                                    lineHeight: 1.15,
                                    marginTop: '3%',
                                }}
                            >
                                {groomShort}
                                <span style={{ color: theme.accent, fontStyle: 'italic', margin: '0 6px' }}>&amp;</span>
                                {brideShort}
                            </div>
                            <Divider theme={theme} />
                        </motion.div>

                        {/* Front folds — left, right, bottom pocket (z2) */}
                        <svg
                            viewBox="0 0 300 200"
                            preserveAspectRatio="none"
                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 2 }}
                            aria-hidden="true"
                        >
                            <defs>
                                <linearGradient id={`${uid}-fold`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={theme.cream} />
                                    <stop offset="100%" stopColor={theme.creamDeep} />
                                </linearGradient>
                            </defs>
                            {/* left fold */}
                            <path d="M4 8 L150 112 L4 192 Z" fill={theme.creamDeep} stroke={theme.line} strokeWidth="1" />
                            {/* right fold */}
                            <path d="M296 8 L150 112 L296 192 Z" fill={theme.creamDeep} stroke={theme.line} strokeWidth="1" />
                            {/* bottom pocket */}
                            <path d="M4 192 L150 112 L296 192 Z" fill={`url(#${uid}-fold)`} stroke={theme.accent} strokeWidth="1" />
                            <path d="M150 112 L4 192 M150 112 L296 192" stroke={theme.accent} strokeWidth="0.8" opacity="0.5" />
                        </svg>

                        {/* Top flap (z3) — opens on rotateX about its top hinge */}
                        <motion.div
                            initial={false}
                            animate={opened ? { rotateX: reduce ? 0 : -172 } : { rotateX: 0 }}
                            transition={{ duration: reduce ? 0.001 : 0.72, delay: opened && !reduce ? 0.32 : 0, ease: EASE_FLAP }}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '56%',
                                transformOrigin: '50% 0%',
                                transformStyle: 'preserve-3d',
                                zIndex: 3,
                            }}
                        >
                            <svg
                                viewBox="0 0 300 112"
                                preserveAspectRatio="none"
                                style={{ width: '100%', height: '100%', display: 'block' }}
                                aria-hidden="true"
                            >
                                <defs>
                                    <linearGradient id={`${uid}-flap`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#fffdf8" />
                                        <stop offset="100%" stopColor={theme.cream} />
                                    </linearGradient>
                                </defs>
                                <path d="M2 2 L298 2 L150 112 Z" fill={`url(#${uid}-flap)`} stroke={theme.accent} strokeWidth="1.2" />
                                <path d="M150 112 L2 2 M150 112 L298 2" stroke={theme.gold} strokeWidth="0.7" opacity="0.45" />
                            </svg>
                        </motion.div>

                        {/* Wax seal (z4) — breaks away on open. Centering lives on
                            the static wrapper so framer can own `transform`. */}
                        <div
                            style={{
                                position: 'absolute',
                                left: '50%',
                                top: '56%',
                                width: 'clamp(78px, 27%, 132px)',
                                aspectRatio: '1 / 1',
                                transform: 'translate(-50%, -50%)',
                                zIndex: 4,
                                filter: 'drop-shadow(0 4px 8px rgba(74,54,38,0.35))',
                            }}
                        >
                            <motion.div
                                initial={false}
                                animate={opened ? { scale: reduce ? 0 : 1.7, opacity: 0, rotate: reduce ? 0 : 32 } : { scale: 1, opacity: 1, rotate: 0 }}
                                transition={{ duration: reduce ? 0.001 : 0.42, ease: EASE_OUT }}
                                style={{ width: '100%', height: '100%' }}
                            >
                                <WaxSeal uid={uid} theme={theme} initials={initials} size="100%" />
                            </motion.div>
                        </div>
                    </motion.div>

                    {/* Hint */}
                    <motion.div
                        initial={false}
                        animate={opened ? { opacity: 0 } : { opacity: 1 }}
                        transition={{ duration: reduce ? 0.001 : 0.3 }}
                        style={{
                            position: 'relative',
                            zIndex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 8,
                            color: theme.secondary,
                            textAlign: 'center',
                        }}
                    >
                        <span
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                fontFamily: BODY,
                                fontSize: 13,
                                letterSpacing: '0.24em',
                                textTransform: 'uppercase',
                            }}
                        >
                            <Mail size={16} color={theme.accent} />
                            Ketik untuk buka
                        </span>
                        <span
                            aria-hidden="true"
                            style={{
                                display: 'block',
                                animation: reduce || preview ? undefined : 'pk-sm-pulse 1.8s ease-in-out infinite',
                                color: theme.accent,
                            }}
                        >
                            <ChevronDown size={18} />
                        </span>
                    </motion.div>
                </motion.div>
            )}

            {/* ========================================================== */}
            {/* 1. COVER / HERO (revealed after the envelope zooms away)    */}
            {/* ========================================================== */}
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
                }}
            >
                {!preview && !reduce && <GoldSparkles color={theme.gold} />}

                <motion.div
                    initial={false}
                    animate={opened ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 24, scale: 0.94 }}
                    transition={{ duration: reduce ? 0.001 : 0.9, delay: preview ? 0 : reduce ? 0 : 1.3, ease: EASE_OUT }}
                    style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 520 }}
                >
                    <FramedCard theme={theme} style={{ padding: 'clamp(30px, 8vw, 54px) clamp(22px, 6vw, 40px)' }}>
                        {bismillah && <div style={{ marginBottom: 22 }}>{bismillah}</div>}

                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
                            <WaxSeal uid={`${uid}-hero`} theme={theme} initials={initials} size={92} />
                        </div>

                        <div
                            style={{
                                fontFamily: BODY,
                                fontSize: 12,
                                letterSpacing: '0.34em',
                                textTransform: 'uppercase',
                                color: theme.secondary,
                                marginBottom: 8,
                            }}
                        >
                            {tr("Walimatulurus")}
                        </div>
                        <div
                            style={{
                                fontFamily: NAMES,
                                fontSize: 'clamp(34px, 9vw, 56px)',
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
                                fontSize: 'clamp(22px, 6vw, 34px)',
                                color: theme.accent,
                                margin: '2px 0',
                            }}
                        >
                            &amp;
                        </div>
                        <div
                            style={{
                                fontFamily: NAMES,
                                fontSize: 'clamp(34px, 9vw, 56px)',
                                fontWeight: 600,
                                color: theme.primary,
                                lineHeight: 1.1,
                            }}
                        >
                            {brideShort}
                        </div>

                        <Divider theme={theme} />

                        {data.dateLabel && (
                            <div
                                style={{
                                    fontFamily: SERIF,
                                    fontSize: 'clamp(18px, 4.5vw, 24px)',
                                    color: theme.primary,
                                    marginTop: 16,
                                }}
                            >
                                {data.dateLabel}
                            </div>
                        )}
                    </FramedCard>
                </motion.div>

                {/* scroll cue */}
                {opened && !reduce && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8, delay: preview ? 0 : 2 }}
                        style={{
                            position: 'absolute',
                            bottom: 24,
                            left: 0,
                            right: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 4,
                            color: theme.secondary,
                        }}
                    >
                        <span style={{ fontFamily: BODY, fontSize: 11, letterSpacing: '0.24em', textTransform: 'uppercase' }}>
                            {tr("Skrol")}
                        </span>
                        <motion.div
                            animate={{ y: [0, 9, 0] }}
                            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                            style={{ willChange: 'transform' }}
                        >
                            <ChevronDown size={22} />
                        </motion.div>
                    </motion.div>
                )}
            </section>

            {/* Sections 2–12 only mount once the envelope is opened. */}
            {opened && (
                <>
                    {/* ------------------------------------------------ */}
                    {/* 2. OPENING                                        */}
                    {/* ------------------------------------------------ */}
                    <Section>
                        <Reveal preview={preview}>
                            <div style={{ textAlign: 'center' }}>
                                {bismillah && <div style={{ marginBottom: 22 }}>{bismillah}</div>}
                                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
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
                                    {data.openingLine ??
                                        'Dengan penuh kesyukuran, kami menjemput Dato’ / Datin / Tuan / Puan / Encik / Cik ke majlis perkahwinan anakanda kami.'}
                                </p>
                                <Divider theme={theme} />
                            </div>
                        </Reveal>
                    </Section>

                    {/* ------------------------------------------------ */}
                    {/* 3. COUPLE                                         */}
                    {/* ------------------------------------------------ */}
                    <Section background="rgba(255,255,255,0.4)">
                        <SectionHeading theme={theme} eyebrow={tr("Pasangan Bahagia")} title={tr("Pengantin")} />
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26 }}>
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

                            <Reveal preview={preview} delay={0.15} style={{ width: '100%' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
                                    <svg width={56} height={16} viewBox="0 0 56 16" aria-hidden="true">
                                        <line x1="0" y1="8" x2="48" y2="8" stroke={theme.accent} strokeWidth={1} />
                                        <circle cx="52" cy="8" r="2" fill={theme.accent} />
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
                                    <svg width={56} height={16} viewBox="0 0 56 16" aria-hidden="true">
                                        <circle cx="4" cy="8" r="2" fill={theme.accent} />
                                        <line x1="8" y1="8" x2="56" y2="8" stroke={theme.accent} strokeWidth={1} />
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

                    {/* ------------------------------------------------ */}
                    {/* 4. DATE + COUNTDOWN                               */}
                    {/* ------------------------------------------------ */}
                    <Section>
                        <SectionHeading
                            theme={theme}
                            eyebrow={tr("Menuju Hari Bahagia")}
                            title={tr("Kira Detik Bahagia")}
                            icon={<Calendar size={14} />}
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

                    {/* ------------------------------------------------ */}
                    {/* 5. ATUR CARA                                      */}
                    {/* ------------------------------------------------ */}
                    <PkSec name="program">{data.program && data.program.length > 0 && (
                        <Section background="rgba(255,255,255,0.4)">
                            <SectionHeading theme={theme} eyebrow={tr("Rentak Majlis")} title={tr("Atur Cara")} />
                            <div style={{ position: 'relative', maxWidth: 480, margin: '0 auto' }}>
                                <div
                                    aria-hidden="true"
                                    style={{ position: 'absolute', left: 11, top: 6, bottom: 6, width: 2, background: theme.line }}
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

                    {/* ------------------------------------------------ */}
                    {/* 6. LOKASI                                         */}
                    {/* ------------------------------------------------ */}
                    <PkSec name="location">{(data.venueName || data.venueAddress || data.mapsUrl || data.wazeUrl) && (
                        <Section>
                            <SectionHeading
                                theme={theme}
                                eyebrow={tr("Tempat Berlangsung")}
                                title={tr("Lokasi Majlis")}
                                icon={<MapPin size={14} />}
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
                                                    Buka Google Maps
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
                    )}</PkSec>

                    {/* ------------------------------------------------ */}
                    {/* 7. RSVP                                           */}
                    {/* ------------------------------------------------ */}
                    <PkSec name="rsvp">{slots?.rsvp && (
                        <Section background="rgba(255,255,255,0.4)">
                            <SectionHeading theme={theme} eyebrow={tr("Khabarkan Kehadiran")} title={tr("RSVP Kehadiran")} />
                            <Reveal preview={preview}>{slots.rsvp}</Reveal>
                        </Section>
                    )}</PkSec>

                    {/* ------------------------------------------------ */}
                    {/* 8. UCAPAN                                         */}
                    {/* ------------------------------------------------ */}
                    <PkSec name="wishes"><Section>
                        <SectionHeading theme={theme} eyebrow={tr("Doa & Restu")} title={tr("Ucapan Kasih")} />
                        <Reveal preview={preview}>
                            {slots?.wishes ?? (
                                <div
                                    style={{
                                        background: theme.card,
                                        border: `1px solid ${theme.line}`,
                                        borderRadius: 14,
                                        padding: '34px 24px',
                                        textAlign: 'center',
                                        boxShadow: '0 12px 30px rgba(74,54,38,0.08)',
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

                    {/* ------------------------------------------------ */}
                    {/* 8b. SENARAI HADIAH                                */}
                    {/* ------------------------------------------------ */}
                    <PkSec name="wishlist">{slots?.wishlist && (
                        <Section>
                            <SectionHeading theme={theme} eyebrow={tr("Tanda Ingatan")} title={tr("Senarai Hadiah")} />
                            <Reveal preview={preview}>{slots.wishlist}</Reveal>
                        </Section>
                    )}</PkSec>

                    {/* ------------------------------------------------ */}
                    {/* 9. HUBUNGI                                        */}
                    {/* ------------------------------------------------ */}
                    <PkSec name="contacts">{data.contacts && data.contacts.length > 0 && (
                        <Section background="rgba(255,255,255,0.4)">
                            <SectionHeading
                                theme={theme}
                                eyebrow={tr("Sebarang Pertanyaan")}
                                title={tr("Hubungi")}
                                icon={<Phone size={14} />}
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
                                                borderRadius: 12,
                                                background: theme.card,
                                                border: `1px solid ${theme.line}`,
                                                textDecoration: 'none',
                                                color: theme.text,
                                                boxShadow: '0 8px 20px rgba(74,54,38,0.06)',
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

                    {/* ------------------------------------------------ */}
                    {/* 10. SALAM KAUT                                    */}
                    {/* ------------------------------------------------ */}
                    <PkSec name="gift">{data.gift && (data.gift.bankName || data.gift.accountNo || data.gift.accountName) && (
                        <Section>
                            <SectionHeading theme={theme} eyebrow={tr("Tanda Kasih")} title={tr("Salam Kaut")} icon={<Gift size={14} />} />
                            <Reveal preview={preview}>
                                <div
                                    style={{
                                        maxWidth: 420,
                                        margin: '0 auto',
                                        background: theme.card,
                                        border: `1px solid ${theme.line}`,
                                        borderRadius: 16,
                                        padding: '30px 26px',
                                        textAlign: 'center',
                                        boxShadow: '0 14px 34px rgba(74,54,38,0.10)',
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                                        <span
                                            style={{
                                                width: 54,
                                                height: 54,
                                                borderRadius: '50%',
                                                background: 'rgba(184,145,46,0.14)',
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
                                                    background: copied ? theme.goldDeep : theme.accent,
                                                    color: '#fff',
                                                    borderColor: copied ? theme.goldDeep : theme.accent,
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
                    )}</PkSec>

                    {/* ------------------------------------------------ */}
                    {/* 11. GALERI                                        */}
                    {/* ------------------------------------------------ */}
                    <PkSec name="gallery"><Section background="rgba(255,255,255,0.4)">
                        <SectionHeading theme={theme} eyebrow={tr("Kenangan")} title={tr("Galeri Memori")} icon={<ImageIcon size={14} />} />
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
                                                  borderRadius: 12,
                                                  overflow: 'hidden',
                                                  border: `1px solid ${theme.line}`,
                                                  boxShadow: '0 10px 24px rgba(74,54,38,0.08)',
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
                                                  borderRadius: 12,
                                                  border: `1px solid ${theme.line}`,
                                                  aspectRatio: '3 / 4',
                                                  background: 'rgba(184,145,46,0.06)',
                                                  display: 'flex',
                                                  flexDirection: 'column',
                                                  alignItems: 'center',
                                                  justifyContent: 'center',
                                                  gap: 10,
                                                  color: theme.accent,
                                              }}
                                          >
                                              <ImageIcon size={26} />
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

                    {/* ------------------------------------------------ */}
                    {/* 12. FOOTER                                        */}
                    {/* ------------------------------------------------ */}
                    <footer style={{ position: 'relative', textAlign: 'center', padding: 'clamp(60px, 11vw, 110px) 20px 48px', overflow: 'hidden' }}>
                        <Reveal preview={preview}>
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
                                <WaxSeal uid={`${uid}-foot`} theme={theme} initials={initials} size={84} />
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
                                <Heart size={20} color={theme.accent} fill={theme.goldSoft} />
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
                                <Heart size={12} color={theme.accent} style={{ display: 'inline', verticalAlign: 'middle', margin: '0 2px' }} />{' '}
                                <BrandLogo height={12} plate style={{ verticalAlign: 'middle', padding: '3px 7px' }} />
                            </div>
                        </Reveal>
                    </footer>
                </>
            )}
        </div>
    );
}
