// ============================================================
// "Pastel Impian" — soft pastel watercolour wedding e-invitation.
// Self-contained: every wash, blob, flower and envelope is drawn
// with original inline SVG / CSS. No external images, fonts,
// CDNs or network requests. Malay labels throughout.
// ============================================================

import { useEffect, useMemo, useState } from 'react';
import { BrandLogo } from '../../components/BrandLogo';
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
    Mail,
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
const MOTION = REVEAL_TIMING[TEMPLATE_ART['pastel'].reveal];


// ---------- typography ---------------------------------------------------
const SERIF = "'Cormorant Garamond', 'Playfair Display', Georgia, 'Times New Roman', serif";
const NAMES = "var(--pk-name, 'Cormorant Garamond'), 'Playfair Display', Georgia, 'Times New Roman', serif";
const BODY = "'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', sans-serif";
const ARABIC = "'Traditional Arabic', 'Scheherazade New', 'Amiri', 'Noto Naskh Arabic', serif";

// ---------- theme --------------------------------------------------------
interface Theme {
    primary: string;
    secondary: string;
    accent: string;
    bg: string;
    text: string;
    lilac: string;
    lilacDeep: string;
    peach: string;
    peachDeep: string;
    mint: string;
    mintDeep: string;
    card: string;
    line: string;
}

// =========================================================================
//  Original SVG ornaments — fine pastel florals
// =========================================================================

/** A soft five-petal blossom. */
function Blossom({
    size = 44,
    petal,
    center,
}: {
    size?: number;
    petal: string;
    center: string;
}) {
    const petals = [0, 72, 144, 216, 288];
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            aria-hidden="true"
            style={{ display: 'block', overflow: 'visible' }}
        >
            {petals.map((deg) => (
                <ellipse
                    key={deg}
                    cx={50}
                    cy={28}
                    rx={14}
                    ry={20}
                    fill={petal}
                    transform={`rotate(${deg} 50 50)`}
                    opacity={0.9}
                />
            ))}
            <circle cx={50} cy={50} r={9} fill={center} />
        </svg>
    );
}

/** A fine leafy sprig with a little bloom — used in corners. */
function Sprig({ theme }: { theme: Theme }) {
    return (
        <svg width={130} height={130} viewBox="0 0 130 130" aria-hidden="true">
            <path
                d="M14 14 C 48 30 78 58 96 104"
                fill="none"
                stroke={theme.mintDeep}
                strokeWidth={1.6}
                strokeLinecap="round"
            />
            {[
                { x: 30, y: 28, r: -40 },
                { x: 48, y: 48, r: -26 },
                { x: 66, y: 70, r: -12 },
                { x: 82, y: 92, r: 2 },
                { x: 24, y: 38, r: -86 },
                { x: 42, y: 60, r: -70 },
                { x: 60, y: 82, r: -54 },
            ].map((leaf, i) => (
                <g key={i} transform={`translate(${leaf.x} ${leaf.y}) rotate(${leaf.r}) scale(0.5)`}>
                    <path
                        d="M0 0 C 8 -12 8 -28 0 -40 C -8 -28 -8 -12 0 0 Z"
                        fill={i % 2 ? theme.mint : theme.mintDeep}
                        opacity={0.85}
                    />
                </g>
            ))}
            <g transform="translate(100 108) scale(0.62)">
                <Blossom size={40} petal={theme.peach} center={theme.accent} />
            </g>
            <g transform="translate(20 16) scale(0.42)">
                <Blossom size={40} petal={theme.lilac} center={theme.lilacDeep} />
            </g>
        </svg>
    );
}

/** Divider: soft line, two leaves and a centre bloom. */
function Divider({ theme }: { theme: Theme }) {
    return (
        <svg
            width={230}
            height={30}
            viewBox="0 0 230 30"
            aria-hidden="true"
            style={{ display: 'block', margin: '18px auto 0' }}
        >
            <line x1="18" y1="15" x2="92" y2="15" stroke={theme.line} strokeWidth={1.4} />
            <line x1="138" y1="15" x2="212" y2="15" stroke={theme.line} strokeWidth={1.4} />
            <g transform="translate(100 15) rotate(-24) scale(0.5)">
                <path d="M0 0 C 8 -12 8 -28 0 -40 C -8 -28 -8 -12 0 0 Z" fill={theme.mintDeep} opacity={0.8} />
            </g>
            <g transform="translate(130 15) rotate(24) scale(0.5)">
                <path d="M0 0 C 8 -12 8 -28 0 -40 C -8 -28 -8 -12 0 0 Z" fill={theme.mintDeep} opacity={0.8} />
            </g>
            <g transform="translate(115 15)">
                <Blossom size={22} petal={theme.peach} center={theme.accent} />
            </g>
        </svg>
    );
}

