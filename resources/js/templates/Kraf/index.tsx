// ============================================================
// Kraf Rustik — rustic kraft-paper wedding e-invitation template.
// Self-contained: all ornaments are original inline SVG / CSS.
// No external images, fonts, CDNs or network requests.
//
// Signature cover: a kraft envelope tied with twine. On load the
// twine releases, the flap opens (rotateX from the top) and the
// invitation card slides up + zooms in to reveal the couple.
// Honors useReducedMotion + preview (both render the final content
// statically, skipping the intro choreography).
// ============================================================

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
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

// ---------- typography ---------------------------------------------------
const SERIF = "'Cormorant Garamond', 'Playfair Display', Georgia, 'Times New Roman', serif";
const BODY = "'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', sans-serif";
const ARABIC = "'Traditional Arabic', 'Scheherazade New', 'Amiri', 'Noto Naskh Arabic', serif";

// A soft "spring-out" ease for the card reveal.
const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

// ---------- theme --------------------------------------------------------
interface Theme {
    // honoured from data.palette
    primary: string;
    secondary: string;
    accent: string;
    bg: string;
    text: string;
    // rustic-kraft specifics (fixed identity)
    sage: string;
    sageDeep: string;
    twine: string;
    twineDeep: string;
    card: string;
    cardEdge: string;
    line: string;
    panel: string;
    envBack: string;
    envSide: string;
    envPocket: string;
    envFlap: string;
    envEdge: string;
}

// =========================================================================
//  Original SVG ornaments
// =========================================================================

/** A single sage line-art leaf (stroked outline + centre vein). */
function LeafOutline({ theme }: { theme: Theme }) {
    return (
        <g>
            <path
                d="M0 0 C 7 -6 7 -16 0 -22 C -7 -16 -7 -6 0 0 Z"
                fill={theme.sage}
                fillOpacity={0.28}
                stroke={theme.sageDeep}
                strokeWidth={1.3}
                strokeLinejoin="round"
            />
            <path d="M0 -2 L0 -19" stroke={theme.sageDeep} strokeWidth={0.9} strokeLinecap="round" />
        </g>
    );
}

/** A curved botanical sprig drawn as sage line-art. */
function Sprig({ theme, size = 96 }: { theme: Theme; size?: number }) {
    const leaves = [
        { x: 24, y: 15, r: -46 },
        { x: 40, y: 12, r: -20 },
        { x: 56, y: 14, r: 4 },
        { x: 70, y: 19, r: 26 },
        { x: 31, y: 30, r: -128 },
        { x: 47, y: 31, r: -160 },
        { x: 63, y: 33, r: -196 },
    ];
    return (
        <svg
            width={size}
            height={(size * 44) / 96}
            viewBox="0 0 96 44"
            role="img"
            aria-label="Ranting daun"
            style={{ display: 'block', overflow: 'visible' }}
        >
            <path
                d="M6 24 C 28 10, 52 10, 90 20"
                fill="none"
                stroke={theme.sageDeep}
                strokeWidth={1.6}
                strokeLinecap="round"
            />
            {leaves.map((l, i) => (
                <g key={i} transform={`translate(${l.x} ${l.y}) rotate(${l.r}) scale(0.62)`}>
                    <LeafOutline theme={theme} />
                </g>
            ))}
        </svg>
    );
}

/** Divider: a beaded twine line with a small knot and flanking leaves. */
function TwineDivider({ theme, width = 220 }: { theme: Theme; width?: number }) {
    const cx = width / 2;
    const gap = 22;
    const runL = `M18 14 H ${cx - gap}`;
    const runR = `M${cx + gap} 14 H ${width - 18}`;
    return (
        <svg
            width={width}
            height={30}
            viewBox={`0 0 ${width} 30`}
            aria-hidden="true"
            style={{ display: 'block', margin: '18px auto 0', overflow: 'visible' }}
        >
            {/* beaded twine — a thick dashed core over a thin continuous thread */}
            {[runL, runR].map((d, i) => (
                <g key={i}>
                    <path d={d} stroke={theme.twine} strokeWidth={1.4} strokeLinecap="round" />
                    <path d={d} stroke={theme.twineDeep} strokeWidth={3} strokeLinecap="round" strokeDasharray="1 6" />
                </g>
            ))}
            {/* flanking leaves */}
            <g transform={`translate(${cx - gap - 4} 14) rotate(-28) scale(0.6)`}>
                <LeafOutline theme={theme} />
            </g>
            <g transform={`translate(${cx + gap + 4} 14) rotate(28) scale(0.6)`}>
                <LeafOutline theme={theme} />
            </g>
            {/* centre knot */}
            <circle cx={cx} cy={14} r={5.5} fill={theme.twine} stroke={theme.twineDeep} strokeWidth={1.2} />
            <circle cx={cx} cy={14} r={2} fill={theme.twineDeep} />
        </svg>
    );
}

