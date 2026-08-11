// ============================================================
// Curtain — cinematic "stage curtain reveal" wedding e-invite.
// Category: motion. Self-contained: React 18 + framer-motion v12
// + lucide-react only. All visuals are original inline SVG / CSS.
// No external images, fonts, CDNs or network calls.
// ============================================================

import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
    type ReactNode,
} from 'react';
import {
    motion,
    AnimatePresence,
    useReducedMotion,
    useScroll,
    useTransform,
} from 'framer-motion';
import {
    Sparkles,
    ChevronDown,
    Heart,
    CalendarDays,
    Clock,
    MapPin,
    Map as MapIcon,
    Navigation,
    Phone,
    Gift,
    Copy,
    Check,
    MessageCircle,
    Users,
    Image as ImageIcon,
} from 'lucide-react';
import type { TemplateProps } from '../types';

/* ------------------------------------------------------------------ */
/* Typography + easings                                               */
/* ------------------------------------------------------------------ */

const FONT_HEAD = "'Cormorant Garamond', Georgia, 'Times New Roman', serif";
const FONT_BODY =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];
const EASE_CURTAIN: [number, number, number, number] = [0.76, 0, 0.24, 1];

/* ------------------------------------------------------------------ */
/* Theme — a luxe dark stage. data.palette.accent (if any) becomes    */
/* the gold foil; the dark backdrop stays fixed so the cinematic      */
/* concept survives any (often light) merchant palette.               */
/* ------------------------------------------------------------------ */

interface Theme {
    gold: string;
    goldDeep: string;
    goldSoft: string;
    ink: string;
    dim: string;
    goldText: CSSProperties;
    card: CSSProperties;
}

function buildTheme(accent?: string): Theme {
    const gold = accent ?? '#e7c66a';
    const goldDeep = '#b8892f';
    const goldSoft = '#f6e6a8';
    const ink = '#f3ecdb';
    const dim = 'rgba(243,236,219,0.66)';
    return {
        gold,
        goldDeep,
        goldSoft,
        ink,
        dim,
        goldText: {
            backgroundImage: `linear-gradient(180deg, ${goldSoft} 0%, ${gold} 45%, ${goldDeep} 100%)`,
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            WebkitTextFillColor: 'transparent',
        },
        card: {
            position: 'relative',
            borderRadius: 18,
            padding: '26px 22px',
            background:
                'linear-gradient(160deg, rgba(255,255,255,0.06), rgba(255,255,255,0.015))',
            border: `1px solid ${gold}33`,
            boxShadow: `0 20px 60px -30px ${gold}55, inset 0 1px 0 rgba(255,255,255,0.06)`,
            backdropFilter: 'blur(2px)',
        },
    };
}

/* ------------------------------------------------------------------ */
/* Countdown helpers                                                  */
/* ------------------------------------------------------------------ */

type TimeLeft = {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    done: boolean;
};

function computeLeft(target?: string): TimeLeft | null {
    if (!target) return null;
    const t = new Date(target).getTime();
    if (Number.isNaN(t)) return null;
    const diff = t - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true };
    return {
        days: Math.floor(diff / 86_400_000),
        hours: Math.floor((diff % 86_400_000) / 3_600_000),
        minutes: Math.floor((diff % 3_600_000) / 60_000),
        seconds: Math.floor((diff % 60_000) / 1_000),
        done: false,
    };
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/* ================================================================== */
/* Module-scope presentational helpers (stable identities so parent   */
/* re-renders never remount / restart their animations).              */
/* ================================================================== */

function Divider({ t }: { t: Theme }) {
    return (
        <div
            aria-hidden
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                margin: '10px auto 26px',
                maxWidth: 260,
            }}
        >
            <span
                style={{
                    height: 1,
                    flex: 1,
                    background: `linear-gradient(90deg, transparent, ${t.gold}88)`,
                }}
            />
            <Sparkles size={16} color={t.gold} />
            <span
                style={{
                    height: 1,
                    flex: 1,
                    background: `linear-gradient(90deg, ${t.gold}88, transparent)`,
                }}
            />
        </div>
    );
}

function Kicker({ t, icon, children }: { t: Theme; icon: ReactNode; children: ReactNode }) {
    return (
        <div
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                fontFamily: FONT_BODY,
                fontSize: 12,
                letterSpacing: 3,
                textTransform: 'uppercase',
                color: t.gold,
                marginBottom: 8,
            }}
        >
            {icon}
            {children}
        </div>
    );
}

function Title({ t, children }: { t: Theme; children: ReactNode }) {
    return (
        <h2
            style={{
                ...t.goldText,
                fontFamily: FONT_HEAD,
                fontSize: 'clamp(30px, 6vw, 46px)',
                fontWeight: 600,
                margin: '0 0 4px',
                lineHeight: 1.1,
            }}
        >
            {children}
        </h2>
    );
}

