// ============================================================
// Tipografi Moden — bold editorial-typography wedding e-invite.
// Type-led composition: oversized names, an outsized ampersand,
// a graphic date, thin drawn rules and generous negative space.
// Self-contained: all ornaments are original inline SVG / CSS.
// No external images, fonts, CDNs or network requests.
// ============================================================

import { useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
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

// ---------- typography ---------------------------------------------------
const DISPLAY = "'Helvetica Neue', 'Arial Nova', Helvetica, Arial, system-ui, sans-serif";
const BODY = "'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', sans-serif";
const MONO = "'SF Mono', ui-monospace, 'JetBrains Mono', 'Consolas', 'Courier New', monospace";
const SERIF = "Georgia, 'Times New Roman', 'Cormorant Garamond', serif";
const ARABIC = "'Traditional Arabic', 'Scheherazade New', 'Amiri', 'Noto Naskh Arabic', serif";

// Shared entrance easing — a confident, quick-out editorial curve.
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

// ---------- theme --------------------------------------------------------
interface Theme {
    primary: string;
    secondary: string;
    accent: string;
    bg: string;
    text: string;
    card: string;
    line: string;
    faint: string;
}

// =========================================================================
//  Kinetic-type + motion helpers
// =========================================================================

/**
 * Clip-reveal: the text sits inside an overflow:hidden box and slides up
 * from translateY(115%) → 0. Transform only — GPU cheap. Static when motion
 * is off (preview / reduced-motion), showing the final resting position.
 */
function ClipText({
    children,
    motionOn,
    delay = 0,
    trigger = 'scroll',
    style,
}: {
    children: ReactNode;
    motionOn: boolean;
    delay?: number;
    trigger?: 'scroll' | 'mount';
    style?: CSSProperties;
}) {
    const box: CSSProperties = { overflow: 'hidden', ...style };

    if (!motionOn) {
        return (
            <div style={box}>
                <div>{children}</div>
            </div>
        );
    }

    const transition = { duration: 0.85, delay, ease: EASE };

    if (trigger === 'mount') {
        return (
            <div style={box}>
                <motion.div
                    initial={{ y: '115%' }}
                    animate={{ y: '0%' }}
                    transition={transition}
                    style={{ willChange: 'transform' }}
                >
                    {children}
                </motion.div>
            </div>
        );
    }

    return (
        <div style={box}>
            <motion.div
                initial={{ y: '115%' }}
                whileInView={{ y: '0%' }}
                viewport={{ once: true, amount: 0.15 }}
                transition={transition}
                style={{ willChange: 'transform' }}
            >
                {children}
            </motion.div>
        </div>
    );
}

/** A thin horizontal rule that draws itself in via scaleX 0 → 1 (transform only). */
function Rule({
    motionOn,
    color,
    delay = 0,
    thickness = 1,
    style,
}: {
    motionOn: boolean;
    color: string;
    delay?: number;
    thickness?: number;
    style?: CSSProperties;
}) {
    const base: CSSProperties = {
        height: thickness,
        width: '100%',
        background: color,
        transformOrigin: 'left center',
        ...style,
    };

    if (!motionOn) {
        return <div aria-hidden="true" style={{ ...base, transform: 'scaleX(1)' }} />;
    }

    return (
        <motion.div
            aria-hidden="true"
            style={{ ...base, willChange: 'transform' }}
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.9, delay, ease: EASE }}
        />
    );
}