/** A leafy corner sprig for framing sections and gallery cards. */
function CornerSprig({ theme }: { theme: Theme }) {
    return (
        <svg width={116} height={116} viewBox="0 0 116 116" aria-hidden="true" style={{ display: 'block' }}>
            <path
                d="M8 8 C 42 22, 66 50, 82 96"
                fill="none"
                stroke={theme.sageDeep}
                strokeWidth={1.8}
                strokeLinecap="round"
            />
            {[
                { x: 24, y: 22, r: -40 },
                { x: 42, y: 42, r: -24 },
                { x: 58, y: 62, r: -8 },
                { x: 72, y: 86, r: 8 },
                { x: 18, y: 32, r: -84 },
                { x: 36, y: 54, r: -68 },
                { x: 54, y: 78, r: -52 },
            ].map((l, i) => (
                <g key={i} transform={`translate(${l.x} ${l.y}) rotate(${l.r}) scale(0.56)`}>
                    <LeafOutline theme={theme} />
                </g>
            ))}
        </svg>
    );
}

/** Cross-tie twine with a centre bow — overlaid on the closed envelope. */
function Twine({ theme }: { theme: Theme }) {
    return (
        <svg
            viewBox="0 0 360 240"
            preserveAspectRatio="none"
            aria-hidden="true"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        >
            {/* horizontal + vertical bands, beaded */}
            {['M14 122 H 346', 'M180 8 V 232'].map((d, i) => (
                <g key={i}>
                    <path d={d} stroke={theme.twine} strokeWidth={4} strokeLinecap="round" />
                    <path d={d} stroke={theme.twineDeep} strokeWidth={5.5} strokeLinecap="round" strokeDasharray="1.5 8" />
                </g>
            ))}
            {/* bow loops */}
            <g>
                <ellipse cx={162} cy={122} rx={17} ry={10} transform="rotate(-20 162 122)" fill={theme.twine} stroke={theme.twineDeep} strokeWidth={1.4} />
                <ellipse cx={198} cy={122} rx={17} ry={10} transform="rotate(20 198 122)" fill={theme.twine} stroke={theme.twineDeep} strokeWidth={1.4} />
                {/* tails */}
                <path d="M180 124 C 172 140, 168 150, 158 162" fill="none" stroke={theme.twineDeep} strokeWidth={3} strokeLinecap="round" />
                <path d="M180 124 C 188 140, 194 150, 204 162" fill="none" stroke={theme.twineDeep} strokeWidth={3} strokeLinecap="round" />
                {/* centre knot */}
                <circle cx={180} cy={122} r={7} fill={theme.twine} stroke={theme.twineDeep} strokeWidth={1.6} />
            </g>
        </svg>
    );
}

/** The kraft envelope body (back + folded sides + front pocket). */
function EnvelopeBody({ theme }: { theme: Theme }) {
    return (
        <svg viewBox="0 0 360 240" aria-hidden="true" style={{ display: 'block', width: '100%', height: 'auto' }}>
            <rect x={1} y={1} width={358} height={238} rx={10} fill={theme.envBack} stroke={theme.envEdge} strokeWidth={1.4} />
            <polygon points="1,6 180,120 1,234" fill={theme.envSide} stroke={theme.envEdge} strokeWidth={1} strokeLinejoin="round" />
            <polygon points="359,6 180,120 359,234" fill={theme.envSide} stroke={theme.envEdge} strokeWidth={1} strokeLinejoin="round" />
            <polygon points="1,239 359,239 180,112" fill={theme.envPocket} stroke={theme.envEdge} strokeWidth={1.2} strokeLinejoin="round" />
            {/* soft crease highlight */}
            <path d="M6 12 L180 118 L354 12" fill="none" stroke="rgba(255,248,232,0.35)" strokeWidth={1} />
        </svg>
    );
}