function LinkButton({
    t,
    href,
    icon,
    children,
}: {
    t: Theme;
    href: string;
    icon: ReactNode;
    children: ReactNode;
}) {
    return (
        <motion.a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.97 }}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                padding: '13px 22px',
                borderRadius: 999,
                fontFamily: FONT_BODY,
                fontSize: 15,
                fontWeight: 600,
                letterSpacing: 0.3,
                color: '#1a1206',
                textDecoration: 'none',
                background: `linear-gradient(135deg, ${t.goldSoft}, ${t.gold} 55%, ${t.goldDeep})`,
                border: '1px solid rgba(255,255,255,0.35)',
                boxShadow: `0 10px 30px -14px ${t.gold}`,
            }}
        >
            {icon}
            {children}
        </motion.a>
    );
}

function Reveal({
    base,
    children,
    style,
    delay = 0,
}: {
    base: CSSProperties;
    children: ReactNode;
    style?: CSSProperties;
    delay?: number;
}) {
    return (
        <motion.section
            initial={{ opacity: 0, y: 46 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.75, ease: EASE_OUT, delay }}
            style={{ ...base, ...style }}
        >
            {children}
        </motion.section>
    );
}

/* Velvet fabric shared by both curtain panels. */
const VELVET =
    'repeating-linear-gradient(90deg, rgba(0,0,0,0.5) 0 2px, rgba(255,255,255,0.05) 24px, rgba(0,0,0,0.5) 50px),' +
    'linear-gradient(90deg, #260810 0%, #4f1322 24%, #6f1c2f 50%, #4f1322 76%, #260810 100%)';

function CurtainPanel({
    side,
    open,
    preview,
    t,
}: {
    side: 'left' | 'right';
    open: boolean;
    preview?: boolean;
    t: Theme;
}) {
    const off = side === 'left' ? '-102%' : '102%';
    const innerEdge = side === 'left' ? 'right' : 'left';
    return (
        <motion.div
            aria-hidden
            initial={{ x: 0 }}
            animate={{ x: open ? off : 0 }}
            transition={{
                duration: preview ? 1.05 : 1.7,
                ease: EASE_CURTAIN,
                delay: preview ? 0.05 : 0.15,
            }}
            style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: side === 'left' ? 0 : undefined,
                right: side === 'right' ? 0 : undefined,
                width: '51%',
                zIndex: 30,
                background: VELVET,
                boxShadow: 'inset 0 0 120px rgba(0,0,0,0.6)',
                pointerEvents: 'none',
                willChange: 'transform',
            }}
        >
            {/* gold trim on the meeting edge */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: innerEdge === 'left' ? 0 : undefined,
                    right: innerEdge === 'right' ? 0 : undefined,
                    width: 12,
                    background: `linear-gradient(${innerEdge === 'left' ? 90 : 270}deg, ${t.goldDeep}, ${t.goldSoft} 45%, ${t.goldDeep})`,
                    boxShadow: `0 0 26px ${t.gold}aa`,
                }}
            />
            {/* soft top sheen */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                        'linear-gradient(180deg, rgba(255,255,255,0.12), transparent 32%)',
                }}
            />
        </motion.div>
    );
}

/* Self-contained live countdown — owns its own ticking interval so the
   1-second updates never re-render the rest of the card. */
function Countdown({ receptionAt, t }: { receptionAt?: string; t: Theme }) {
    const [left, setLeft] = useState<TimeLeft | null>(() => computeLeft(receptionAt));
    useEffect(() => {
        if (!receptionAt) {
            setLeft(null);
            return;
        }
        setLeft(computeLeft(receptionAt));
        const id = window.setInterval(() => setLeft(computeLeft(receptionAt)), 1000);
        return () => window.clearInterval(id);
    }, [receptionAt]);

    if (!left) return null;

    const units = [
        { label: 'Hari', value: left.days },
        { label: 'Jam', value: left.hours },
        { label: 'Minit', value: left.minutes },
        { label: 'Saat', value: left.seconds },
    ];

    return (
        <>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 10,
                    maxWidth: 420,
                    margin: '26px auto 0',
                }}
            >
                {units.map((u) => (
                    <div key={u.label} style={{ ...t.card, padding: '16px 6px' }}>
                        <div
                            style={{
                                ...t.goldText,
                                fontFamily: FONT_HEAD,
                                fontSize: 'clamp(26px, 7vw, 40px)',
                                fontWeight: 700,
                                lineHeight: 1,
                            }}
                        >
                            {pad2(u.value)}
                        </div>
                        <div
                            style={{
                                fontSize: 11,
                                letterSpacing: 2,
                                textTransform: 'uppercase',
                                color: t.dim,
                                marginTop: 6,
                            }}
                        >
                            {u.label}
                        </div>
                    </div>
                ))}
            </div>

            <AnimatePresence>
                {left.done && (
                    <motion.p
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        style={{
                            ...t.goldText,
                            fontFamily: FONT_HEAD,
                            fontSize: 22,
                            marginTop: 24,
                        }}
                    >
                        Hari yang dinanti telah tiba
                    </motion.p>
                )}
            </AnimatePresence>
        </>
    );
}

