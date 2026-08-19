// ============================================================
// Minimalis Moden — modern-minimalist wedding e-invitation.
// Type-led design: ivory ground, charcoal ink, one thin gold
// accent line/dot. Lots of whitespace, minimal ornament.
// Self-contained: all visuals are original inline SVG / CSS.
// No external images, fonts, CDNs or network requests.
// ============================================================

import { useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
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
} from 'lucide-react';

import type { TemplateProps, ProgramItem, Contact } from '../types';
import { useCardText } from '../cardText';
import { REVEAL_TIMING, TEMPLATE_ART, groundPattern } from '../templateArt';

/**
 * Entrance personality for this design, from its art direction — the
 * catalogue used to share one easing curve, which made every card feel
 * the same however differently it was coloured.
 */
const MOTION = REVEAL_TIMING[TEMPLATE_ART['minimalis'].reveal];


// ---------- typography ---------------------------------------------------
const SERIF = "'Cormorant Garamond', 'Playfair Display', Georgia, 'Times New Roman', serif";
const NAMES = "var(--pk-name, 'Cormorant Garamond'), 'Playfair Display', Georgia, 'Times New Roman', serif";
const SANS = "'Inter', 'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif";
const ARABIC = "'Traditional Arabic', 'Scheherazade New', 'Amiri', 'Noto Naskh Arabic', serif";

// Shared letter-spaced-caps eyebrow style.
const CAPS: CSSProperties = {
    fontFamily: SANS,
    fontSize: 12,
    fontWeight: 500,
    letterSpacing: '0.42em',
    textTransform: 'uppercase',
};

// ---------- theme --------------------------------------------------------
interface Theme {
    ink: string;    // charcoal — headings
    sub: string;    // muted supporting text
    accent: string; // single gold accent
    bg: string;     // ivory ground
    text: string;   // body
    line: string;   // hairline rules / borders
    card: string;   // faint panel fill
}

// =========================================================================
//  Signature particle layer — a very sparse, slow drift of tiny gold dots.
//  GPU-cheap: transform + opacity keyframes only, ≤16 nodes, behind content.
// =========================================================================

const GOLD_DOTS = Array.from({ length: 12 }, (_, i) => ({
    key: i,
    left: (i * 8.5 + 5) % 100,
    delay: (i % 6) * 2.1,
    dur: 15 + (i % 5) * 2.5,
    size: 3 + (i % 3),
}));

function GoldDots({ color }: { color: string }) {
    return (
        <div
            aria-hidden="true"
            style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}
        >
            {GOLD_DOTS.map((d) => (
                <span
                    key={d.key}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: `${d.left}%`,
                        width: d.size,
                        height: d.size,
                        borderRadius: '50%',
                        background: color,
                        opacity: 0,
                        willChange: 'transform',
                        animation: `mn-drift ${d.dur}s linear ${d.delay}s infinite`,
                    }}
                />
            ))}
        </div>
    );
}

// =========================================================================
//  Motion + layout helpers
// =========================================================================

/** Fade + gentle rise, revealed on scroll. Static when `still`. */
function Reveal({
    children,
    still,
    delay = 0,
    y = MOTION.y,
    style,
}: {
    children: ReactNode;
    still: boolean;
    delay?: number;
    y?: number;
    style?: CSSProperties;
}) {
    if (still) {
        return <div style={style}>{children}</div>;
    }
    return (
        <motion.div
            style={style}
            initial={{ opacity: 0, y }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
        >
            {children}
        </motion.div>
    );
}

/** A single thin gold rule with a centred dot — the one recurring accent. */
function Rule({ theme, width = 96 }: { theme: Theme; width?: number }) {
    return (
        <div
            aria-hidden="true"
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                margin: '22px auto 0',
            }}
        >
            <span style={{ width, height: 1, background: theme.line }} />
            <span
                style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: theme.accent,
                    flex: '0 0 auto',
                }}
            />
            <span style={{ width, height: 1, background: theme.line }} />
        </div>
    );
}

function SectionShell({
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
                padding: 'clamp(72px, 13vw, 140px) 22px',
                background,
                ...style,
            }}
        >
            <div style={{ maxWidth: 680, margin: '0 auto', position: 'relative' }}>{children}</div>
        </section>
    );
}