/** The hinged top flap (drawn closed; parent rotates it open). */
function EnvelopeFlap({ theme }: { theme: Theme }) {
    return (
        <svg viewBox="0 0 360 140" aria-hidden="true" style={{ display: 'block', width: '100%', height: 'auto' }}>
            <polygon points="1,4 359,4 180,134" fill={theme.envFlap} stroke={theme.envEdge} strokeWidth={1.4} strokeLinejoin="round" />
            <polygon points="10,8 350,8 180,120" fill="rgba(255,248,232,0.16)" />
            <path d="M180 134 L180 116" stroke={theme.envEdge} strokeWidth={1} strokeLinecap="round" opacity={0.5} />
        </svg>
    );
}

/** Ambient drifting seed-leaves (cover only, decorative). */
function Motes({ theme }: { theme: Theme }) {
    const items = useMemo(
        () =>
            Array.from({ length: 12 }, (_, i) => ({
                key: i,
                left: (i * 8.5 + 4) % 100,
                delay: (i % 6) * 1.6,
                dur: 11 + (i % 5) * 2.4,
                size: 10 + (i % 4) * 4,
                color: i % 2 ? theme.sage : theme.twineDeep,
                rot: (i * 53) % 360,
            })),
        [theme.sage, theme.twineDeep],
    );
    return (
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
            {items.map((m) => (
                <svg
                    key={m.key}
                    width={m.size}
                    height={m.size}
                    viewBox="0 0 20 22"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: `${m.left}%`,
                        transform: `rotate(${m.rot}deg)`,
                        animation: `pk-drift ${m.dur}s linear ${m.delay}s infinite`,
                        willChange: 'transform',
                    }}
                >
                    <path d="M10 1 C 16 6, 16 15, 10 21 C 4 15, 4 6, 10 1 Z" fill={m.color} opacity={0.45} />
                    <path d="M10 3 L10 19" stroke="rgba(60,45,25,0.25)" strokeWidth={0.8} />
                </svg>
            ))}
        </div>
    );
}

// =========================================================================
//  Motion + layout primitives
// =========================================================================

function Reveal({
    children,
    motionOff,
    delay = 0,
    y = 26,
    style,
}: {
    children: ReactNode;
    motionOff: boolean;
    delay?: number;
    y?: number;
    style?: CSSProperties;
}) {
    if (motionOff) {
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
        <section style={{ position: 'relative', padding: 'clamp(58px, 11vw, 116px) 20px', background, ...style }}>
            <div style={{ maxWidth: 720, margin: '0 auto', position: 'relative', zIndex: 1 }}>{children}</div>
        </section>
    );
}

/** A cream paper card on the kraft ground, with a dashed stitched inner frame. */
function KraftCard({ theme, children, style }: { theme: Theme; children: ReactNode; style?: CSSProperties }) {
    return (
        <div
            style={{
                position: 'relative',
                background: theme.card,
                borderRadius: 16,
                border: `1px solid ${theme.cardEdge}`,
                boxShadow: '0 16px 38px rgba(66,48,31,0.16)',
                ...style,
            }}
        >
            <div
                aria-hidden="true"
                style={{ position: 'absolute', inset: 9, border: `1px dashed ${theme.line}`, borderRadius: 10, pointerEvents: 'none' }}
            />
            <div style={{ position: 'relative' }}>{children}</div>
        </div>
    );
}