/* ================================================================== */
/* Main template                                                      */
/* ================================================================== */

export default function CurtainTemplate({ data, preview, slots }: TemplateProps) {
    const reduce = useReducedMotion() ?? false;
    const t = useMemo(() => buildTheme(data.palette?.accent), [data.palette?.accent]);
    const bg = '#0a0610';

    /* curtain open state */
    const [open, setOpen] = useState(false);
    useEffect(() => {
        const id = window.setTimeout(() => setOpen(true), preview ? 380 : 950);
        return () => window.clearTimeout(id);
    }, [preview]);

    /* gift copy feedback */
    const [copied, setCopied] = useState(false);
    const copyAccount = () => {
        const no = (data.gift?.accountNo ?? '').replace(/\s+/g, '');
        if (!no) return;
        try {
            void navigator.clipboard?.writeText(no);
        } catch {
            /* clipboard unavailable — ignore */
        }
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
    };

    /* drifting gold sparkles / embers (capped at 14) */
    const particles = useMemo(
        () =>
            Array.from({ length: preview ? 8 : 14 }, (_, i) => ({
                id: i,
                x: Math.random() * 100,
                y: Math.random() * 100,
                size: 1 + Math.random() * 3,
                delay: Math.random() * 4,
                dur: 4 + Math.random() * 5,
            })),
        [preview],
    );

    /* parallax */
    const coverRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: coverRef,
        offset: ['start start', 'end start'],
    });
    const coverY = useTransform(scrollYProgress, [0, 1], ['0%', '38%']);
    const coverFade = useTransform(scrollYProgress, [0, 0.85], [1, 0]);

    const { scrollY } = useScroll();
    const glowY = useTransform(scrollY, [0, 2400], [0, -220]);

    /* derived content */
    const gShort = data.groomShort || data.groomName;
    const bShort = data.brideShort || data.brideName;

    const sectionBase: CSSProperties = {
        position: 'relative',
        zIndex: 2,
        maxWidth: 760,
        margin: '0 auto',
        padding: preview ? '54px 22px' : '84px 24px',
        textAlign: 'center',
    };

    const nameStyle: CSSProperties = {
        ...t.goldText,
        fontFamily: FONT_HEAD,
        fontWeight: 600,
        fontSize: 'clamp(46px, 13vw, 108px)',
        lineHeight: 1.02,
        margin: 0,
    };

    return (
        <div
            style={{
                position: 'relative',
                width: '100%',
                minHeight: '100%',
                overflowX: 'hidden',
                background: `radial-gradient(1200px 700px at 50% -10%, #1a1020 0%, ${bg} 60%)`,
                color: t.ink,
                fontFamily: FONT_BODY,
            }}
        >
            {/* scoped keyframes / selection — self-contained, no network */}
            <style>{`
                @keyframes ckShimmer { 0%{background-position:0% 50%} 100%{background-position:200% 50%} }
                @keyframes ckSweep { 0%{transform:translateX(-120%) skewX(-18deg);opacity:0}
                    35%{opacity:.55} 100%{transform:translateX(220%) skewX(-18deg);opacity:0} }
                .ck-shimmer{ background-size:200% auto; animation:ckShimmer 5.5s linear infinite; }
                .ck-root ::selection{ background:${t.gold}; color:#160f04; }
                @media (prefers-reduced-motion: reduce){
                    .ck-shimmer{ animation:none; } .ck-sweep{ display:none; }
                }
            `}</style>

            <div className="ck-root">
                {/* drifting gold glows — global parallax backdrop */}
                <motion.div
                    aria-hidden
                    style={{
                        position: 'absolute',
                        inset: '-10% -10% 0',
                        zIndex: 0,
                        y: glowY,
                        pointerEvents: 'none',
                        background: `radial-gradient(520px 320px at 18% 12%, ${t.gold}18, transparent 70%),
                            radial-gradient(560px 360px at 82% 42%, ${t.gold}12, transparent 70%),
                            radial-gradient(620px 420px at 40% 88%, ${t.goldDeep}14, transparent 72%)`,
                    }}
                />

                {/* =========================================================
                    1 · COVER — the curtain reveal
                ========================================================= */}
                <section
                    ref={coverRef}
                    style={{
                        position: 'relative',
                        minHeight: preview ? '78vh' : '100vh',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        borderBottom: `1px solid ${t.gold}22`,
                    }}
                >
                    {/* stage spotlight */}
                    <div
                        aria-hidden
                        style={{
                            position: 'absolute',
                            inset: 0,
                            zIndex: 1,
                            background: `radial-gradient(60% 55% at 50% 42%, ${t.gold}22, transparent 62%)`,
                        }}
                    />
                    {/* moving stage-light sweep */}
                    <div
                        className="ck-sweep"
                        aria-hidden
                        style={{
                            position: 'absolute',
                            top: 0,
                            bottom: 0,
                            left: 0,
                            width: '35%',
                            zIndex: 1,
                            background:
                                'linear-gradient(90deg, transparent, rgba(255,255,255,0.16), transparent)',
                            animation: reduce ? 'none' : 'ckSweep 7s ease-in-out 1.4s infinite',
                        }}
                    />

                    {/* gold shimmer particles */}
                    <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
                        {particles.map((p) =>
                            reduce || preview ? (
                                <span
                                    key={p.id}
                                    style={{
                                        position: 'absolute',
                                        left: `${p.x}%`,
                                        top: `${p.y}%`,
                                        width: p.size,
                                        height: p.size,
                                        borderRadius: '50%',
                                        background: t.gold,
                                        opacity: 0.3,
                                    }}
                                />
                            ) : (
                                <motion.span
                                    key={p.id}
                                    style={{
                                        position: 'absolute',
                                        left: `${p.x}%`,
                                        top: `${p.y}%`,
                                        width: p.size,
                                        height: p.size,
                                        borderRadius: '50%',
                                        background: t.gold,
                                        boxShadow: `0 0 ${p.size * 3}px ${t.gold}`,
                                        willChange: 'transform',
                                    }}
                                    initial={{ opacity: 0 }}
                                    animate={{
                                        opacity: [0, 0.9, 0],
                                        y: [0, -26, 0],
                                        scale: [0.5, 1, 0.5],
                                    }}
                                    transition={{
                                        duration: p.dur,
                                        delay: p.delay,
                                        repeat: Infinity,
                                        ease: 'easeInOut',
                                    }}
                                />
                            ),
                        )}
                    </div>

                    {/* revealed content */}
                    <motion.div
                        style={{
                            position: 'relative',
                            zIndex: 20,
                            textAlign: 'center',
                            padding: '0 22px',
                            y: coverY,
                            opacity: coverFade,
                        }}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={open ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
                            transition={{ delay: preview ? 0.55 : 0.95, duration: 0.9, ease: EASE_OUT }}
                        >
                            {data.bismillah && (
                                <p
                                    style={{
                                        ...t.goldText,
                                        fontFamily: FONT_HEAD,
                                        fontSize: 'clamp(20px, 4.5vw, 30px)',
                                        margin: '0 0 18px',
                                        letterSpacing: 1,
                                    }}
                                >
                                    بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                                </p>
                            )}

                            <p
                                style={{
                                    fontFamily: FONT_BODY,
                                    fontSize: 13,
                                    letterSpacing: 5,
                                    textTransform: 'uppercase',
                                    color: t.dim,
                                    margin: '0 0 14px',
                                }}
                            >
                                Walimatulurus
                            </p>

                            <h1 className="ck-shimmer" style={nameStyle}>
                                {gShort}
                            </h1>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 16,
                                    margin: '2px 0',
                                }}
                            >
                                <span
                                    style={{
                                        height: 1,
                                        width: 46,
                                        background: `linear-gradient(90deg, transparent, ${t.gold})`,
                                    }}
                                />
                                <span
                                    style={{
                                        ...t.goldText,
                                        fontFamily: FONT_HEAD,
                                        fontStyle: 'italic',
                                        fontSize: 'clamp(24px, 6vw, 40px)',
                                    }}
                                >
                                    &amp;
                                </span>
                                <span
                                    style={{
                                        height: 1,
                                        width: 46,
                                        background: `linear-gradient(90deg, ${t.gold}, transparent)`,
                                    }}
                                />
                            </div>
                            <h1 className="ck-shimmer" style={nameStyle}>
                                {bShort}
                            </h1>

                            {data.dateLabel && (
                                <p
                                    style={{
                                        fontFamily: FONT_HEAD,
                                        fontSize: 'clamp(16px, 3.6vw, 22px)',
                                        color: t.ink,
                                        marginTop: 20,
                                        letterSpacing: 1,
                                    }}
                                >
                                    {data.dateLabel}
                                </p>
                            )}
                        </motion.div>

                        {/* scroll cue */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={open ? { opacity: 1 } : { opacity: 0 }}
                            transition={{ delay: preview ? 1 : 1.8, duration: 0.8 }}
                            style={{ marginTop: 34 }}
                        >
                            <motion.div
                                animate={{ y: reduce ? 0 : [0, 9, 0] }}
                                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                                style={{
                                    display: 'inline-flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 4,
                                    color: t.gold,
                                    fontSize: 11,
                                    letterSpacing: 3,
                                    textTransform: 'uppercase',
                                    willChange: 'transform',
                                }}
                            >
                                Skrol
                                <ChevronDown size={22} />
                            </motion.div>
                        </motion.div>
                    </motion.div>

                    {/* valance (drape pelmet) — stays while panels part */}
                    <svg
                        aria-hidden
                        viewBox="0 0 1200 120"
                        preserveAspectRatio="none"
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: 108,
                            zIndex: 40,
                            filter: 'drop-shadow(0 8px 14px rgba(0,0,0,0.45))',
                        }}
                    >
                        <defs>
                            <linearGradient id="ckValance" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0" stopColor="#6f1c2f" />
                                <stop offset="1" stopColor="#2a0912" />
                            </linearGradient>
                        </defs>
                        <path
                            d="M0,72 Q100,122 200,72 Q300,122 400,72 Q500,122 600,72 Q700,122 800,72 Q900,122 1000,72 Q1100,122 1200,72 L1200,0 L0,0 Z"
                            fill="url(#ckValance)"
                        />
                        <path
                            d="M0,72 Q100,122 200,72 Q300,122 400,72 Q500,122 600,72 Q700,122 800,72 Q900,122 1000,72 Q1100,122 1200,72"
                            fill="none"
                            stroke={t.gold}
                            strokeWidth="3"
                            opacity="0.9"
                        />
                        {[0, 200, 400, 600, 800, 1000, 1200].map((x) => (
                            <circle key={x} cx={x} cy={72} r={5} fill={t.goldSoft} />
                        ))}
                    </svg>

                    {/* the two velvet panels */}
                    <CurtainPanel side="left" open={open} preview={preview} t={t} />
                    <CurtainPanel side="right" open={open} preview={preview} t={t} />
                </section>

                {/* =========================================================
                    2 · OPENING
                ========================================================= */}
                {data.openingLine && (
                    <Reveal base={sectionBase}>
                        <Kicker t={t} icon={<Users size={14} />}>
                            Jemputan
                        </Kicker>
                        <p
                            style={{
                                fontFamily: FONT_HEAD,
                                fontSize: 'clamp(20px, 4.4vw, 30px)',
                                lineHeight: 1.55,
                                color: t.ink,
                                margin: 0,
                            }}
                        >
                            {data.openingLine}
                        </p>
                    </Reveal>
                )}

                {/* =========================================================
                    3 · COUPLE
                ========================================================= */}
                <Reveal base={sectionBase}>
                    <Kicker t={t} icon={<Heart size={14} />}>
                        Pasangan Bahagia
                    </Kicker>
                    <Divider t={t} />
                    <h3
                        style={{
                            ...t.goldText,
                            fontFamily: FONT_HEAD,
                            fontSize: 'clamp(32px, 8vw, 56px)',
                            fontWeight: 600,
                            margin: 0,
                            lineHeight: 1.1,
                        }}
                    >
                        {data.groomName}
                    </h3>
                    {data.groomParents && (
                        <p style={{ color: t.dim, fontSize: 14, margin: '6px 0 0' }}>
                            {data.groomParents}
                        </p>
                    )}

                    <motion.div
                        aria-hidden
                        animate={reduce ? undefined : { scale: [1, 1.14, 1] }}
                        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                        style={{ margin: '18px 0', color: t.gold, willChange: 'transform' }}
                    >
                        <Heart size={30} fill={t.gold} strokeWidth={0} />
                    </motion.div>

                    <h3
                        style={{
                            ...t.goldText,
                            fontFamily: FONT_HEAD,
                            fontSize: 'clamp(32px, 8vw, 56px)',
                            fontWeight: 600,
                            margin: 0,
                            lineHeight: 1.1,
                        }}
                    >
                        {data.brideName}
                    </h3>
                    {data.brideParents && (
                        <p style={{ color: t.dim, fontSize: 14, margin: '6px 0 0' }}>
                            {data.brideParents}
                        </p>
                    )}
                </Reveal>

                {/* In preview we stop after the couple — lightweight thumbnail */}
                {!preview && (
                    <>
                        {/* =================================================
                            4 · DATE + LIVE COUNTDOWN
                        ================================================= */}
                        <Reveal base={sectionBase}>
                            <Kicker t={t} icon={<CalendarDays size={14} />}>
                                Menuju Hari Bahagia
                            </Kicker>
                            <Title t={t}>Kira Detik Bahagia</Title>
                            <Divider t={t} />

                            {data.dateLabel && (
                                <p
                                    style={{
                                        fontFamily: FONT_HEAD,
                                        fontSize: 'clamp(20px, 5vw, 30px)',
                                        color: t.ink,
                                        margin: '0 0 6px',
                                    }}
                                >
                                    {data.dateLabel}
                                </p>
                            )}
                            {data.timeLabel && (
                                <p
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        color: t.dim,
                                        margin: '0 0 4px',
                                    }}
                                >
                                    <Clock size={15} color={t.gold} />
                                    {data.timeLabel}
                                </p>
                            )}
                            {data.hijriLabel && (
                                <p style={{ color: t.dim, fontSize: 13, margin: '0 0 8px' }}>
                                    {data.hijriLabel}
                                </p>
                            )}

                            <Countdown receptionAt={data.receptionAt} t={t} />
                        </Reveal>

                        {/* =================================================
                            5 · ATUR CARA
                        ================================================= */}
                        {data.program && data.program.length > 0 && (
                            <Reveal base={sectionBase}>
                                <Kicker t={t} icon={<Clock size={14} />}>
                                    Rentak Majlis
                                </Kicker>
                                <Title t={t}>Atur Cara</Title>
                                <Divider t={t} />
                                <ul
                                    style={{
                                        listStyle: 'none',
                                        padding: 0,
                                        margin: '10px auto 0',
                                        maxWidth: 460,
                                        position: 'relative',
                                        textAlign: 'left',
                                    }}
                                >
                                    <span
                                        aria-hidden
                                        style={{
                                            position: 'absolute',
                                            left: 9,
                                            top: 6,
                                            bottom: 6,
                                            width: 2,
                                            background: `linear-gradient(${t.gold}, transparent)`,
                                        }}
                                    />
                                    {data.program.map((item, i) => (
                                        <motion.li
                                            key={`${item.time}-${i}`}
                                            initial={{ opacity: 0, x: -18 }}
                                            whileInView={{ opacity: 1, x: 0 }}
                                            viewport={{ once: true, amount: 0.15 }}
                                            transition={{ duration: 0.5, delay: i * 0.07, ease: EASE_OUT }}
                                            style={{
                                                position: 'relative',
                                                paddingLeft: 34,
                                                marginBottom: 20,
                                            }}
                                        >
                                            <span
                                                style={{
                                                    position: 'absolute',
                                                    left: 3,
                                                    top: 4,
                                                    width: 14,
                                                    height: 14,
                                                    borderRadius: '50%',
                                                    background: t.gold,
                                                    boxShadow: `0 0 14px ${t.gold}`,
                                                    border: '2px solid #1a1206',
                                                }}
                                            />
                                            <div
                                                style={{
                                                    color: t.gold,
                                                    fontSize: 13,
                                                    letterSpacing: 1,
                                                    fontWeight: 600,
                                                }}
                                            >
                                                {item.time}
                                            </div>
                                            <div
                                                style={{
                                                    fontFamily: FONT_HEAD,
                                                    fontSize: 'clamp(18px, 4.4vw, 24px)',
                                                    color: t.ink,
                                                }}
                                            >
                                                {item.title}
                                            </div>
                                        </motion.li>
                                    ))}
                                </ul>
                            </Reveal>
                        )}

                        {/* =================================================
                            6 · LOKASI
                        ================================================= */}
                        {(data.venueName || data.venueAddress || data.mapsUrl || data.wazeUrl) && (
                            <Reveal base={sectionBase}>
                                <Kicker t={t} icon={<MapPin size={14} />}>
                                    Tempat Berlangsung
                                </Kicker>
                                <Title t={t}>Lokasi Majlis</Title>
                                <Divider t={t} />
                                {data.venueName && (
                                    <p
                                        style={{
                                            fontFamily: FONT_HEAD,
                                            fontSize: 'clamp(22px, 5vw, 30px)',
                                            color: t.ink,
                                            margin: '0 0 6px',
                                        }}
                                    >
                                        {data.venueName}
                                    </p>
                                )}
                                {data.venueAddress && (
                                    <p
                                        style={{
                                            color: t.dim,
                                            fontSize: 15,
                                            lineHeight: 1.6,
                                            maxWidth: 460,
                                            margin: '0 auto 22px',
                                        }}
                                    >
                                        {data.venueAddress}
                                    </p>
                                )}
                                <div
                                    style={{
                                        display: 'flex',
                                        gap: 12,
                                        justifyContent: 'center',
                                        flexWrap: 'wrap',
                                    }}
                                >
                                    {data.mapsUrl && (
                                        <LinkButton t={t} href={data.mapsUrl} icon={<MapIcon size={17} />}>
                                            Google Maps
                                        </LinkButton>
                                    )}
                                    {data.wazeUrl && (
                                        <LinkButton t={t} href={data.wazeUrl} icon={<Navigation size={17} />}>
                                            Waze
                                        </LinkButton>
                                    )}
                                </div>
                            </Reveal>
                        )}

                        {/* =================================================
                            7 · RSVP
                        ================================================= */}
                        {slots?.rsvp && (
                            <Reveal base={sectionBase}>
                                <Kicker t={t} icon={<Check size={14} />}>
                                    Khabarkan Kehadiran
                                </Kicker>
                                <Title t={t}>RSVP Kehadiran</Title>
                                <Divider t={t} />
                                {slots.rsvp}
                            </Reveal>
                        )}

                        {/* =================================================
                            8 · UCAPAN
                        ================================================= */}
                        <Reveal base={sectionBase}>
                            <Kicker t={t} icon={<MessageCircle size={14} />}>
                                Buku Tetamu
                            </Kicker>
                            <Title t={t}>Ucapan Kasih</Title>
                            <Divider t={t} />
                            {slots?.wishes ?? (
                                <div style={{ ...t.card, color: t.dim }}>
                                    Ruangan ucapan &amp; doa akan dipaparkan di sini.
                                </div>
                            )}
                        </Reveal>

                        {/* =================================================
                            8b · SENARAI HADIAH
                        ================================================= */}
                        {slots?.wishlist && (
                            <Reveal base={sectionBase}>
                                <Kicker t={t} icon={<Gift size={14} />}>
                                    Tanda Ingatan
                                </Kicker>
                                <Title t={t}>Senarai Hadiah</Title>
                                <Divider t={t} />
                                {slots.wishlist}
                            </Reveal>
                        )}

                        {/* =================================================
                            9 · HUBUNGI
                        ================================================= */}
                        {data.contacts && data.contacts.length > 0 && (
                            <Reveal base={sectionBase}>
                                <Kicker t={t} icon={<Phone size={14} />}>
                                    Sebarang Pertanyaan
                                </Kicker>
                                <Title t={t}>Hubungi</Title>
                                <Divider t={t} />
                                <div
                                    style={{
                                        display: 'grid',
                                        gap: 12,
                                        maxWidth: 440,
                                        margin: '0 auto',
                                    }}
                                >
                                    {data.contacts.map((c, i) => (
                                        <motion.a
                                            key={`${c.phone}-${i}`}
                                            href={`tel:${c.phone.replace(/\s+/g, '')}`}
                                            whileHover={{ y: -3 }}
                                            whileTap={{ scale: 0.98 }}
                                            style={{
                                                ...t.card,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: 12,
                                                textDecoration: 'none',
                                                color: t.ink,
                                                padding: '16px 18px',
                                            }}
                                        >
                                            <span style={{ textAlign: 'left' }}>
                                                <span
                                                    style={{
                                                        display: 'block',
                                                        fontFamily: FONT_HEAD,
                                                        fontSize: 20,
                                                    }}
                                                >
                                                    {c.name}
                                                </span>
                                                {c.role && (
                                                    <span style={{ fontSize: 13, color: t.dim }}>
                                                        {c.role}
                                                    </span>
                                                )}
                                            </span>
                                            <span
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    width: 42,
                                                    height: 42,
                                                    borderRadius: '50%',
                                                    background: `linear-gradient(135deg, ${t.goldSoft}, ${t.goldDeep})`,
                                                    color: '#1a1206',
                                                    flexShrink: 0,
                                                }}
                                            >
                                                <Phone size={18} />
                                            </span>
                                        </motion.a>
                                    ))}
                                </div>
                            </Reveal>
                        )}

                        {/* =================================================
                            10 · SALAM KAUT
                        ================================================= */}
                        {data.gift &&
                            (data.gift.accountNo || data.gift.bankName || data.gift.qrUrl) && (
                                <Reveal base={sectionBase}>
                                    <Kicker t={t} icon={<Gift size={14} />}>
                                        Salam Kasih
                                    </Kicker>
                                    <Title t={t}>Tanda Kasih</Title>
                                    <Divider t={t} />
                                    <div style={{ ...t.card, maxWidth: 440, margin: '0 auto' }}>
                                        {data.gift.note && (
                                            <p style={{ color: t.dim, margin: '0 0 18px', lineHeight: 1.6 }}>
                                                {data.gift.note}
                                            </p>
                                        )}
                                        {data.gift.qrUrl && (
                                            <img
                                                src={data.gift.qrUrl}
                                                alt="DuitNow QR"
                                                style={{
                                                    width: 168,
                                                    height: 168,
                                                    objectFit: 'contain',
                                                    borderRadius: 12,
                                                    background: '#fff',
                                                    padding: 8,
                                                    margin: '0 auto 18px',
                                                    display: 'block',
                                                }}
                                            />
                                        )}
                                        {data.gift.bankName && (
                                            <div style={{ color: t.gold, fontSize: 13, letterSpacing: 1 }}>
                                                {data.gift.bankName}
                                            </div>
                                        )}
                                        {data.gift.accountName && (
                                            <div
                                                style={{
                                                    fontFamily: FONT_HEAD,
                                                    fontSize: 22,
                                                    color: t.ink,
                                                    margin: '2px 0 2px',
                                                }}
                                            >
                                                {data.gift.accountName}
                                            </div>
                                        )}
                                        {data.gift.accountNo && (
                                            <>
                                                <div
                                                    style={{
                                                        fontFamily: 'ui-monospace, Menlo, monospace',
                                                        fontSize: 20,
                                                        letterSpacing: 2,
                                                        color: t.ink,
                                                        margin: '4px 0 16px',
                                                    }}
                                                >
                                                    {data.gift.accountNo}
                                                </div>
                                                <motion.button
                                                    type="button"
                                                    onClick={copyAccount}
                                                    whileHover={{ y: -2 }}
                                                    whileTap={{ scale: 0.97 }}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 9,
                                                        padding: '12px 22px',
                                                        borderRadius: 999,
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        fontFamily: FONT_BODY,
                                                        fontWeight: 600,
                                                        fontSize: 15,
                                                        color: '#1a1206',
                                                        background: `linear-gradient(135deg, ${t.goldSoft}, ${t.gold} 55%, ${t.goldDeep})`,
                                                        boxShadow: `0 10px 30px -14px ${t.gold}`,
                                                    }}
                                                >
                                                    <AnimatePresence mode="wait" initial={false}>
                                                        {copied ? (
                                                            <motion.span
                                                                key="done"
                                                                initial={{ opacity: 0, scale: 0.7 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                exit={{ opacity: 0, scale: 0.7 }}
                                                                style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: 9,
                                                                }}
                                                            >
                                                                <Check size={17} /> Telah disalin
                                                            </motion.span>
                                                        ) : (
                                                            <motion.span
                                                                key="copy"
                                                                initial={{ opacity: 0, scale: 0.7 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                exit={{ opacity: 0, scale: 0.7 }}
                                                                style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: 9,
                                                                }}
                                                            >
                                                                <Copy size={17} /> Salin No. Akaun
                                                            </motion.span>
                                                        )}
                                                    </AnimatePresence>
                                                </motion.button>
                                            </>
                                        )}
                                    </div>
                                </Reveal>
                            )}

                        {/* =================================================
                            11 · GALERI
                        ================================================= */}
                        <Reveal base={sectionBase}>
                            <Kicker t={t} icon={<ImageIcon size={14} />}>
                                Kenangan
                            </Kicker>
                            <Title t={t}>Galeri Memori</Title>
                            <Divider t={t} />
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(3, 1fr)',
                                    gap: 10,
                                    maxWidth: 560,
                                    margin: '0 auto',
                                }}
                            >
                                {(data.galleryImages && data.galleryImages.length > 0
                                    ? data.galleryImages
                                    : [null, null, null, null, null, null]
                                ).map((src, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        whileInView={{ opacity: 1, scale: 1 }}
                                        viewport={{ once: true, amount: 0.15 }}
                                        transition={{ duration: 0.5, delay: i * 0.05, ease: EASE_OUT }}
                                        style={{
                                            aspectRatio: '1 / 1',
                                            borderRadius: 12,
                                            overflow: 'hidden',
                                            border: `1px solid ${t.gold}33`,
                                            background:
                                                'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        {src ? (
                                            <img
                                                src={src}
                                                alt={`Galeri ${i + 1}`}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        ) : (
                                            <ImageIcon size={26} color={`${t.gold}66`} />
                                        )}
                                    </motion.div>
                                ))}
                            </div>
                        </Reveal>
                    </>
                )}

                {/* =========================================================
                    12 · FOOTER
                ========================================================= */}
                <footer
                    style={{
                        position: 'relative',
                        zIndex: 2,
                        textAlign: 'center',
                        padding: preview ? '48px 22px 40px' : '80px 22px 56px',
                        borderTop: `1px solid ${t.gold}22`,
                    }}
                >
                    <div
                        aria-hidden
                        style={{
                            color: t.gold,
                            display: 'flex',
                            justifyContent: 'center',
                            marginBottom: 14,
                        }}
                    >
                        <Heart size={22} fill={t.gold} strokeWidth={0} />
                    </div>
                    <p
                        style={{
                            ...t.goldText,
                            fontFamily: FONT_HEAD,
                            fontSize: 'clamp(26px, 6vw, 40px)',
                            margin: '0 0 8px',
                        }}
                    >
                        {gShort} &amp; {bShort}
                    </p>
                    <p style={{ color: t.ink, fontSize: 16, margin: '0 0 22px' }}>
                        Terima kasih atas kehadiran &amp; doa restu anda
                    </p>
                    <p
                        style={{
                            fontSize: 11,
                            letterSpacing: 2,
                            textTransform: 'uppercase',
                            color: t.dim,
                            margin: 0,
                        }}
                    >
                        Dibina dengan{' '}
                        <Heart
                            size={11}
                            fill={t.gold}
                            strokeWidth={0}
                            style={{ verticalAlign: 'middle' }}
                        />{' '}
                        oleh <span style={{ color: t.gold }}>PortalKahwin</span>
                    </p>
                </footer>
            </div>
        </div>
    );
}