// =========================================================================
//  Dreamy watercolour background — soft blurred radial washes
// =========================================================================

interface Blob {
    key: number;
    top: string;
    left: string;
    size: string;
    color: string;
    blur: number;
    opacity: number;
}

function WatercolourWash({ theme }: { theme: Theme }) {
    const blobs = useMemo<Blob[]>(
        () => [
            { key: 1, top: '-8%', left: '-10%', size: '52vw', color: theme.lilac, blur: 70, opacity: 0.55 },
            { key: 2, top: '4%', left: '58%', size: '46vw', color: theme.peach, blur: 74, opacity: 0.5 },
            { key: 3, top: '32%', left: '-6%', size: '44vw', color: theme.mint, blur: 78, opacity: 0.42 },
            { key: 4, top: '52%', left: '62%', size: '50vw', color: theme.lilac, blur: 82, opacity: 0.4 },
            { key: 5, top: '74%', left: '8%', size: '48vw', color: theme.peach, blur: 80, opacity: 0.38 },
            { key: 6, top: '88%', left: '54%', size: '46vw', color: theme.mint, blur: 84, opacity: 0.36 },
        ],
        [theme.lilac, theme.peach, theme.mint],
    );

    return (
        <div
            aria-hidden="true"
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 0,
                overflow: 'hidden',
                pointerEvents: 'none',
            }}
        >
            {blobs.map((b) => (
                <div
                    key={b.key}
                    style={{
                        position: 'absolute',
                        top: b.top,
                        left: b.left,
                        width: b.size,
                        height: b.size,
                        borderRadius: '50%',
                        background: `radial-gradient(circle at 50% 50%, ${b.color} 0%, rgba(255,255,255,0) 68%)`,
                        filter: `blur(${b.blur}px)`,
                        opacity: b.opacity,
                    }}
                />
            ))}
        </div>
    );
}

/** Ambient drifting blossoms — cover only, decorative. */
function FloatingBlossoms({ theme }: { theme: Theme }) {
    const items = useMemo(
        () =>
            Array.from({ length: 12 }, (_, i) => ({
                key: i,
                left: (i * 8.5 + 4) % 100,
                delay: (i % 6) * 1.6,
                dur: 11 + (i % 5) * 2.2,
                size: 16 + (i % 4) * 7,
                petal: [theme.lilac, theme.peach, theme.mint][i % 3],
                center: [theme.lilacDeep, theme.peachDeep, theme.mintDeep][i % 3],
                rot: (i * 53) % 360,
            })),
        [theme.lilac, theme.peach, theme.mint, theme.lilacDeep, theme.peachDeep, theme.mintDeep],
    );
    return (
        <div
            aria-hidden="true"
            style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}
        >
            {items.map((p) => (
                <div
                    key={p.key}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: `${p.left}%`,
                        transform: `rotate(${p.rot}deg)`,
                        animation: `pk-drift ${p.dur}s linear ${p.delay}s infinite`,
                        opacity: 0.7,
                        willChange: 'transform',
                    }}
                >
                    <Blossom size={p.size} petal={p.petal} center={p.center} />
                </div>
            ))}
        </div>
    );
}

// =========================================================================
//  Motion + layout helpers
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
    const reduce = useReducedMotion();
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
                zIndex: 1,
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
                minWidth: 72,
                padding: '16px 10px',
                borderRadius: 18,
                background: theme.card,
                border: `1px solid ${theme.line}`,
                boxShadow: '0 10px 26px rgba(140,110,170,0.14)',
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
//  Cover — envelope open + zoom
// =========================================================================