/** Generic fade + rise for content blocks. Static when motion is off. */
function Reveal({
    children,
    motionOn,
    delay = 0,
    y = 24,
    style,
}: {
    children: ReactNode;
    motionOn: boolean;
    delay?: number;
    y?: number;
    style?: CSSProperties;
}) {
    if (!motionOn) {
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

// =========================================================================
//  Section heading — editorial: index · eyebrow · big clip-in title · rule
// =========================================================================

function SectionHeading({
    theme,
    motionOn,
    index,
    eyebrow,
    title,
}: {
    theme: Theme;
    motionOn: boolean;
    index: string;
    eyebrow: string;
    title: string;
}) {
    return (
        <div style={{ marginBottom: 'clamp(34px, 6vw, 58px)' }}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 14,
                    marginBottom: 16,
                }}
            >
                <span
                    style={{
                        fontFamily: MONO,
                        fontSize: 13,
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        color: theme.accent,
                    }}
                >
                    {index}
                </span>
                <span
                    style={{
                        fontFamily: MONO,
                        fontSize: 12,
                        letterSpacing: '0.28em',
                        textTransform: 'uppercase',
                        color: theme.secondary,
                    }}
                >
                    {eyebrow}
                </span>
            </div>
            <ClipText motionOn={motionOn}>
                <h2
                    style={{
                        fontFamily: DISPLAY,
                        fontSize: 'clamp(34px, 8vw, 66px)',
                        fontWeight: 800,
                        letterSpacing: '-0.025em',
                        lineHeight: 0.98,
                        color: theme.primary,
                        margin: 0,
                    }}
                >
                    {title}
                </h2>
            </ClipText>
            <Rule motionOn={motionOn} color={theme.line} delay={0.15} style={{ marginTop: 22 }} />
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

function CountUnit({ theme, value, label }: { theme: Theme; value: number; label: string }) {
    return (
        <div style={{ textAlign: 'left' }}>
            <div
                style={{
                    fontFamily: DISPLAY,
                    fontSize: 'clamp(46px, 13vw, 88px)',
                    fontWeight: 800,
                    letterSpacing: '-0.04em',
                    lineHeight: 0.82,
                    color: theme.primary,
                    fontVariantNumeric: 'tabular-nums',
                }}
            >
                {String(value).padStart(2, '0')}
            </div>
            <div
                style={{
                    fontFamily: MONO,
                    fontSize: 11,
                    letterSpacing: '0.24em',
                    textTransform: 'uppercase',
                    color: theme.secondary,
                    marginTop: 12,
                }}
            >
                {label}
            </div>
        </div>
    );
}

// =========================================================================
//  Layout primitive — left-aligned editorial column
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
                padding: 'clamp(60px, 12vw, 128px) clamp(20px, 7vw, 68px)',
                background,
                ...style,
            }}
        >
            <div style={{ maxWidth: 900, margin: '0 auto', position: 'relative', zIndex: 1 }}>{children}</div>
        </section>
    );
}