function SectionHead({
    theme,
    still,
    eyebrow,
    title,
}: {
    theme: Theme;
    still: boolean;
    eyebrow: string;
    title: string;
}) {
    return (
        <Reveal still={still} style={{ textAlign: 'center', marginBottom: 46 }}>
            <div style={{ ...CAPS, color: theme.accent, marginBottom: 14 }}>{eyebrow}</div>
            <h2
                style={{
                    fontFamily: SERIF,
                    fontSize: 'clamp(34px, 7vw, 54px)',
                    fontWeight: 500,
                    color: theme.ink,
                    margin: 0,
                    lineHeight: 1.05,
                    letterSpacing: '0.005em',
                }}
            >
                {title}
            </h2>
            <Rule theme={theme} />
        </Reveal>
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

function CountUnit({ theme, value, label, divider }: { theme: Theme; value: number; label: string; divider: boolean }) {
    return (
        <div style={{ display: 'flex', alignItems: 'stretch' }}>
            {divider && (
                <span aria-hidden="true" style={{ width: 1, background: theme.line, margin: '4px 0' }} />
            )}
            <div style={{ minWidth: 76, padding: '0 14px', textAlign: 'center' }}>
                <div
                    style={{
                        fontFamily: SERIF,
                        fontSize: 'clamp(38px, 10vw, 58px)',
                        fontWeight: 500,
                        color: theme.ink,
                        lineHeight: 1,
                    }}
                >
                    {String(value).padStart(2, '0')}
                </div>
                <div style={{ ...CAPS, fontSize: 10, letterSpacing: '0.3em', color: theme.sub, marginTop: 12 }}>
                    {label}
                </div>
            </div>
        </div>
    );
}

// =========================================================================
//  Main template
// =========================================================================

export default function MinimalisTemplate({ data, preview, slots }: TemplateProps) {
    const tr = useCardText();
    const p = data.palette;
    const theme: Theme = {
        // Ivory / charcoal / gold defaults; honour palette when provided.
        ink: p?.primary ?? '#23201c',
        sub: p?.secondary ?? '#7d766b',
        accent: p?.accent ?? '#b0913f',
        bg: p?.bg ?? '#f8f5ef',
        text: p?.text ?? '#423d36',
        line: 'rgba(35,32,28,0.14)',
        card: 'rgba(255,255,255,0.6)',
    };

    const prefersReduced = useReducedMotion();
    const still = preview || prefersReduced === true;

    const groomShort = data.groomShort ?? data.groomName;
    const brideShort = data.brideShort ?? data.brideName;

    // Bride's family hosting? Then her name reads first (doc rule).
    const brideFirst = (data.inviteSide === 'bride' || data.inviteSide === 'both_bride');
    const firstShort = brideFirst ? brideShort : groomShort;
    const secondShort = brideFirst ? groomShort : brideShort;
    const firstName = brideFirst ? data.brideName : data.groomName;
    const secondName = brideFirst ? data.groomName : data.brideName;
    const firstParents = brideFirst ? data.brideParents : data.groomParents;
    const secondParents = brideFirst ? data.groomParents : data.brideParents;
    // Walimah heading: undefined → template default; '' → hidden; else custom.
    const walimahText = data.walimahLabel ?? 'Walimatulurus';

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
        fontFamily: SANS,
        fontSize: 18,
        lineHeight: 1.75,
        color: theme.text,
        background: theme.bg,
        backgroundImage: groundPattern('diamond', theme.accent, 0.05),
        WebkitFontSmoothing: 'antialiased',
        overflowX: 'hidden',
    };

    const buttonBase: CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: '13px 24px',
        borderRadius: 2,
        fontFamily: SANS,
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        textDecoration: 'none',
        cursor: 'pointer',
        transition: 'opacity 0.15s ease',
    };

    const solidBtn: CSSProperties = {
        ...buttonBase,
        background: theme.ink,
        color: theme.bg,
        border: `1px solid ${theme.ink}`,
    };
    const ghostBtn: CSSProperties = {
        ...buttonBase,
        background: 'transparent',
        color: theme.ink,
        border: `1px solid ${theme.line}`,
    };

    return (
        <div style={rootStyle}>
            <style>{`
                @keyframes mn-drift {
                    0%   { transform: translate3d(0, -8vh, 0); opacity: 0; }
                    14%  { opacity: 0.45; }
                    86%  { opacity: 0.45; }
                    100% { transform: translate3d(0, 108vh, 0); opacity: 0; }
                }
                @media (prefers-reduced-motion: reduce) {
                    * { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; }
                }
            `}</style>

            {/* ---------------------------------------------------------- */}
            {/* 1. COVER — quiet fade + zoom                                */}
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
                    padding: '80px 24px 64px',
                    // Clear the absolutely-positioned scroll cue below (~66px tall from the
                    // bottom edge) so centred content can never sit underneath it.
                    paddingBottom: 'var(--pk-cue-clear, 96px)',
                    overflow: 'hidden',
                }}
            >
                {!still && <GoldDots color={theme.accent} />}

                <motion.div
                    initial={still ? false : { opacity: 0, scale: 0.94 }}
                    animate={still ? undefined : { opacity: 1, scale: 1 }}
                    transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
                    style={{ position: 'relative', width: '100%', maxWidth: 560 }}
                >
                    {data.bismillah && (
                        <div style={{ marginBottom: 34 }}>
                            {data.bismillahText ? (
                                <div
                                    style={{
                                        fontFamily: SERIF,
                                        fontSize: 'clamp(22px, 5.5vw, 34px)',
                                        color: theme.sub,
                                        lineHeight: 1.9,
                                        whiteSpace: 'pre-line',
                                    }}
                                >
                                    {data.bismillahText}
                                </div>
                            ) : (
                                <div
                                    style={{
                                        direction: 'rtl',
                                        fontFamily: ARABIC,
                                        fontSize: 'clamp(22px, 5.5vw, 34px)',
                                        color: theme.sub,
                                        lineHeight: 1.9,
                                    }}
                                >
                                    بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ
                                </div>
                            )}
                        </div>
                    )}

                    {walimahText.trim() && (
                        <div style={{ ...CAPS, color: theme.accent, marginBottom: 30 }}>{walimahText}</div>
                    )}

                    {/* thin gold line draws across */}
                    <motion.div
                        initial={still ? false : { scaleX: 0 }}
                        animate={still ? undefined : { scaleX: 1 }}
                        transition={{ duration: 1.1, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        style={{
                            width: 'min(58%, 240px)',
                            height: 1,
                            background: theme.accent,
                            transformOrigin: 'center',
                            margin: '0 auto 34px',
                        }}
                    />

                    {/* couple short names fade / rise */}
                    <motion.div
                        initial={still ? false : { opacity: 0, y: 20 }}
                        animate={still ? undefined : { opacity: 1, y: 0 }}
                        transition={{ duration: 1, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <div
                            style={{
                                fontFamily: NAMES,
                                fontSize: 'clamp(48px, 15vw, 92px)',
                                fontWeight: 500,
                                color: theme.ink,
                                lineHeight: 1.02,
                                letterSpacing: '0.01em',
                            }}
                        >
                            {firstShort}
                        </div>
                        <div
                            style={{
                                fontFamily: SERIF,
                                fontStyle: 'italic',
                                fontSize: 'clamp(24px, 6vw, 34px)',
                                color: theme.accent,
                                margin: '6px 0',
                            }}
                        >
                            &amp;
                        </div>
                        <div
                            style={{
                                fontFamily: NAMES,
                                fontSize: 'clamp(48px, 15vw, 92px)',
                                fontWeight: 500,
                                color: theme.ink,
                                lineHeight: 1.02,
                                letterSpacing: '0.01em',
                            }}
                        >
                            {secondShort}
                        </div>
                    </motion.div>

                    {data.dateLabel && (
                        <motion.div
                            initial={still ? false : { opacity: 0, y: 14 }}
                            animate={still ? undefined : { opacity: 1, y: 0 }}
                            transition={{ duration: 1, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
                            style={{
                                marginTop: 34,
                                fontFamily: SANS,
                                fontSize: 13,
                                letterSpacing: '0.28em',
                                textTransform: 'uppercase',
                                color: theme.sub,
                            }}
                        >
                            {data.dateLabel}
                        </motion.div>
                    )}
                </motion.div>

                {/* scroll cue */}
                <motion.div
                    initial={still ? false : { opacity: 0 }}
                    animate={still ? undefined : { opacity: 1 }}
                    transition={{ duration: 1, delay: 1.5 }}
                    style={{
                        position: 'absolute',
                        bottom: 30,
                        left: 0,
                        right: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 6,
                        color: theme.sub,
                    }}
                >
                    <span style={{ ...CAPS, fontSize: 10, letterSpacing: '0.3em' }}>Skrol</span>
                    <motion.div
                        animate={still ? undefined : { y: [0, 8, 0] }}
                        transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut' }}
                        style={{ willChange: 'transform' }}
                    >
                        <ChevronDown size={20} strokeWidth={1.4} />
                    </motion.div>
                </motion.div>
            </section>

            {/* ---------------------------------------------------------- */}
            {/* 2. OPENING                                                  */}
            {/* ---------------------------------------------------------- */}
            {data.openingLine && (
                <SectionShell>
                    <Reveal still={still}>
                        <div style={{ textAlign: 'center' }}>
                            <p
                                style={{
                                    fontFamily: SERIF,
                                    fontSize: 'clamp(23px, 5vw, 34px)',
                                    fontWeight: 400,
                                    fontStyle: 'italic',
                                    lineHeight: 1.55,
                                    color: theme.ink,
                                    margin: '0 auto',
                                    maxWidth: 600,
                                }}
                            >
                                {data.openingLine}
                            </p>
                            <Rule theme={theme} />
                        </div>
                    </Reveal>
                </SectionShell>
            )}

            {/* ---------------------------------------------------------- */}
            {/* 3. COUPLE                                                   */}
            {/* ---------------------------------------------------------- */}
            <SectionShell background={theme.card}>
                <SectionHead theme={theme} still={still} eyebrow={tr("Pasangan Bahagia")} title={tr("Pengantin")} />

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30 }}>
                    <Reveal still={still} delay={0.05} style={{ textAlign: 'center', width: '100%' }}>
                        <h3
                            style={{
                                fontFamily: NAMES,
                                fontSize: 'clamp(32px, 8vw, 52px)',
                                fontWeight: 500,
                                color: theme.ink,
                                margin: 0,
                                lineHeight: 1.12,
                            }}
                        >
                            {firstName}
                        </h3>
                        {firstParents && (
                            <p style={{ margin: '10px 0 0', color: theme.sub, fontSize: 16 }}>{firstParents}</p>
                        )}
                    </Reveal>

                    <Reveal still={still} delay={0.15} style={{ width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
                            <span style={{ width: 54, height: 1, background: theme.line }} />
                            <span
                                style={{
                                    fontFamily: SERIF,
                                    fontStyle: 'italic',
                                    fontSize: 'clamp(30px, 7vw, 44px)',
                                    color: theme.accent,
                                    lineHeight: 1,
                                }}
                            >
                                &amp;
                            </span>
                            <span style={{ width: 54, height: 1, background: theme.line }} />
                        </div>
                    </Reveal>

                    <Reveal still={still} delay={0.25} style={{ textAlign: 'center', width: '100%' }}>
                        <h3
                            style={{
                                fontFamily: NAMES,
                                fontSize: 'clamp(32px, 8vw, 52px)',
                                fontWeight: 500,
                                color: theme.ink,
                                margin: 0,
                                lineHeight: 1.12,
                            }}
                        >
                            {secondName}
                        </h3>
                        {secondParents && (
                            <p style={{ margin: '10px 0 0', color: theme.sub, fontSize: 16 }}>{secondParents}</p>
                        )}
                    </Reveal>
                </div>
            </SectionShell>

            <PrayerSection text={data.prayer} primary={theme.ink} accent={theme.accent} secondary={theme.sub} serif={SERIF} />

            {/* ---------------------------------------------------------- */}
            {/* 4. DATE + COUNTDOWN                                         */}
            {/* ---------------------------------------------------------- */}
            <SectionShell>
                <SectionHead theme={theme} still={still} eyebrow={tr("Menuju Hari Bahagia")} title={tr("Kira Detik")} />

                <Reveal still={still}>
                    <div style={{ textAlign: 'center' }}>
                        {data.dateLabel && (
                            <div
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    fontFamily: SERIF,
                                    fontSize: 'clamp(24px, 5.5vw, 34px)',
                                    color: theme.ink,
                                }}
                            >
                                <Calendar size={20} strokeWidth={1.4} color={theme.accent} />
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
                                    marginTop: 12,
                                    color: theme.sub,
                                    fontSize: 16,
                                }}
                            >
                                <Clock size={16} strokeWidth={1.4} color={theme.accent} />
                                {data.timeLabel}
                            </div>
                        )}
                        {data.hijriLabel && (
                            <div style={{ marginTop: 6, color: theme.sub, fontStyle: 'italic', fontFamily: SERIF, fontSize: 18 }}>
                                {data.hijriLabel}
                            </div>
                        )}
                    </div>
                </Reveal>

                {countdown && (
                    <Reveal still={still} delay={0.15}>
                        <div
                            style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                justifyContent: 'center',
                                marginTop: 44,
                            }}
                        >
                            <CountUnit theme={theme} value={countdown.days} label={tr("Hari")} divider={false} />
                            <CountUnit theme={theme} value={countdown.hours} label={tr("Jam")} divider />
                            <CountUnit theme={theme} value={countdown.minutes} label={tr("Minit")} divider />
                            <CountUnit theme={theme} value={countdown.seconds} label={tr("Saat")} divider />
                        </div>
                    </Reveal>
                )}
            </SectionShell>

            {/* ---------------------------------------------------------- */}
            {/* 5. ATUR CARA                                                */}
            {/* ---------------------------------------------------------- */}
            <PkSec name="program">{data.program && data.program.length > 0 && (
                <SectionShell background={theme.card}>
                    <SectionHead theme={theme} still={still} eyebrow={tr("Rentak Majlis")} title={tr("Atur Cara")} />

                    <div style={{ position: 'relative', maxWidth: 460, margin: '0 auto' }}>
                        <div
                            aria-hidden="true"
                            style={{ position: 'absolute', left: 4, top: 8, bottom: 8, width: 1, background: theme.line }}
                        />
                        {data.program.map((item: ProgramItem, i: number) => (
                            <Reveal
                                key={`${item.time}-${i}`}
                                still={still}
                                delay={i * 0.07}
                                y={16}
                                style={{ position: 'relative', paddingLeft: 34, marginBottom: 30 }}
                            >
                                <span
                                    aria-hidden="true"
                                    style={{
                                        position: 'absolute',
                                        left: 0,
                                        top: 9,
                                        width: 9,
                                        height: 9,
                                        borderRadius: '50%',
                                        background: theme.bg,
                                        border: `1.5px solid ${theme.accent}`,
                                    }}
                                />
                                <div style={{ ...CAPS, fontSize: 11, letterSpacing: '0.22em', color: theme.accent }}>
                                    {item.time}
                                </div>
                                <div
                                    style={{
                                        fontFamily: SERIF,
                                        fontSize: 'clamp(22px, 5vw, 28px)',
                                        color: theme.ink,
                                        marginTop: 4,
                                        lineHeight: 1.2,
                                    }}
                                >
                                    {item.title}
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </SectionShell>
            )}</PkSec>

            {/* ---------------------------------------------------------- */}
            {/* 6. LOKASI                                                   */}
            {/* ---------------------------------------------------------- */}
            <PkSec name="location">{(data.venueName || data.venueAddress || data.mapsUrl || data.wazeUrl) && (
                <SectionShell>
                    <SectionHead theme={theme} still={still} eyebrow={tr("Tempat Berlangsung")} title={tr("Lokasi")} />
                    <Reveal still={still}>
                        <div style={{ textAlign: 'center' }}>
                            {data.venueName && (
                                <h3
                                    style={{
                                        fontFamily: SERIF,
                                        fontSize: 'clamp(26px, 6vw, 38px)',
                                        fontWeight: 500,
                                        color: theme.ink,
                                        margin: 0,
                                    }}
                                >
                                    {data.venueName}
                                </h3>
                            )}
                            {data.venueAddress && (
                                <p style={{ color: theme.sub, fontSize: 17, maxWidth: 440, margin: '14px auto 0' }}>
                                    {data.venueAddress}
                                </p>
                            )}
                            {(data.mapsUrl || data.wazeUrl) && (
                                <div
                                    style={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        justifyContent: 'center',
                                        gap: 14,
                                        marginTop: 30,
                                    }}
                                >
                                    {data.mapsUrl && (
                                        <a href={data.mapsUrl} target="_blank" rel="noopener noreferrer" style={solidBtn}>
                                            <MapPin size={15} strokeWidth={1.6} />
                                            Google Maps
                                        </a>
                                    )}
                                    {data.wazeUrl && (
                                        <a href={data.wazeUrl} target="_blank" rel="noopener noreferrer" style={ghostBtn}>
                                            <Navigation size={15} strokeWidth={1.6} />
                                            Waze
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>
                    </Reveal>
                </SectionShell>
            )}</PkSec>

            {/* ---------------------------------------------------------- */}
            {/* 7. RSVP                                                     */}
            {/* ---------------------------------------------------------- */}
            <PkSec name="rsvp">{slots?.rsvp && (
                <SectionShell background={theme.card}>
                    <SectionHead theme={theme} still={still} eyebrow={tr("Khabarkan Kehadiran")} title={tr("RSVP")} />
                    <Reveal still={still}>{slots.rsvp}</Reveal>
                </SectionShell>
            )}</PkSec>

            {/* ---------------------------------------------------------- */}
            {/* 8. UCAPAN                                                   */}
            {/* ---------------------------------------------------------- */}
            <PkSec name="wishes"><SectionShell>
                <SectionHead theme={theme} still={still} eyebrow={tr("Doa & Restu")} title={tr("Ucapan")} />
                <Reveal still={still}>
                    {slots?.wishes ?? (
                        <div
                            style={{
                                border: `1px solid ${theme.line}`,
                                borderRadius: 4,
                                padding: '38px 26px',
                                textAlign: 'center',
                                background: theme.card,
                            }}
                        >
                            <p style={{ margin: 0, color: theme.sub, fontSize: 17 }}>Ruangan ucapan akan dipaparkan di sini.</p>
                            <p style={{ margin: '8px 0 0', color: theme.sub, fontSize: 14, fontStyle: 'italic' }}>
                                Tinggalkan kata-kata aluan buat pengantin.
                            </p>
                        </div>
                    )}
                </Reveal>
            </SectionShell></PkSec>

            {/* ---------------------------------------------------------- */}
            {/* 8b. SENARAI HADIAH                                          */}
            {/* ---------------------------------------------------------- */}
            <PkSec name="wishlist">{slots?.wishlist && (
                <SectionShell>
                    <SectionHead theme={theme} still={still} eyebrow={tr("Tanda Ingatan")} title={tr("Senarai Hadiah")} />
                    <Reveal still={still}>{slots.wishlist}</Reveal>
                </SectionShell>
            )}</PkSec>

            {/* ---------------------------------------------------------- */}
            {/* 9. HUBUNGI                                                  */}
            {/* ---------------------------------------------------------- */}
            <PkSec name="contacts">{data.contacts && data.contacts.length > 0 && (
                <SectionShell background={theme.card}>
                    <SectionHead theme={theme} still={still} eyebrow={tr("Sebarang Pertanyaan")} title={tr("Hubungi")} />
                    <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))' }}>
                        {data.contacts.map((c: Contact, i: number) => (
                            <Reveal key={`${c.phone}-${i}`} still={still} delay={i * 0.08}>
                                <a
                                    href={`tel:${c.phone.replace(/\s+/g, '')}`}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 16,
                                        padding: '18px 20px',
                                        borderRadius: 4,
                                        background: theme.bg,
                                        border: `1px solid ${theme.line}`,
                                        textDecoration: 'none',
                                        color: theme.text,
                                    }}
                                >
                                    <span
                                        style={{
                                            flex: '0 0 auto',
                                            width: 42,
                                            height: 42,
                                            borderRadius: '50%',
                                            border: `1px solid ${theme.accent}`,
                                            color: theme.accent,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <Phone size={17} strokeWidth={1.6} />
                                    </span>
                                    <span style={{ minWidth: 0 }}>
                                        <span
                                            style={{
                                                display: 'block',
                                                fontFamily: SERIF,
                                                fontSize: 21,
                                                color: theme.ink,
                                                lineHeight: 1.2,
                                            }}
                                        >
                                            {c.name}
                                        </span>
                                        {c.role && (
                                            <span style={{ display: 'block', fontSize: 13, color: theme.sub }}>{c.role}</span>
                                        )}
                                    </span>
                                </a>
                            </Reveal>
                        ))}
                    </div>
                </SectionShell>
            )}</PkSec>

            {/* ---------------------------------------------------------- */}
            {/* 10. SALAM KAUT                                              */}
            {/* ---------------------------------------------------------- */}
            <PkSec name="gift">{data.gift && (data.gift.bankName || data.gift.accountNo || data.gift.accountName) && (
                <SectionShell>
                    <SectionHead theme={theme} still={still} eyebrow={tr("Tanda Kasih")} title={tr("Salam Kaut")} />
                    <Reveal still={still}>
                        <div
                            style={{
                                maxWidth: 430,
                                margin: '0 auto',
                                border: `1px solid ${theme.line}`,
                                borderRadius: 4,
                                padding: '34px 28px',
                                textAlign: 'center',
                                background: theme.card,
                            }}
                        >
                            {data.gift.bankName && (
                                <div style={{ fontFamily: SERIF, fontSize: 28, color: theme.ink }}>{data.gift.bankName}</div>
                            )}
                            {data.gift.accountName && (
                                <div style={{ color: theme.sub, marginTop: 4 }}>{data.gift.accountName}</div>
                            )}
                            {data.gift.accountNo && (
                                <>
                                    <div
                                        style={{
                                            fontFamily: SERIF,
                                            fontSize: 26,
                                            letterSpacing: '0.08em',
                                            color: theme.ink,
                                            marginTop: 18,
                                        }}
                                    >
                                        {data.gift.accountNo}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleCopy}
                                        style={{
                                            ...(copied ? ghostBtn : solidBtn),
                                            marginTop: 20,
                                            padding: '11px 20px',
                                        }}
                                    >
                                        {copied ? <Check size={15} strokeWidth={1.8} /> : <Copy size={15} strokeWidth={1.6} />}
                                        {copied ? 'Telah disalin' : 'Salin nombor'}
                                    </button>
                                </>
                            )}
                            {data.gift.note && (
                                <p style={{ marginTop: 20, color: theme.sub, fontStyle: 'italic', fontSize: 15 }}>
                                    {data.gift.note}
                                </p>
                            )}
                        </div>
                    </Reveal>
                </SectionShell>
            )}</PkSec>

            {/* ---------------------------------------------------------- */}
            {/* 11. GALERI                                                  */}
            {/* ---------------------------------------------------------- */}
            <PkSec name="gallery"><SectionShell background={theme.card}>
                <SectionHead theme={theme} still={still} eyebrow={tr("Kenangan")} title={tr("Galeri")} />
                <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                    {data.galleryImages && data.galleryImages.length > 0
                        ? data.galleryImages.map((src, i) => (
                              <Reveal key={`${src}-${i}`} still={still} delay={i * 0.05}>
                                  <div
                                      style={{
                                          borderRadius: 4,
                                          overflow: 'hidden',
                                          border: `1px solid ${theme.line}`,
                                          aspectRatio: '3 / 4',
                                          background: theme.bg,
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
                              <Reveal key={`ph-${i}`} still={still} delay={i * 0.07}>
                                  <div
                                      style={{
                                          borderRadius: 4,
                                          border: `1px solid ${theme.line}`,
                                          aspectRatio: '3 / 4',
                                          background: theme.bg,
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          gap: 8,
                                      }}
                                  >
                                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: theme.accent }} />
                                      <span style={{ ...CAPS, fontSize: 10, letterSpacing: '0.28em', color: theme.sub }}>
                                          Gambar
                                      </span>
                                  </div>
                              </Reveal>
                          ))}
                </div>
            </SectionShell></PkSec>

            {/* ---------------------------------------------------------- */}
            {/* 12. FOOTER                                                  */}
            {/* ---------------------------------------------------------- */}
            <footer style={{ textAlign: 'center', padding: 'clamp(72px, 13vw, 130px) 22px 56px' }}>
                <Reveal still={still}>
                    <div
                        style={{
                            fontFamily: NAMES,
                            fontSize: 'clamp(34px, 9vw, 56px)',
                            fontWeight: 500,
                            color: theme.ink,
                            lineHeight: 1.15,
                        }}
                    >
                        {firstShort}
                        <span style={{ color: theme.accent, fontStyle: 'italic', margin: '0 14px' }}>&amp;</span>
                        {secondShort}
                    </div>
                    <div
                        style={{
                            marginTop: 16,
                            fontFamily: SERIF,
                            fontStyle: 'italic',
                            fontSize: 'clamp(22px, 5.5vw, 30px)',
                            color: theme.sub,
                        }}
                    >
                        Terima Kasih
                    </div>
                    <Rule theme={theme} />
                </Reveal>
            </footer>
        </div>
    );
}