function EnvelopeCover({
    theme,
    data,
    preview,
}: {
    theme: Theme;
    data: TemplateProps['data'];
    preview?: boolean;
}) {

    const tr = useCardText();
    const reduce = useReducedMotion();
    const instant = !!preview || !!reduce;

    const groomShort = data.groomShort ?? data.groomName;
    const brideShort = data.brideShort ?? data.brideName;

    const [opened, setOpened] = useState<boolean>(instant);

    useEffect(() => {
        if (instant) {
            setOpened(true);
            return;
        }
        const id = window.setTimeout(() => setOpened(true), 900);
        return () => window.clearTimeout(id);
    }, [instant]);

    const instantTransition = { duration: 0 } as const;

    // Inner invitation card (the letter that slides up + zooms in).
    const cardContent = (
        <div
            style={{
                position: 'relative',
                background: theme.card,
                borderRadius: 18,
                padding: 'clamp(26px, 6vw, 40px) clamp(20px, 5vw, 34px)',
                boxShadow: '0 24px 60px rgba(140,110,170,0.22)',
                border: `1px solid ${theme.line}`,
                textAlign: 'center',
                overflow: 'hidden',
            }}
        >
            {/* soft floral corners on the card */}
            <div style={{ position: 'absolute', top: -14, left: -14, opacity: 0.7 }}>
                <Sprig theme={theme} />
            </div>
            <div
                style={{
                    position: 'absolute',
                    bottom: -14,
                    right: -14,
                    opacity: 0.7,
                    transform: 'scale(-1,-1)',
                }}
            >
                <Sprig theme={theme} />
            </div>

            {data.bismillah && (
                <div
                    style={{
                        direction: 'rtl',
                        fontFamily: ARABIC,
                        fontSize: 'clamp(20px, 5.4vw, 30px)',
                        color: theme.primary,
                        lineHeight: 1.9,
                        marginBottom: 14,
                        position: 'relative',
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
                    marginBottom: 12,
                    position: 'relative',
                }}
            >
                {tr("Walimatulurus")}
            </div>

            <div
                style={{
                    fontFamily: NAMES,
                    fontSize: 'clamp(32px, 9vw, 52px)',
                    fontWeight: 600,
                    color: theme.primary,
                    lineHeight: 1.06,
                    position: 'relative',
                }}
            >
                {groomShort}
            </div>
            <div
                style={{
                    fontFamily: SERIF,
                    fontStyle: 'italic',
                    fontSize: 'clamp(22px, 6vw, 32px)',
                    color: theme.accent,
                    margin: '4px 0',
                    position: 'relative',
                }}
            >
                &amp;
            </div>
            <div
                style={{
                    fontFamily: NAMES,
                    fontSize: 'clamp(32px, 9vw, 52px)',
                    fontWeight: 600,
                    color: theme.primary,
                    lineHeight: 1.06,
                    position: 'relative',
                }}
            >
                {brideShort}
            </div>

            {data.dateLabel && (
                <>
                    <Divider theme={theme} />
                    <div
                        style={{
                            fontFamily: SERIF,
                            fontSize: 'clamp(16px, 4.4vw, 22px)',
                            color: theme.secondary,
                            marginTop: 14,
                            position: 'relative',
                        }}
                    >
                        {data.dateLabel}
                    </div>
                </>
            )}
        </div>
    );

    return (
        <section
            style={{
                position: 'relative',
                zIndex: 1,
                minHeight: 'var(--pk-vh, 100vh)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '72px 20px 56px',
                // Clear the absolutely-positioned scroll cue below (~66px tall from the
                // bottom edge) so centred content can never sit underneath it.
                paddingBottom: 'var(--pk-cue-clear, 96px)',
                overflow: 'hidden',
            }}
        >
            {!instant && <FloatingBlossoms theme={theme} />}

            {/* Envelope stage */}
            <div
                onClick={() => !opened && setOpened(true)}
                role="button"
                tabIndex={opened ? -1 : 0}
                aria-label="Buka sampul jemputan"
                onKeyDown={(e) => {
                    if (!opened && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        setOpened(true);
                    }
                }}
                style={{
                    position: 'relative',
                    zIndex: 2,
                    width: 'min(86vw, 360px)',
                    aspectRatio: '1.4',
                    perspective: 1200,
                    cursor: opened ? 'default' : 'pointer',
                    outline: 'none',
                }}
            >
                {/* Inner card — sits between envelope back and front pocket */}
                <motion.div
                    initial={instant ? false : { y: 74, scale: 0.72, opacity: 0 }}
                    animate={{
                        y: opened ? -34 : 74,
                        scale: opened ? 1.12 : 0.72,
                        opacity: opened ? 1 : 0,
                    }}
                    transition={
                        instant ? instantTransition : { duration: 1, delay: 0.55, ease: [0.22, 1, 0.36, 1] }
                    }
                    style={{
                        position: 'absolute',
                        left: '7%',
                        right: '7%',
                        top: '10%',
                        zIndex: 2,
                        transformOrigin: 'center bottom',
                    }}
                >
                    {cardContent}
                </motion.div>

                {/* Envelope back */}
                <motion.div
                    initial={instant ? false : { opacity: 1 }}
                    animate={{ opacity: opened ? 0 : 1 }}
                    transition={instant ? instantTransition : { duration: 0.5, delay: opened ? 1.15 : 0 }}
                    style={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: 1,
                        borderRadius: 16,
                        background: `linear-gradient(150deg, ${theme.lilac} 0%, ${theme.peach} 100%)`,
                        boxShadow: '0 26px 60px rgba(140,110,170,0.28)',
                    }}
                />

                {/* Front pocket (triangle pointing up) */}
                <motion.div
                    initial={instant ? false : { opacity: 1, y: 0 }}
                    animate={{ opacity: opened ? 0 : 1, y: opened ? 26 : 0 }}
                    transition={instant ? instantTransition : { duration: 0.5, delay: opened ? 1.15 : 0 }}
                    style={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: 3,
                        borderRadius: 16,
                        background: `linear-gradient(200deg, ${theme.peach} 0%, ${theme.lilac} 100%)`,
                        clipPath: 'polygon(0% 100%, 50% 44%, 100% 100%)',
                        boxShadow: 'inset 0 6px 18px rgba(255,255,255,0.35)',
                    }}
                />

                {/* Side/bottom fold shading for depth */}
                <motion.div
                    aria-hidden="true"
                    initial={instant ? false : { opacity: 1 }}
                    animate={{ opacity: opened ? 0 : 1 }}
                    transition={instant ? instantTransition : { duration: 0.5, delay: opened ? 1.15 : 0 }}
                    style={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: 3,
                        borderRadius: 16,
                        background: `
                            linear-gradient(to right, rgba(140,110,170,0.10), rgba(0,0,0,0) 40%),
                            linear-gradient(to left, rgba(140,110,170,0.10), rgba(0,0,0,0) 40%)`,
                        clipPath: 'polygon(0% 100%, 0% 44%, 50% 90%, 100% 44%, 100% 100%)',
                    }}
                />

                {/* Top flap — opens by rotating back from the top edge */}
                <motion.div
                    initial={instant ? false : { rotateX: 0 }}
                    animate={{ rotateX: opened ? -172 : 0, opacity: opened ? 0 : 1 }}
                    transition={
                        instant
                            ? instantTransition
                            : {
                                  rotateX: { duration: 0.85, ease: 'easeInOut' },
                                  opacity: { duration: 0.4, delay: opened ? 0.9 : 0 },
                              }
                    }
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '100%',
                        zIndex: 4,
                        transformOrigin: 'top center',
                        transformStyle: 'preserve-3d',
                        borderRadius: 16,
                        background: `linear-gradient(160deg, ${theme.lilac} 0%, ${theme.lilacDeep} 100%)`,
                        clipPath: 'polygon(0% 0%, 100% 0%, 50% 62%)',
                        boxShadow: '0 4px 12px rgba(140,110,170,0.2)',
                    }}
                >
                    {/* wax-seal heart */}
                    <div
                        style={{
                            position: 'absolute',
                            top: '40%',
                            left: '50%',
                            transform: 'translate(-50%,-50%)',
                            width: 46,
                            height: 46,
                            borderRadius: '50%',
                            background: theme.accent,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 6px 16px rgba(200,120,120,0.35)',
                        }}
                    >
                        <Heart size={22} color="#fff" fill="#fff" />
                    </div>
                </motion.div>
            </div>

            {/* tap-to-open hint (hidden once opened) */}
            <motion.div
                initial={false}
                animate={{ opacity: opened ? 0 : 1, y: opened ? 8 : 0 }}
                transition={instant ? instantTransition : { duration: 0.4 }}
                style={{
                    marginTop: 30,
                    zIndex: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontFamily: BODY,
                    fontSize: 12,
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    color: theme.secondary,
                    pointerEvents: 'none',
                }}
            >
                <Mail size={15} />
                Ketuk sampul untuk membuka
            </motion.div>

            {/* scroll cue (appears after opening) */}
            <motion.div
                initial={false}
                animate={{ opacity: opened ? 1 : 0 }}
                transition={instant ? instantTransition : { duration: 0.6, delay: opened ? 1.4 : 0 }}
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
                    animate={instant ? undefined : { y: [0, 9, 0] }}
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