// Derive a big graphic date "DD.MM.YY" from an ISO string.
function bigDateFrom(iso?: string): string | null {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}.${mm}.${yy}`;
}

// =========================================================================
//  Main template
// =========================================================================

export default function TypografiTemplate({ data, preview, slots }: TemplateProps) {
    const tr = useCardText();
    const reduce = useReducedMotion() ?? false;
    const motionOn = !preview && !reduce;

    const p = data.palette;
    const theme: Theme = {
        primary: p?.primary ?? '#161616',
        secondary: p?.secondary ?? '#6b6b6b',
        accent: p?.accent ?? '#c0553b',
        bg: p?.bg ?? '#f7f5f1',
        text: p?.text ?? '#222222',
        card: '#ffffff',
        line: 'rgba(22,22,22,0.16)',
        faint: 'rgba(22,22,22,0.028)',
    };

    const groomShort = data.groomShort ?? data.groomName;
    const brideShort = data.brideShort ?? data.brideName;

    const countdown = useCountdown(data.receptionAt);
    const bigDate = bigDateFrom(data.receptionAt ?? data.akadAt);

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
        fontSize: 17,
        lineHeight: 1.7,
        color: theme.text,
        background: theme.bg,
        WebkitFontSmoothing: 'antialiased',
        overflowX: 'hidden',
    };

    const eyebrowStyle: CSSProperties = {
        fontFamily: MONO,
        fontSize: 12,
        letterSpacing: '0.28em',
        textTransform: 'uppercase',
        color: theme.secondary,
    };

    const buttonBase: CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: '15px 26px',
        borderRadius: 2,
        fontFamily: MONO,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        textDecoration: 'none',
        cursor: 'pointer',
        border: `1.5px solid ${theme.primary}`,
        transition: 'transform 0.15s ease',
    };

    return (
        <div style={rootStyle}>
            <style>{`
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
                    justifyContent: 'center',
                    padding: 'clamp(72px, 14vw, 120px) clamp(20px, 7vw, 68px) clamp(72px, 12vw, 110px)',
                    // Clear the absolutely-positioned scroll cue below (~66px tall from the
                    // bottom edge) so centred content can never sit underneath it.
                    paddingBottom: 'var(--pk-cue-clear, 96px)',
                    overflow: 'hidden',
                }}
            >
                <div style={{ width: '100%', maxWidth: 900, margin: '0 auto' }}>
                    {/* top kicker + drawn rule */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 18,
                            marginBottom: 'clamp(26px, 5vw, 44px)',
                        }}
                    >
                        <span style={eyebrowStyle}>Raikan Cinta</span>
                        <div style={{ flex: 1 }}>
                            <Rule motionOn={motionOn} color={theme.line} delay={0.1} />
                        </div>
                    </div>

                    {data.bismillah && (
                        <motion.div
                            initial={motionOn ? { opacity: 0, y: -10 } : false}
                            animate={motionOn ? { opacity: 1, y: 0 } : undefined}
                            transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
                            style={{ direction: 'rtl', marginBottom: 'clamp(18px, 4vw, 30px)' }}
                        >
                            <div
                                style={{
                                    fontFamily: ARABIC,
                                    fontSize: 'clamp(22px, 5.5vw, 34px)',
                                    color: theme.primary,
                                    lineHeight: 1.9,
                                }}
                            >
                                بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ
                            </div>
                        </motion.div>
                    )}

                    {/* oversized name stack — the design */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <ClipText motionOn={motionOn} trigger="mount" delay={0.1}>
                            <div
                                style={{
                                    fontFamily: DISPLAY,
                                    fontSize: 'clamp(56px, 20vw, 118px)',
                                    fontWeight: 800,
                                    letterSpacing: '-0.045em',
                                    lineHeight: 0.9,
                                    color: theme.primary,
                                }}
                            >
                                {groomShort}
                            </div>
                        </ClipText>

                        {motionOn ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.6 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.7, delay: 0.32, ease: EASE }}
                                style={{
                                    willChange: 'transform',
                                    transformOrigin: 'left center',
                                    fontFamily: SERIF,
                                    fontStyle: 'italic',
                                    fontWeight: 500,
                                    fontSize: 'clamp(44px, 14vw, 92px)',
                                    lineHeight: 0.9,
                                    color: theme.secondary,
                                    margin: 'clamp(4px, 1.4vw, 12px) 0',
                                }}
                            >
                                &amp;
                            </motion.div>
                        ) : (
                            <div
                                style={{
                                    fontFamily: SERIF,
                                    fontStyle: 'italic',
                                    fontWeight: 500,
                                    fontSize: 'clamp(44px, 14vw, 92px)',
                                    lineHeight: 0.9,
                                    color: theme.secondary,
                                    margin: 'clamp(4px, 1.4vw, 12px) 0',
                                }}
                            >
                                &amp;
                            </div>
                        )}

                        <ClipText motionOn={motionOn} trigger="mount" delay={0.42}>
                            <div
                                style={{
                                    fontFamily: DISPLAY,
                                    fontSize: 'clamp(56px, 20vw, 118px)',
                                    fontWeight: 800,
                                    letterSpacing: '-0.045em',
                                    lineHeight: 0.9,
                                    color: theme.primary,
                                }}
                            >
                                {brideShort}
                            </div>
                        </ClipText>
                    </div>

                    <Rule
                        motionOn={motionOn}
                        color={theme.line}
                        delay={0.6}
                        style={{ margin: 'clamp(32px, 6vw, 52px) 0 clamp(26px, 5vw, 42px)' }}
                    />

                    {/* date as a big graphic element — the single accent pop */}
                    <div
                        style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'flex-end',
                            justifyContent: 'space-between',
                            gap: 'clamp(16px, 4vw, 40px)',
                        }}
                    >
                        {bigDate && (
                            <ClipText motionOn={motionOn} trigger="mount" delay={0.62}>
                                <div
                                    style={{
                                        fontFamily: DISPLAY,
                                        fontSize: 'clamp(46px, 15vw, 104px)',
                                        fontWeight: 800,
                                        letterSpacing: '-0.03em',
                                        lineHeight: 0.9,
                                        color: theme.accent,
                                        fontVariantNumeric: 'tabular-nums',
                                    }}
                                >
                                    {bigDate}
                                </div>
                            </ClipText>
                        )}

                        <div style={{ textAlign: 'left', paddingBottom: 6 }}>
                            <div style={{ ...eyebrowStyle, marginBottom: 8 }}>Walimatulurus</div>
                            {data.dateLabel && (
                                <div
                                    style={{
                                        fontFamily: DISPLAY,
                                        fontSize: 'clamp(17px, 3.6vw, 22px)',
                                        fontWeight: 600,
                                        color: theme.primary,
                                        lineHeight: 1.25,
                                    }}
                                >
                                    {data.dateLabel}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* scroll cue */}
                <motion.div
                    initial={motionOn ? { opacity: 0 } : false}
                    animate={motionOn ? { opacity: 1 } : undefined}
                    transition={{ duration: 1, delay: 1.1 }}
                    style={{
                        position: 'absolute',
                        bottom: 26,
                        left: 'clamp(20px, 7vw, 68px)',
                        zIndex: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        color: theme.secondary,
                    }}
                >
                    <span style={{ ...eyebrowStyle }}>Skrol</span>
                    <motion.div
                        animate={motionOn ? { y: [0, 8, 0] } : undefined}
                        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                        style={{ willChange: 'transform', display: 'flex' }}
                    >
                        <ChevronDown size={20} />
                    </motion.div>
                </motion.div>
            </section>

            {/* ---------------------------------------------------------- */}
            {/* 2. OPENING                                                  */}
            {/* ---------------------------------------------------------- */}
            {data.openingLine && (
                <Section>
                    <Rule motionOn={motionOn} color={theme.line} style={{ marginBottom: 'clamp(28px, 5vw, 44px)' }} />
                    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                        <Heart
                            size={26}
                            color={theme.accent}
                            style={{ flex: '0 0 auto', marginTop: 'clamp(8px, 2vw, 18px)' }}
                        />
                        <ClipText motionOn={motionOn}>
                            <p
                                style={{
                                    fontFamily: DISPLAY,
                                    fontSize: 'clamp(26px, 6.4vw, 54px)',
                                    fontWeight: 700,
                                    letterSpacing: '-0.02em',
                                    lineHeight: 1.12,
                                    color: theme.primary,
                                    margin: 0,
                                    maxWidth: 760,
                                }}
                            >
                                {data.openingLine}
                            </p>
                        </ClipText>
                    </div>
                </Section>
            )}

            {/* ---------------------------------------------------------- */}
            {/* 3. COUPLE                                                   */}
            {/* ---------------------------------------------------------- */}
            <Section background={theme.faint}>
                <SectionHeading theme={theme} motionOn={motionOn} index="01" eyebrow={tr("Pasangan Bahagia")} title={tr("Pengantin")} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(24px, 5vw, 44px)' }}>
                    <div>
                        <ClipText motionOn={motionOn}>
                            <h3
                                style={{
                                    fontFamily: DISPLAY,
                                    fontSize: 'clamp(32px, 8vw, 62px)',
                                    fontWeight: 800,
                                    letterSpacing: '-0.03em',
                                    lineHeight: 0.95,
                                    color: theme.primary,
                                    margin: 0,
                                }}
                            >
                                {data.groomName}
                            </h3>
                        </ClipText>
                        {data.groomParents && (
                            <Reveal motionOn={motionOn} delay={0.1}>
                                <p style={{ margin: '12px 0 0', color: theme.secondary, fontSize: 16 }}>
                                    {data.groomParents}
                                </p>
                            </Reveal>
                        )}
                    </div>

                    <div
                        style={{
                            fontFamily: SERIF,
                            fontStyle: 'italic',
                            fontSize: 'clamp(40px, 10vw, 72px)',
                            lineHeight: 0.8,
                            color: theme.secondary,
                        }}
                    >
                        &amp;
                    </div>

                    <div>
                        <ClipText motionOn={motionOn} delay={0.05}>
                            <h3
                                style={{
                                    fontFamily: DISPLAY,
                                    fontSize: 'clamp(32px, 8vw, 62px)',
                                    fontWeight: 800,
                                    letterSpacing: '-0.03em',
                                    lineHeight: 0.95,
                                    color: theme.primary,
                                    margin: 0,
                                }}
                            >
                                {data.brideName}
                            </h3>
                        </ClipText>
                        {data.brideParents && (
                            <Reveal motionOn={motionOn} delay={0.1}>
                                <p style={{ margin: '12px 0 0', color: theme.secondary, fontSize: 16 }}>
                                    {data.brideParents}
                                </p>
                            </Reveal>
                        )}
                    </div>
                </div>
            </Section>

            {/* ---------------------------------------------------------- */}
            {/* 4. DATE + COUNTDOWN                                         */}
            {/* ---------------------------------------------------------- */}
            <Section>
                <SectionHeading
                    theme={theme}
                    motionOn={motionOn}
                    index="02"
                    eyebrow={tr("Menuju Hari Bahagia")}
                    title={tr("Kira Detik Bahagia")}
                />

                <Reveal motionOn={motionOn}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {data.dateLabel && (
                            <div
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    fontFamily: DISPLAY,
                                    fontSize: 'clamp(22px, 5.2vw, 34px)',
                                    fontWeight: 700,
                                    letterSpacing: '-0.01em',
                                    color: theme.primary,
                                }}
                            >
                                <Calendar size={22} color={theme.secondary} />
                                {data.dateLabel}
                            </div>
                        )}
                        {data.timeLabel && (
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    color: theme.secondary,
                                    fontSize: 17,
                                }}
                            >
                                <Clock size={17} color={theme.secondary} />
                                {data.timeLabel}
                            </div>
                        )}
                        {data.hijriLabel && (
                            <div style={{ color: theme.secondary, fontStyle: 'italic' }}>{data.hijriLabel}</div>
                        )}
                    </div>
                </Reveal>

                {countdown && (
                    <Reveal motionOn={motionOn} delay={0.12} style={{ marginTop: 'clamp(34px, 6vw, 56px)' }}>
                        <div style={{ borderTop: `1px solid ${theme.line}`, paddingTop: 'clamp(24px, 4vw, 34px)' }}>
                            <div
                                style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: 'clamp(22px, 7vw, 68px)',
                                }}
                            >
                                <CountUnit theme={theme} value={countdown.days} label={tr("Hari")} />
                                <CountUnit theme={theme} value={countdown.hours} label={tr("Jam")} />
                                <CountUnit theme={theme} value={countdown.minutes} label={tr("Minit")} />
                                <CountUnit theme={theme} value={countdown.seconds} label={tr("Saat")} />
                            </div>
                        </div>
                    </Reveal>
                )}
            </Section>

            {/* ---------------------------------------------------------- */}
            {/* 5. ATUR CARA                                                */}
            {/* ---------------------------------------------------------- */}
            <PkSec name="program">{data.program && data.program.length > 0 && (
                <Section background={theme.faint}>
                    <SectionHeading theme={theme} motionOn={motionOn} index="03" eyebrow={tr("Rentak Majlis")} title={tr("Atur Cara")} />

                    <div>
                        {data.program.map((item: ProgramItem, i: number) => (
                            <Reveal key={`${item.time}-${i}`} motionOn={motionOn} delay={i * 0.06} y={18}>
                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'minmax(84px, 130px) 1fr',
                                        gap: 'clamp(16px, 5vw, 44px)',
                                        alignItems: 'baseline',
                                        padding: 'clamp(18px, 3vw, 26px) 0',
                                        borderTop: `1px solid ${theme.line}`,
                                    }}
                                >
                                    <div
                                        style={{
                                            fontFamily: MONO,
                                            fontSize: 13,
                                            letterSpacing: '0.1em',
                                            textTransform: 'uppercase',
                                            color: theme.secondary,
                                            fontWeight: 700,
                                        }}
                                    >
                                        {item.time}
                                    </div>
                                    <div
                                        style={{
                                            fontFamily: DISPLAY,
                                            fontSize: 'clamp(22px, 5vw, 36px)',
                                            fontWeight: 700,
                                            letterSpacing: '-0.02em',
                                            lineHeight: 1.05,
                                            color: theme.primary,
                                        }}
                                    >
                                        {item.title}
                                    </div>
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
                        motionOn={motionOn}
                        index="04"
                        eyebrow={tr("Tempat Berlangsung")}
                        title={tr("Lokasi Majlis")}
                    />
                    <Reveal motionOn={motionOn}>
                        <div>
                            {data.venueName && (
                                <h3
                                    style={{
                                        fontFamily: DISPLAY,
                                        fontSize: 'clamp(26px, 6vw, 42px)',
                                        fontWeight: 700,
                                        letterSpacing: '-0.02em',
                                        lineHeight: 1.05,
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
                                        maxWidth: 520,
                                        margin: '14px 0 0',
                                    }}
                                >
                                    {data.venueAddress}
                                </p>
                            )}
                            <div
                                style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: 12,
                                    marginTop: 'clamp(26px, 5vw, 38px)',
                                }}
                            >
                                {data.mapsUrl && (
                                    <a
                                        href={data.mapsUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            ...buttonBase,
                                            background: theme.primary,
                                            color: theme.bg,
                                            borderColor: theme.primary,
                                        }}
                                    >
                                        <MapPin size={16} />
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
                                        <Navigation size={16} />
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
                <Section background={theme.faint}>
                    <SectionHeading theme={theme} motionOn={motionOn} index="05" eyebrow={tr("Khabarkan Kehadiran")} title={tr("RSVP Kehadiran")} />
                    <Reveal motionOn={motionOn}>{slots.rsvp}</Reveal>
                </Section>
            )}</PkSec>

            {/* ---------------------------------------------------------- */}
            {/* 8. UCAPAN                                                   */}
            {/* ---------------------------------------------------------- */}
            <PkSec name="wishes"><Section>
                <SectionHeading theme={theme} motionOn={motionOn} index="06" eyebrow={tr("Doa & Restu")} title={tr("Ucapan Kasih")} />
                <Reveal motionOn={motionOn}>
                    {slots?.wishes ?? (
                        <div
                            style={{
                                background: theme.card,
                                border: `1px solid ${theme.line}`,
                                borderRadius: 3,
                                padding: 'clamp(28px, 6vw, 46px)',
                            }}
                        >
                            <p style={{ margin: 0, color: theme.secondary, fontSize: 17 }}>
                                Ruangan ucapan akan dipaparkan di sini.
                            </p>
                            <p style={{ margin: '8px 0 0', color: theme.secondary, fontSize: 14, fontStyle: 'italic' }}>
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
                    <SectionHeading theme={theme} motionOn={motionOn} index="06b" eyebrow={tr("Tanda Ingatan")} title={tr("Senarai Hadiah")} />
                    <Reveal motionOn={motionOn}>{slots.wishlist}</Reveal>
                </Section>
            )}</PkSec>

            {/* ---------------------------------------------------------- */}
            {/* 9. HUBUNGI                                                  */}
            {/* ---------------------------------------------------------- */}
            <PkSec name="contacts">{data.contacts && data.contacts.length > 0 && (
                <Section background={theme.faint}>
                    <SectionHeading theme={theme} motionOn={motionOn} index="07" eyebrow={tr("Sebarang Pertanyaan")} title={tr("Hubungi")} />
                    <div>
                        {data.contacts.map((c: Contact, i: number) => (
                            <Reveal key={`${c.phone}-${i}`} motionOn={motionOn} delay={i * 0.06} y={18}>
                                <a
                                    href={`tel:${c.phone.replace(/\s+/g, '')}`}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 18,
                                        padding: 'clamp(18px, 3vw, 24px) 0',
                                        borderTop: `1px solid ${theme.line}`,
                                        textDecoration: 'none',
                                        color: theme.text,
                                    }}
                                >
                                    <span
                                        style={{
                                            flex: '0 0 auto',
                                            width: 44,
                                            height: 44,
                                            borderRadius: 3,
                                            border: `1.5px solid ${theme.primary}`,
                                            color: theme.primary,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <Phone size={18} />
                                    </span>
                                    <span style={{ minWidth: 0, flex: 1 }}>
                                        <span
                                            style={{
                                                display: 'block',
                                                fontFamily: DISPLAY,
                                                fontSize: 'clamp(20px, 4.4vw, 28px)',
                                                fontWeight: 700,
                                                letterSpacing: '-0.01em',
                                                color: theme.primary,
                                                lineHeight: 1.15,
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
                                    <span
                                        style={{
                                            fontFamily: MONO,
                                            fontSize: 13,
                                            letterSpacing: '0.04em',
                                            color: theme.secondary,
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {c.phone}
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
                    <SectionHeading theme={theme} motionOn={motionOn} index="08" eyebrow={tr("Tanda Kasih")} title={tr("Salam Kasih")} />
                    <Reveal motionOn={motionOn}>
                        <div
                            style={{
                                maxWidth: 560,
                                background: theme.card,
                                border: `1px solid ${theme.line}`,
                                borderRadius: 3,
                                padding: 'clamp(28px, 6vw, 48px)',
                            }}
                        >
                            <Gift size={28} color={theme.secondary} />
                            {data.gift.bankName && (
                                <div
                                    style={{
                                        fontFamily: DISPLAY,
                                        fontSize: 'clamp(24px, 5.5vw, 36px)',
                                        fontWeight: 800,
                                        letterSpacing: '-0.02em',
                                        color: theme.primary,
                                        marginTop: 16,
                                    }}
                                >
                                    {data.gift.bankName}
                                </div>
                            )}
                            {data.gift.accountName && (
                                <div style={{ color: theme.secondary, marginTop: 4 }}>{data.gift.accountName}</div>
                            )}
                            {data.gift.accountNo && (
                                <div
                                    style={{
                                        marginTop: 22,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 16,
                                        flexWrap: 'wrap',
                                    }}
                                >
                                    <span
                                        style={{
                                            fontFamily: MONO,
                                            fontSize: 'clamp(22px, 5vw, 30px)',
                                            letterSpacing: '0.04em',
                                            color: theme.primary,
                                            fontWeight: 700,
                                        }}
                                    >
                                        {data.gift.accountNo}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleCopy}
                                        style={{
                                            ...buttonBase,
                                            padding: '11px 18px',
                                            background: copied ? theme.accent : theme.primary,
                                            color: theme.bg,
                                            borderColor: copied ? theme.accent : theme.primary,
                                        }}
                                    >
                                        {copied ? <Check size={15} /> : <Copy size={15} />}
                                        {copied ? 'Telah disalin' : 'Salin nombor'}
                                    </button>
                                </div>
                            )}
                            {data.gift.note && (
                                <p style={{ marginTop: 20, color: theme.secondary, fontStyle: 'italic', fontSize: 15 }}>
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
            <PkSec name="gallery"><Section background={theme.faint}>
                <SectionHeading theme={theme} motionOn={motionOn} index="09" eyebrow={tr("Kenangan")} title={tr("Galeri Memori")} />
                <div
                    style={{
                        display: 'grid',
                        gap: 14,
                        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    }}
                >
                    {data.galleryImages && data.galleryImages.length > 0
                        ? data.galleryImages.map((src, i) => (
                              <Reveal key={`${src}-${i}`} motionOn={motionOn} delay={i * 0.06}>
                                  <div
                                      style={{
                                          borderRadius: 3,
                                          overflow: 'hidden',
                                          border: `1px solid ${theme.line}`,
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
                              <Reveal key={`ph-${i}`} motionOn={motionOn} delay={i * 0.08}>
                                  <div
                                      style={{
                                          borderRadius: 3,
                                          border: `1px solid ${theme.line}`,
                                          aspectRatio: '3 / 4',
                                          background: theme.card,
                                          display: 'flex',
                                          flexDirection: 'column',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          gap: 10,
                                          color: theme.secondary,
                                      }}
                                  >
                                      <ImageIcon size={26} />
                                      <span
                                          style={{
                                              fontFamily: MONO,
                                              fontSize: 11,
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
                    padding: 'clamp(60px, 12vw, 120px) clamp(20px, 7vw, 68px) clamp(44px, 8vw, 64px)',
                    overflow: 'hidden',
                }}
            >
                <div style={{ maxWidth: 900, margin: '0 auto' }}>
                    <Rule motionOn={motionOn} color={theme.line} style={{ marginBottom: 'clamp(30px, 5vw, 48px)' }} />
                    <Reveal motionOn={motionOn}>
                        <div
                            style={{
                                fontFamily: DISPLAY,
                                fontSize: 'clamp(40px, 12vw, 88px)',
                                fontWeight: 800,
                                letterSpacing: '-0.04em',
                                lineHeight: 0.92,
                                color: theme.primary,
                                display: 'flex',
                                flexWrap: 'wrap',
                                alignItems: 'baseline',
                                gap: '0 18px',
                            }}
                        >
                            {groomShort}
                            <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 500, color: theme.secondary }}>
                                &amp;
                            </span>
                            {brideShort}
                        </div>
                        <div
                            style={{
                                marginTop: 20,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 10,
                                fontFamily: DISPLAY,
                                fontSize: 'clamp(20px, 5vw, 30px)',
                                fontWeight: 600,
                                color: theme.secondary,
                            }}
                        >
                            Terima Kasih
                            <Heart size={20} color={theme.accent} fill={theme.accent} />
                        </div>
                        <div
                            style={{
                                marginTop: 'clamp(30px, 6vw, 48px)',
                                fontFamily: MONO,
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
                </div>
            </footer>
        </div>
    );
}