/** A strip of translucent "washi tape". */
function Tape({ theme, style }: { theme: Theme; style?: CSSProperties }) {
    return (
        <span
            aria-hidden="true"
            style={{
                position: 'absolute',
                width: 72,
                height: 24,
                background: theme.twine,
                opacity: 0.5,
                borderLeft: `1px dashed ${theme.twineDeep}`,
                borderRight: `1px dashed ${theme.twineDeep}`,
                boxShadow: '0 1px 3px rgba(60,45,25,0.14)',
                ...style,
            }}
        />
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
                        letterSpacing: '0.3em',
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
            <TwineDivider theme={theme} />
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
        if (Number.isNaN(new Date(target).getTime())) return;
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

/** A kraft "hang tag" tied with a tiny twine loop. */
function CountdownTag({ theme, value, label }: { theme: Theme; value: number; label: string }) {
    return (
        <div
            style={{
                position: 'relative',
                minWidth: 74,
                padding: '20px 12px 16px',
                borderRadius: 12,
                background: theme.card,
                border: `1px solid ${theme.cardEdge}`,
                boxShadow: '0 10px 24px rgba(66,48,31,0.12)',
                textAlign: 'center',
            }}
        >
            {/* punch hole + twine loop */}
            <svg width={22} height={14} viewBox="0 0 22 14" aria-hidden="true" style={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)' }}>
                <path d="M4 12 C 6 2, 16 2, 18 12" fill="none" stroke={theme.twineDeep} strokeWidth={2} strokeLinecap="round" />
                <circle cx={11} cy={12} r={2.4} fill={theme.bg} stroke={theme.envEdge} strokeWidth={1} />
            </svg>
            <div style={{ fontFamily: SERIF, fontSize: 'clamp(28px, 7vw, 40px)', fontWeight: 600, color: theme.primary, lineHeight: 1 }}>
                {String(value).padStart(2, '0')}
            </div>
            <div style={{ fontFamily: BODY, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: theme.secondary, marginTop: 8 }}>
                {label}
            </div>
        </div>
    );
}

// =========================================================================
//  Cover: kraft envelope open + zoom
// =========================================================================

function Cover({ data, theme, intro }: { data: TemplateProps['data']; theme: Theme; intro: boolean }) {
    const groomShort = data.groomShort ?? data.groomName;
    const brideShort = data.brideShort ?? data.brideName;

    const heroCard = (
        <KraftCard
            theme={theme}
            style={{ padding: 'clamp(30px, 7vw, 46px) clamp(22px, 6vw, 40px)', textAlign: 'center', overflow: 'hidden' }}
        >
            <Tape theme={theme} style={{ top: -12, left: 18, transform: 'rotate(-8deg)' }} />
            <Tape theme={theme} style={{ top: -12, right: 18, transform: 'rotate(7deg)' }} />

            {data.bismillah && (
                <div style={{ direction: 'rtl', marginBottom: 18 }}>
                    <div style={{ fontFamily: ARABIC, fontSize: 'clamp(22px, 6vw, 34px)', color: theme.primary, lineHeight: 1.9 }}>
                        بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                <Sprig theme={theme} size={84} />
            </div>

            <div style={{ fontFamily: BODY, fontSize: 12, letterSpacing: '0.34em', textTransform: 'uppercase', color: theme.secondary, marginBottom: 8 }}>
                Walimatulurus
            </div>

            <div style={{ fontFamily: SERIF, fontSize: 'clamp(34px, 9vw, 52px)', fontWeight: 600, color: theme.primary, lineHeight: 1.05 }}>
                {groomShort}
            </div>
            <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 'clamp(22px, 5vw, 30px)', color: theme.accent, margin: '2px 0' }}>
                &amp;
            </div>
            <div style={{ fontFamily: SERIF, fontSize: 'clamp(34px, 9vw, 52px)', fontWeight: 600, color: theme.primary, lineHeight: 1.05 }}>
                {brideShort}
            </div>

            <TwineDivider theme={theme} width={200} />

            {data.dateLabel && (
                <div style={{ fontFamily: SERIF, fontSize: 'clamp(17px, 4.4vw, 23px)', color: theme.primary, marginTop: 16 }}>
                    {data.dateLabel}
                </div>
            )}
        </KraftCard>
    );

    return (
        <section
            style={{
                position: 'relative',
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '64px 20px 44px',
                overflow: 'hidden',
            }}
        >
            {intro && <Motes theme={theme} />}

            <div style={{ position: 'absolute', top: 0, left: 0, zIndex: 1, opacity: 0.8 }}>
                <CornerSprig theme={theme} />
            </div>
            <div style={{ position: 'absolute', top: 0, right: 0, zIndex: 1, opacity: 0.8, transform: 'scaleX(-1)' }}>
                <CornerSprig theme={theme} />
            </div>

            {/* stage: envelope (animated only) + hero card that zooms in */}
            <div
                style={{
                    position: 'relative',
                    zIndex: 2,
                    width: '100%',
                    maxWidth: 460,
                    minHeight: intro ? 'min(74vh, 560px)' : undefined,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    perspective: 1300,
                }}
            >
                {intro && (
                    <motion.div
                        initial={{ opacity: 1 }}
                        animate={{ opacity: 0 }}
                        transition={{ delay: 2.0, duration: 0.8, ease: 'easeInOut' }}
                        style={{
                            position: 'absolute',
                            width: 'min(82vw, 360px)',
                            left: '50%',
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                            zIndex: 1,
                        }}
                    >
                        <EnvelopeBody theme={theme} />
                        {/* hinged flap */}
                        <motion.div
                            initial={{ rotateX: 0 }}
                            animate={{ rotateX: -168 }}
                            transition={{ delay: 1.0, duration: 1.0, ease: 'easeInOut' }}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                transformOrigin: 'top center',
                                transformStyle: 'preserve-3d',
                                backfaceVisibility: 'hidden',
                                zIndex: 3,
                            }}
                        >
                            <EnvelopeFlap theme={theme} />
                        </motion.div>
                        {/* twine — releases first */}
                        <motion.div
                            initial={{ opacity: 1, scale: 1, y: 0 }}
                            animate={{ opacity: 0, scale: 1.08, y: -8 }}
                            transition={{ delay: 0.4, duration: 0.6, ease: 'easeOut' }}
                            style={{ position: 'absolute', inset: 0, zIndex: 4 }}
                        >
                            <Twine theme={theme} />
                        </motion.div>
                    </motion.div>
                )}

                {intro ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5, y: 78 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ delay: 1.5, duration: 1.15, ease: EASE_OUT }}
                        style={{ position: 'relative', zIndex: 5, width: '100%' }}
                    >
                        {heroCard}
                    </motion.div>
                ) : (
                    <div style={{ position: 'relative', zIndex: 5, width: '100%' }}>{heroCard}</div>
                )}
            </div>

            {/* scroll cue */}
            <motion.div
                initial={intro ? { opacity: 0 } : false}
                animate={intro ? { opacity: 1 } : undefined}
                transition={{ duration: 1, delay: 2.7 }}
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
                    color: theme.secondary,
                }}
            >
                <span style={{ fontFamily: BODY, fontSize: 11, letterSpacing: '0.24em', textTransform: 'uppercase' }}>Skrol</span>
                <motion.div animate={intro ? { y: [0, 9, 0] } : undefined} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }} style={{ willChange: 'transform' }}>
                    <ChevronDown size={22} />
                </motion.div>
            </motion.div>
        </section>
    );
}