export default function PastelTemplate({ data, preview, slots }: TemplateProps) {
    const tr = useCardText();
    const p = data.palette;
    const theme: Theme = {
        primary: p?.primary ?? '#6a5a7d',
        secondary: p?.secondary ?? '#9a8aa8',
        accent: p?.accent ?? '#e0a89e',
        bg: p?.bg ?? '#faf6fb',
        text: p?.text ?? '#584d63',
        lilac: '#d8c6ec',
        lilacDeep: '#b299d6',
        peach: '#f6cfbf',
        peachDeep: '#e5a08f',
        mint: '#c7e6d5',
        mintDeep: '#93c9ac',
        card: '#fffdff',
        line: 'rgba(178,153,214,0.30)',
    };

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
        position: 'relative',
        fontFamily: BODY,
        fontSize: 18,
        lineHeight: 1.7,
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

    const placeholderCard: CSSProperties = {
        background: theme.card,
        border: `1px solid ${theme.line}`,
        borderRadius: 18,
        padding: '34px 24px',
        textAlign: 'center',
        boxShadow: '0 14px 34px rgba(140,110,170,0.12)',
    };

    return (
        <div style={rootStyle}>
            <style>{`
                @keyframes pk-drift {
                    0%   { transform: translateY(-14vh) rotate(0deg); opacity: 0; }
                    12%  { opacity: 0.75; }
                    100% { transform: translateY(116vh) rotate(340deg); opacity: 0; }
                }
                @media (prefers-reduced-motion: reduce) {
                    * { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; }
                }
            `}</style>

            <WatercolourWash theme={theme} />

            {/* 1. COVER — envelope open + zoom */}
            <EnvelopeCover theme={theme} data={data} preview={preview} />

            {/* 2. OPENING */}
            {data.openingLine && (
                <Section>
                    <Reveal preview={preview}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
                                <Blossom size={34} petal={theme.peach} center={theme.accent} />
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
                            <Divider theme={theme} />
                        </div>
                    </Reveal>
                </Section>
            )}

            {/* 3. COUPLE */}
            <Section background="rgba(255,255,255,0.34)">
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
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 14,
                            }}
                        >
                            <span style={{ height: 1, width: 48, background: theme.line }} />
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
                            <span style={{ height: 1, width: 48, background: theme.line }} />
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

            {/* 4. DATE + COUNTDOWN */}
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

            {/* 5. ATUR CARA */}
            <PkSec name="program">{data.program && data.program.length > 0 && (
                <Section background="rgba(255,255,255,0.34)">
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

            {/* 6. LOKASI */}
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
                                            color: '#fff',
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

            {/* 7. RSVP */}
            <PkSec name="rsvp">{slots?.rsvp && (
                <Section background="rgba(255,255,255,0.34)">
                    <SectionHeading theme={theme} eyebrow={tr("Khabarkan Kehadiran")} title={tr("RSVP Kehadiran")} />
                    <Reveal preview={preview}>{slots.rsvp}</Reveal>
                </Section>
            )}</PkSec>

            {/* 8. UCAPAN */}
            <PkSec name="wishes"><Section>
                <SectionHeading theme={theme} eyebrow={tr("Doa & Restu")} title={tr("Ucapan Kasih")} />
                <Reveal preview={preview}>
                    {slots?.wishes ?? (
                        <div style={placeholderCard}>
                            <p style={{ margin: 0, color: theme.secondary, fontSize: 17 }}>
                                Ruangan ucapan akan dipaparkan di sini.
                            </p>
                            <p
                                style={{
                                    margin: '6px 0 0',
                                    color: theme.secondary,
                                    fontSize: 14,
                                    fontStyle: 'italic',
                                }}
                            >
                                Tinggalkan kata-kata aluan buat pengantin.
                            </p>
                        </div>
                    )}
                </Reveal>
            </Section></PkSec>

            {/* 8b. SENARAI HADIAH */}
            <PkSec name="wishlist">{slots?.wishlist && (
                <Section>
                    <SectionHeading theme={theme} eyebrow={tr("Tanda Ingatan")} title={tr("Senarai Hadiah")} />
                    <Reveal preview={preview}>{slots.wishlist}</Reveal>
                </Section>
            )}</PkSec>

            {/* 9. HUBUNGI */}
            <PkSec name="contacts">{data.contacts && data.contacts.length > 0 && (
                <Section background="rgba(255,255,255,0.34)">
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
                                        borderRadius: 16,
                                        background: theme.card,
                                        border: `1px solid ${theme.line}`,
                                        textDecoration: 'none',
                                        color: theme.text,
                                        boxShadow: '0 10px 24px rgba(140,110,170,0.10)',
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
                                            <span
                                                style={{
                                                    display: 'block',
                                                    fontSize: 13,
                                                    color: theme.secondary,
                                                }}
                                            >
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

            {/* 10. SALAM KAUT */}
            <PkSec name="gift">{data.gift && (data.gift.bankName || data.gift.accountNo || data.gift.accountName) && (
                <Section>
                    <SectionHeading
                        theme={theme}
                        eyebrow={tr("Tanda Kasih")}
                        title={tr("Salam Kaut")}
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
                                boxShadow: '0 16px 40px rgba(140,110,170,0.14)',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                                <span
                                    style={{
                                        width: 54,
                                        height: 54,
                                        borderRadius: '50%',
                                        background: 'rgba(224,168,158,0.18)',
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
                                            background: copied ? theme.mintDeep : theme.accent,
                                            color: '#fff',
                                            borderColor: copied ? theme.mintDeep : theme.accent,
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

            {/* 11. GALERI */}
            <PkSec name="gallery"><Section background="rgba(255,255,255,0.34)">
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
                                          borderRadius: 16,
                                          overflow: 'hidden',
                                          border: `1px solid ${theme.line}`,
                                          boxShadow: '0 12px 26px rgba(140,110,170,0.12)',
                                          aspectRatio: '3 / 4',
                                          background: theme.card,
                                      }}
                                  >
                                      <img
                                          src={src}
                                          alt={`Galeri ${i + 1}`}
                                          loading="lazy"
                                          style={{
                                              width: '100%',
                                              height: '100%',
                                              objectFit: 'cover',
                                              display: 'block',
                                          }}
                                      />
                                  </div>
                              </Reveal>
                          ))
                        : Array.from({ length: 3 }).map((_, i) => (
                              <Reveal key={`ph-${i}`} preview={preview} delay={i * 0.08}>
                                  <div
                                      style={{
                                          borderRadius: 16,
                                          border: `1px solid ${theme.line}`,
                                          aspectRatio: '3 / 4',
                                          background: 'rgba(216,198,236,0.14)',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          gap: 10,
                                      }}
                                  >
                                      <Blossom size={44} petal={theme.peach} center={theme.accent} />
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

            {/* 12. FOOTER */}
            <footer
                style={{
                    position: 'relative',
                    zIndex: 1,
                    textAlign: 'center',
                    padding: 'clamp(60px, 11vw, 110px) 20px 48px',
                    overflow: 'hidden',
                }}
            >
                <Reveal preview={preview}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                        <Blossom size={58} petal={theme.lilac} center={theme.lilacDeep} />
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
                        <Heart size={20} color={theme.peachDeep} fill={theme.peach} />
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
                            opacity: 0.7,
                        }}
                    >
                        Dibina dengan{' '}
                        <Heart
                            size={12}
                            color={theme.peachDeep}
                            style={{ display: 'inline', verticalAlign: 'middle', margin: '0 2px' }}
                        />{' '}
                        <BrandLogo height={12} plate style={{ verticalAlign: 'middle', padding: '3px 7px' }} />
                    </div>
                </Reveal>
            </footer>
        </div>
    );
}