// =========================================================================
//  Main template
// =========================================================================

export default function KrafTemplate({ data, preview, slots }: TemplateProps) {
    const p = data.palette;
    const theme: Theme = {
        primary: p?.primary ?? '#42301f',
        secondary: p?.secondary ?? '#6b543f',
        accent: p?.accent ?? '#a9743f',
        bg: p?.bg ?? '#cdb083',
        text: p?.text ?? '#4a3a2b',
        sage: '#8f9d6e',
        sageDeep: '#6d7b4f',
        twine: '#e3d2a7',
        twineDeep: '#b39a63',
        card: '#f3e9d3',
        cardEdge: '#e0cfa8',
        line: 'rgba(74,53,39,0.24)',
        panel: 'rgba(247,238,214,0.5)',
        envBack: '#c7a56d',
        envSide: '#bd9860',
        envPocket: '#b18a52',
        envFlap: '#cbab73',
        envEdge: '#8f6f43',
    };

    const reduced = useReducedMotion();
    const motionOff = !!preview || !!reduced;
    const intro = !motionOff;

    const groomShort = data.groomShort ?? data.groomName;
    const brideShort = data.brideShort ?? data.brideName;

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
        backgroundColor: theme.bg,
        // paper-fibre texture: speckle + woven grain + warm top glow
        backgroundImage: `
            radial-gradient(rgba(94,66,38,0.05) 0.6px, transparent 0.7px),
            radial-gradient(rgba(94,66,38,0.045) 0.6px, transparent 0.7px),
            repeating-linear-gradient(90deg, rgba(120,88,52,0.028) 0 1px, transparent 1px 6px),
            repeating-linear-gradient(0deg, rgba(120,88,52,0.022) 0 1px, transparent 1px 7px),
            radial-gradient(150% 80% at 50% -12%, rgba(255,248,232,0.4), rgba(255,248,232,0) 55%)
        `,
        backgroundSize: '5px 5px, 7px 7px, auto, auto, auto',
        backgroundPosition: '0 0, 2px 3px, 0 0, 0 0, 0 0',
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

    const placeholderCard = (title: string, sub: string) => (
        <KraftCard theme={theme} style={{ padding: '34px 24px', textAlign: 'center' }}>
            <p style={{ margin: 0, color: theme.secondary, fontSize: 17 }}>{title}</p>
            <p style={{ margin: '6px 0 0', color: theme.secondary, fontSize: 14, fontStyle: 'italic' }}>{sub}</p>
        </KraftCard>
    );

    return (
        <div style={rootStyle}>
            <style>{`
                @keyframes pk-drift {
                    0%   { transform: translateY(-14vh) rotate(0deg); opacity: 0; }
                    12%  { opacity: 0.6; }
                    100% { transform: translateY(114vh) rotate(300deg); opacity: 0; }
                }
                @media (prefers-reduced-motion: reduce) {
                    * { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; }
                }
            `}</style>

            {/* 1. COVER — kraft envelope open + zoom */}
            <Cover data={data} theme={theme} intro={intro} />

            {/* 2. OPENING */}
            {data.openingLine && (
                <Section>
                    <Reveal motionOff={motionOff}>
                        <div style={{ textAlign: 'center' }}>
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
                                {data.openingLine}
                            </p>
                            <TwineDivider theme={theme} />
                        </div>
                    </Reveal>
                </Section>
            )}

            {/* 3. COUPLE */}
            <Section background={theme.panel}>
                <SectionHeading theme={theme} eyebrow="Pasangan Bahagia" title="Pengantin" />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
                    <Reveal motionOff={motionOff} delay={0.05} style={{ textAlign: 'center', width: '100%' }}>
                        <h3 style={{ fontFamily: SERIF, fontSize: 'clamp(30px, 7vw, 48px)', fontWeight: 600, color: theme.primary, margin: 0, lineHeight: 1.15 }}>
                            {data.groomName}
                        </h3>
                        {data.groomParents && (
                            <p style={{ margin: '8px 0 0', color: theme.secondary, fontSize: 16 }}>{data.groomParents}</p>
                        )}
                    </Reveal>

                    {/* botanical divider */}
                    <Reveal motionOff={motionOff} delay={0.15} style={{ width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
                            <Sprig theme={theme} size={90} />
                            <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 'clamp(38px, 9vw, 58px)', color: theme.accent, lineHeight: 1 }}>
                                &amp;
                            </span>
                            <div style={{ transform: 'scaleX(-1)' }}>
                                <Sprig theme={theme} size={90} />
                            </div>
                        </div>
                    </Reveal>

                    <Reveal motionOff={motionOff} delay={0.25} style={{ textAlign: 'center', width: '100%' }}>
                        <h3 style={{ fontFamily: SERIF, fontSize: 'clamp(30px, 7vw, 48px)', fontWeight: 600, color: theme.primary, margin: 0, lineHeight: 1.15 }}>
                            {data.brideName}
                        </h3>
                        {data.brideParents && (
                            <p style={{ margin: '8px 0 0', color: theme.secondary, fontSize: 16 }}>{data.brideParents}</p>
                        )}
                    </Reveal>
                </div>
            </Section>

            {/* 4. DATE + COUNTDOWN */}
            <Section>
                <SectionHeading theme={theme} eyebrow="Menuju Hari Bahagia" title="Kira Detik Bahagia" icon={<Calendar size={15} />} />
                <Reveal motionOff={motionOff}>
                    <div style={{ textAlign: 'center' }}>
                        {data.dateLabel && (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontFamily: SERIF, fontSize: 'clamp(22px, 5vw, 30px)', color: theme.primary }}>
                                <Calendar size={20} color={theme.accent} />
                                {data.dateLabel}
                            </div>
                        )}
                        {data.timeLabel && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10, color: theme.secondary, fontSize: 17 }}>
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
                    <Reveal motionOff={motionOff} delay={0.15}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 14, marginTop: 36 }}>
                            <CountdownTag theme={theme} value={countdown.days} label="Hari" />
                            <CountdownTag theme={theme} value={countdown.hours} label="Jam" />
                            <CountdownTag theme={theme} value={countdown.minutes} label="Minit" />
                            <CountdownTag theme={theme} value={countdown.seconds} label="Saat" />
                        </div>
                    </Reveal>
                )}
            </Section>

            {/* 5. ATUR CARA */}
            {data.program && data.program.length > 0 && (
                <Section background={theme.panel}>
                    <SectionHeading theme={theme} eyebrow="Rentak Majlis" title="Atur Cara" />
                    <div style={{ position: 'relative', maxWidth: 480, margin: '0 auto' }}>
                        <div aria-hidden="true" style={{ position: 'absolute', left: 11, top: 6, bottom: 6, width: 2, background: theme.line }} />
                        {data.program.map((item: ProgramItem, i: number) => (
                            <Reveal
                                key={`${item.time}-${i}`}
                                motionOff={motionOff}
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
                                <div style={{ fontFamily: BODY, fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase', color: theme.accent, fontWeight: 700 }}>
                                    {item.time}
                                </div>
                                <div style={{ fontFamily: SERIF, fontSize: 'clamp(20px, 4.5vw, 26px)', color: theme.primary, marginTop: 2 }}>
                                    {item.title}
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </Section>
            )}

            {/* 6. LOKASI */}
            {(data.venueName || data.venueAddress || data.mapsUrl || data.wazeUrl) && (
                <Section>
                    <SectionHeading theme={theme} eyebrow="Tempat Berlangsung" title="Lokasi Majlis" icon={<MapPin size={15} />} />
                    <Reveal motionOff={motionOff}>
                        <div style={{ textAlign: 'center' }}>
                            {data.venueName && (
                                <h3 style={{ fontFamily: SERIF, fontSize: 'clamp(24px, 5.5vw, 34px)', color: theme.primary, margin: 0 }}>
                                    {data.venueName}
                                </h3>
                            )}
                            {data.venueAddress && (
                                <p style={{ color: theme.secondary, fontSize: 17, maxWidth: 440, margin: '12px auto 0' }}>{data.venueAddress}</p>
                            )}
                            {(data.mapsUrl || data.wazeUrl) && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 26 }}>
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
            )}

            {/* 7. RSVP */}
            {slots?.rsvp && (
                <Section background={theme.panel}>
                    <SectionHeading theme={theme} eyebrow="Khabarkan Kehadiran" title="RSVP Kehadiran" />
                    <Reveal motionOff={motionOff}>{slots.rsvp}</Reveal>
                </Section>
            )}

            {/* 8. UCAPAN */}
            <Section>
                <SectionHeading theme={theme} eyebrow="Doa & Restu" title="Ucapan Kasih" />
                <Reveal motionOff={motionOff}>
                    {slots?.wishes ?? placeholderCard('Ruangan ucapan akan dipaparkan di sini.', 'Tinggalkan kata-kata aluan buat pengantin.')}
                </Reveal>
            </Section>

            {/* 8b. SENARAI HADIAH */}
            {slots?.wishlist && (
                <Section>
                    <SectionHeading theme={theme} eyebrow="Tanda Ingatan" title="Senarai Hadiah" />
                    <Reveal motionOff={motionOff}>{slots.wishlist}</Reveal>
                </Section>
            )}

            {/* 9. HUBUNGI */}
            {data.contacts && data.contacts.length > 0 && (
                <Section background={theme.panel}>
                    <SectionHeading theme={theme} eyebrow="Sebarang Pertanyaan" title="Hubungi" icon={<Phone size={15} />} />
                    <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                        {data.contacts.map((c: Contact, i: number) => (
                            <Reveal key={`${c.phone}-${i}`} motionOff={motionOff} delay={i * 0.08}>
                                <a
                                    href={`tel:${c.phone.replace(/\s+/g, '')}`}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 14,
                                        padding: '16px 18px',
                                        borderRadius: 14,
                                        background: theme.card,
                                        border: `1px solid ${theme.cardEdge}`,
                                        textDecoration: 'none',
                                        color: theme.text,
                                        boxShadow: '0 8px 20px rgba(66,48,31,0.1)',
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
                                        <span style={{ display: 'block', fontFamily: SERIF, fontSize: 20, color: theme.primary, lineHeight: 1.2 }}>
                                            {c.name}
                                        </span>
                                        {c.role && <span style={{ display: 'block', fontSize: 13, color: theme.secondary }}>{c.role}</span>}
                                    </span>
                                </a>
                            </Reveal>
                        ))}
                    </div>
                </Section>
            )}

            {/* 10. SALAM KAUT */}
            {data.gift && (data.gift.bankName || data.gift.accountNo || data.gift.accountName) && (
                <Section>
                    <SectionHeading theme={theme} eyebrow="Tanda Kasih" title="Salam Kaut" icon={<Gift size={15} />} />
                    <Reveal motionOff={motionOff}>
                        <KraftCard theme={theme} style={{ maxWidth: 420, margin: '0 auto', padding: '30px 26px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                                <span
                                    style={{
                                        width: 54,
                                        height: 54,
                                        borderRadius: '50%',
                                        background: 'rgba(169,116,63,0.14)',
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
                            {data.gift.accountName && <div style={{ color: theme.secondary, marginTop: 2 }}>{data.gift.accountName}</div>}
                            {data.gift.accountNo && (
                                <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
                                    <span style={{ fontFamily: SERIF, fontSize: 24, letterSpacing: '0.06em', color: theme.primary, fontWeight: 600 }}>
                                        {data.gift.accountNo}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleCopy}
                                        style={{
                                            ...buttonBase,
                                            padding: '9px 16px',
                                            fontSize: 14,
                                            background: copied ? theme.sageDeep : theme.accent,
                                            color: '#fff',
                                            borderColor: copied ? theme.sageDeep : theme.accent,
                                        }}
                                    >
                                        {copied ? <Check size={16} /> : <Copy size={16} />}
                                        {copied ? 'Telah disalin' : 'Salin nombor'}
                                    </button>
                                </div>
                            )}
                            {data.gift.note && (
                                <p style={{ marginTop: 18, color: theme.secondary, fontStyle: 'italic', fontSize: 15 }}>{data.gift.note}</p>
                            )}
                        </KraftCard>
                    </Reveal>
                </Section>
            )}

            {/* 11. GALERI */}
            <Section background={theme.panel}>
                <SectionHeading theme={theme} eyebrow="Kenangan" title="Galeri Memori" icon={<ImageIcon size={15} />} />
                <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                    {data.galleryImages && data.galleryImages.length > 0
                        ? data.galleryImages.map((src, i) => (
                              <Reveal key={`${src}-${i}`} motionOff={motionOff} delay={i * 0.06}>
                                  <div
                                      style={{
                                          borderRadius: 14,
                                          overflow: 'hidden',
                                          border: `1px solid ${theme.cardEdge}`,
                                          boxShadow: '0 10px 24px rgba(66,48,31,0.12)',
                                          aspectRatio: '3 / 4',
                                          background: theme.card,
                                      }}
                                  >
                                      <img src={src} alt={`Galeri ${i + 1}`} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                  </div>
                              </Reveal>
                          ))
                        : Array.from({ length: 3 }).map((_, i) => (
                              <Reveal key={`ph-${i}`} motionOff={motionOff} delay={i * 0.08}>
                                  <div
                                      style={{
                                          position: 'relative',
                                          borderRadius: 14,
                                          border: `1px dashed ${theme.line}`,
                                          aspectRatio: '3 / 4',
                                          background: 'rgba(255,248,232,0.35)',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          gap: 8,
                                          overflow: 'hidden',
                                      }}
                                  >
                                      <Tape theme={theme} style={{ top: 10, left: '50%', transform: 'translateX(-50%) rotate(-4deg)' }} />
                                      <CornerSprig theme={theme} />
                                      <span style={{ fontFamily: BODY, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', color: theme.secondary }}>
                                          Gambar
                                      </span>
                                  </div>
                              </Reveal>
                          ))}
                </div>
            </Section>

            {/* 12. FOOTER */}
            <footer style={{ position: 'relative', textAlign: 'center', padding: 'clamp(58px, 11vw, 108px) 20px 48px', overflow: 'hidden' }}>
                <Reveal motionOff={motionOff}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                        <Sprig theme={theme} size={120} />
                    </div>
                    <div style={{ fontFamily: SERIF, fontSize: 'clamp(28px, 7vw, 42px)', fontWeight: 600, color: theme.primary, lineHeight: 1.2 }}>
                        {groomShort}
                        <span style={{ color: theme.accent, fontStyle: 'italic', margin: '0 12px' }}>&amp;</span>
                        {brideShort}
                    </div>
                    <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: SERIF, fontSize: 'clamp(20px, 5vw, 28px)', color: theme.secondary }}>
                        Terima Kasih
                        <Heart size={20} color={theme.accent} fill={theme.accent} />
                    </div>
                    <TwineDivider theme={theme} />
                    <div style={{ marginTop: 22, fontFamily: BODY, fontSize: 12, letterSpacing: '0.24em', textTransform: 'uppercase', color: theme.secondary, opacity: 0.75 }}>
                        Dibina dengan
                        <Heart size={12} color={theme.accent} style={{ display: 'inline', verticalAlign: 'middle', margin: '0 6px' }} />
                        PortalKahwin
                    </div>
                </Reveal>
            </footer>
        </div>
    );
}
