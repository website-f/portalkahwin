// ============================================================
//  CardShowcase — the animated hero centerpiece.
//  An elegant wedding card that starts CLOSED, then on load the
//  curtains part, the wax seal breaks, floral sprays bloom and the
//  couple's card zooms into view. All visuals are original inline
//  SVG / CSS. No external images, fonts, CDNs or network requests.
//  Fully responsive (great at 375px) and respects reduced motion.
// ============================================================

import { useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';

const SERIF = "'Cormorant Garamond', 'Playfair Display', Georgia, serif";

const TONE = {
    gold: '#c9a24b',
    goldSoft: '#e6d3a3',
    leaf: '#8a9b6a',
    leafDeep: '#647249',
    rose: '#b56576',
    roseDeep: '#8f4a5b',
    cream: '#f6efe3',
    creamDeep: '#efe3cf',
    plum: '#5b2a45',
    plumDeep: '#3d1a30',
    ink: '#2a1f2d',
    muted: '#8a7f76',
} as const;

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const EASE_CURTAIN = [0.7, 0, 0.2, 1] as const;

// ---------------------------------------------------------------------------
//  Original SVG ornaments
// ---------------------------------------------------------------------------

function Leaf({ x, y, r, s, fill }: { x: number; y: number; r: number; s: number; fill: string }) {
    return (
        <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
            <path d="M0 0 C 7 -10 7 -26 0 -38 C -7 -26 -7 -10 0 0 Z" fill={fill} />
            <path d="M0 -3 L0 -32" stroke="rgba(0,0,0,0.10)" strokeWidth={1} fill="none" />
        </g>
    );
}

function Bloom({ x, y, s, petal, center }: { x: number; y: number; s: number; petal: string; center: string }) {
    return (
        <g transform={`translate(${x} ${y}) scale(${s})`}>
            {[0, 60, 120, 180, 240, 300].map((a) => (
                <g key={a} transform={`rotate(${a})`}>
                    <ellipse cx={0} cy={-8} rx={5.4} ry={9} fill={petal} />
                </g>
            ))}
            <circle r={5.2} fill={center} />
        </g>
    );
}

const SPRAY_LEAVES = [
    { x: 16, y: 150, r: -42, s: 0.82 },
    { x: 26, y: 126, r: -30, s: 0.94 },
    { x: 37, y: 100, r: -18, s: 1.02 },
    { x: 47, y: 72, r: -6, s: 1.06 },
    { x: 51, y: 44, r: 8, s: 0.9 },
    { x: 72, y: 70, r: 72, s: 0.82 },
    { x: 98, y: 65, r: 82, s: 0.92 },
    { x: 126, y: 59, r: 94, s: 0.86 },
    { x: 21, y: 136, r: -122, s: 0.6 },
    { x: 41, y: 86, r: -102, s: 0.62 },
];

const SPRAY_BLOOMS = [
    { x: 52, y: 33, s: 1.3, petal: TONE.rose, center: TONE.gold },
    { x: 150, y: 55, s: 1.0, petal: TONE.gold, center: TONE.roseDeep },
    { x: 12, y: 160, s: 0.82, petal: TONE.rose, center: TONE.gold },
    { x: 90, y: 70, s: 0.6, petal: TONE.goldSoft, center: TONE.roseDeep },
];

/** A corner spray of foliage + blooms, drawn bottom-left → top-right. */
function FloralSpray() {
    return (
        <svg viewBox="0 0 170 170" width="100%" height="100%" aria-hidden="true" style={{ display: 'block', overflow: 'visible' }}>
            <path d="M8 162 C 32 130 42 96 52 38" fill="none" stroke={TONE.leafDeep} strokeWidth={2.2} strokeLinecap="round" />
            <path d="M52 58 C 74 74 106 70 152 56" fill="none" stroke={TONE.leafDeep} strokeWidth={2} strokeLinecap="round" />
            {SPRAY_LEAVES.map((l, i) => (
                <Leaf key={i} {...l} fill={i % 2 ? TONE.leaf : TONE.leafDeep} />
            ))}
            {SPRAY_BLOOMS.map((b, i) => (
                <Bloom key={`b${i}`} {...b} />
            ))}
        </svg>
    );
}

/** Thin gold flourish for the card's inner frame corners. */
function CornerFlourish({ flip }: { flip?: string }) {
    return (
        <svg
            viewBox="0 0 60 60"
            width={40}
            height={40}
            aria-hidden="true"
            style={{ display: 'block', transform: flip, overflow: 'visible' }}
        >
            <path d="M4 4 L4 30 M4 4 L30 4" fill="none" stroke={TONE.gold} strokeWidth={1.4} strokeLinecap="round" />
            <path d="M4 4 C 22 8 30 20 30 34" fill="none" stroke={TONE.gold} strokeWidth={1.2} opacity={0.7} />
            <circle cx={4} cy={4} r={2.4} fill={TONE.gold} />
            <g transform="translate(30 30) scale(0.4)">
                <ellipse cx={0} cy={-8} rx={5} ry={9} fill={TONE.roseDeep} opacity={0.85} />
            </g>
        </svg>
    );
}

/** Small line-and-diamond divider used inside the card. */
function CardDivider() {
    return (
        <svg viewBox="0 0 160 16" width={140} height={14} aria-hidden="true" style={{ display: 'block', margin: '10px auto' }}>
            <line x1="14" y1="8" x2="66" y2="8" stroke={TONE.gold} strokeWidth={1.1} />
            <line x1="94" y1="8" x2="146" y2="8" stroke={TONE.gold} strokeWidth={1.1} />
            <rect x="76" y="4" width="8" height="8" transform="rotate(45 80 8)" fill={TONE.gold} />
            <circle cx="66" cy="8" r="1.6" fill={TONE.gold} />
            <circle cx="94" cy="8" r="1.6" fill={TONE.gold} />
        </svg>
    );
}

/** Faint damask texture drawn onto the closed curtains. */
function Damask({ side }: { side: 'l' | 'r' }) {
    const dots: ReactNode[] = [];
    for (let gy = 0; gy < 7; gy++) {
        for (let gx = 0; gx < 3; gx++) {
            const cx = 22 + gx * 30 + (gy % 2 ? 15 : 0);
            const cy = 24 + gy * 42;
            dots.push(
                <g key={`${gx}-${gy}`} transform={`translate(${cx} ${cy})`}>
                    <path d="M0 -9 C 6 -4 6 4 0 9 C -6 4 -6 -4 0 -9 Z" fill="none" stroke={TONE.gold} strokeWidth={0.8} opacity={0.5} />
                    <circle r={1.4} fill={TONE.gold} opacity={0.55} />
                </g>,
            );
        }
    }
    return (
        <svg
            viewBox="0 0 110 300"
            preserveAspectRatio="xMidYMid slice"
            width="100%"
            height="100%"
            aria-hidden="true"
            style={{ position: 'absolute', inset: 0, transform: side === 'r' ? 'scaleX(-1)' : undefined }}
        >
            {dots}
        </svg>
    );
}

// ---------------------------------------------------------------------------
//  Petals (ambient, load-only)
// ---------------------------------------------------------------------------

const PETALS = Array.from({ length: 9 }, (_, i) => ({
    key: i,
    left: (i * 11 + 6) % 100,
    delay: (i % 5) * 1.3,
    dur: 8 + (i % 4) * 2.4,
    size: 9 + (i % 3) * 4,
    color: [TONE.rose, TONE.gold, TONE.goldSoft][i % 3],
    rot: (i * 53) % 360,
}));

// ---------------------------------------------------------------------------
//  Component
// ---------------------------------------------------------------------------

interface CardShowcaseProps {
    /** Small uppercase label above the names, e.g. "Walimatulurus". */
    eyebrow: string;
    /** "Save the date" style label above the date. */
    save: string;
    /** Full date line. */
    date: string;
    /** Venue line. */
    venue: string;
}

export function CardShowcase({ eyebrow, save, date, venue }: CardShowcaseProps) {
    const reduce = useReducedMotion() ?? false;
    const ref = useRef<HTMLDivElement>(null);

    const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
    const glowYMotion = useTransform(scrollYProgress, [0, 1], [50, -50]);
    const sprayYMotion = useTransform(scrollYProgress, [0, 1], [26, -26]);
    const glowY = reduce ? 0 : glowYMotion;
    const sprayY = reduce ? 0 : sprayYMotion;

    // Curtains cover the card face and part on load. Skipped for reduced motion.
    const showCurtains = !reduce;

    const cardFace: CSSProperties = {
        position: 'relative',
        width: '100%',
        aspectRatio: '5 / 7',
        borderRadius: 18,
        background: `linear-gradient(160deg, ${TONE.cream} 0%, ${TONE.creamDeep} 100%)`,
        boxShadow: '0 40px 80px -30px rgba(61,26,48,0.55), 0 8px 20px -10px rgba(61,26,48,0.3)',
        overflow: 'hidden',
        border: `1px solid ${TONE.goldSoft}`,
    };

    return (
        <div
            ref={ref}
            style={{
                position: 'relative',
                width: 'min(340px, 100%)',
                margin: '0 auto',
                isolation: 'isolate',
            }}
        >
            <style>{`
                @keyframes pk-petal {
                    0%   { transform: translateY(-14%) rotate(0deg); opacity: 0; }
                    12%  { opacity: 0.9; }
                    100% { transform: translateY(150%) rotate(360deg); opacity: 0; }
                }
                @media (prefers-reduced-motion: reduce) {
                    .pk-petal { display: none !important; }
                }
            `}</style>

            {/* Soft radiant podium behind the card */}
            <motion.div
                aria-hidden="true"
                style={{
                    position: 'absolute',
                    inset: '-14% -18% -22% -18%',
                    zIndex: 0,
                    y: glowY,
                    background:
                        'radial-gradient(60% 55% at 50% 42%, rgba(201,162,75,0.32), rgba(201,162,75,0) 70%),' +
                        'radial-gradient(50% 45% at 50% 88%, rgba(91,42,69,0.22), rgba(91,42,69,0) 72%)',
                    filter: 'blur(4px)',
                }}
                initial={reduce ? false : { opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, ease: EASE_OUT }}
            />

            {/* Ambient petals */}
            {!reduce && (
                <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 4, pointerEvents: 'none' }}>
                    {PETALS.map((p) => (
                        <svg
                            key={p.key}
                            className="pk-petal"
                            width={p.size}
                            height={p.size}
                            viewBox="0 0 20 20"
                            style={{
                                position: 'absolute',
                                top: '-8%',
                                left: `${p.left}%`,
                                animation: `pk-petal ${p.dur}s linear ${p.delay + 2.2}s infinite`,
                                transform: `rotate(${p.rot}deg)`,
                            }}
                        >
                            <path d="M10 1 C 15 5 15 13 10 19 C 5 13 5 5 10 1 Z" fill={p.color} opacity={0.75} />
                        </svg>
                    ))}
                </div>
            )}

            {/* Blooming floral sprays anchored to the card corners */}
            <motion.div
                aria-hidden="true"
                style={{
                    position: 'absolute',
                    left: '-16%',
                    bottom: '-12%',
                    width: 'clamp(96px, 30vw, 150px)',
                    height: 'clamp(96px, 30vw, 150px)',
                    zIndex: 3,
                    transformOrigin: 'left bottom',
                    y: sprayY,
                }}
                initial={reduce ? false : { opacity: 0, scale: 0.35, rotate: -14 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ duration: 1.1, delay: reduce ? 0 : 1.35, ease: EASE_OUT }}
            >
                <FloralSpray />
            </motion.div>
            <div
                aria-hidden="true"
                style={{
                    position: 'absolute',
                    right: '-16%',
                    top: '-12%',
                    width: 'clamp(96px, 30vw, 150px)',
                    height: 'clamp(96px, 30vw, 150px)',
                    zIndex: 3,
                    transform: 'scale(-1)',
                }}
            >
                <motion.div
                    style={{ width: '100%', height: '100%', transformOrigin: 'left bottom' }}
                    initial={reduce ? false : { opacity: 0, scale: 0.35, rotate: -14 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    transition={{ duration: 1.1, delay: reduce ? 0 : 1.6, ease: EASE_OUT }}
                >
                    <FloralSpray />
                </motion.div>
            </div>

            {/* The card itself — floats gently after reveal */}
            <motion.div
                style={{ position: 'relative', zIndex: 2 }}
                initial={reduce ? false : { opacity: 0, scale: 0.94, y: 18 }}
                animate={
                    reduce
                        ? { opacity: 1, scale: 1, y: 0 }
                        : { opacity: 1, scale: 1, y: [18, 0, -6, 0] }
                }
                transition={
                    reduce
                        ? { duration: 0 }
                        : {
                              opacity: { duration: 0.8, delay: 0.2, ease: EASE_OUT },
                              scale: { duration: 0.9, delay: 0.2, ease: EASE_OUT },
                              y: { duration: 7, delay: 2.4, ease: 'easeInOut', repeat: Infinity, repeatType: 'loop' },
                          }
                }
            >
                <div style={cardFace}>
                    {/* Inner gold frame */}
                    <div
                        aria-hidden="true"
                        style={{
                            position: 'absolute',
                            inset: 12,
                            borderRadius: 12,
                            border: `1px solid ${TONE.gold}`,
                            opacity: 0.55,
                            zIndex: 1,
                            pointerEvents: 'none',
                        }}
                    />
                    <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 2 }}>
                        <CornerFlourish />
                    </div>
                    <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}>
                        <CornerFlourish flip="scaleX(-1)" />
                    </div>
                    <div style={{ position: 'absolute', bottom: 8, left: 8, zIndex: 2 }}>
                        <CornerFlourish flip="scaleY(-1)" />
                    </div>
                    <div style={{ position: 'absolute', bottom: 8, right: 8, zIndex: 2 }}>
                        <CornerFlourish flip="scale(-1)" />
                    </div>

                    {/* Card content — zooms in as the curtains part */}
                    <motion.div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            zIndex: 2,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textAlign: 'center',
                            padding: 'clamp(20px, 6vw, 34px)',
                        }}
                        initial={reduce ? false : { opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.9, delay: reduce ? 0 : 1.5, ease: EASE_OUT }}
                    >
                        <TextLine reduce={reduce} delay={1.55}>
                            <div
                                style={{
                                    fontSize: 'clamp(9px, 2.6vw, 11px)',
                                    letterSpacing: '0.34em',
                                    textTransform: 'uppercase',
                                    color: TONE.gold,
                                    fontWeight: 700,
                                    fontFamily: 'system-ui, sans-serif',
                                }}
                            >
                                {eyebrow}
                            </div>
                        </TextLine>

                        <TextLine reduce={reduce} delay={1.68}>
                            <div style={{ fontFamily: SERIF, fontSize: 'clamp(26px, 8.5vw, 40px)', fontWeight: 600, color: TONE.plum, lineHeight: 1.05, marginTop: 10 }}>
                                Danial
                            </div>
                        </TextLine>
                        <TextLine reduce={reduce} delay={1.78}>
                            <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 'clamp(18px, 5vw, 24px)', color: TONE.gold, margin: '1px 0' }}>&amp;</div>
                        </TextLine>
                        <TextLine reduce={reduce} delay={1.88}>
                            <div style={{ fontFamily: SERIF, fontSize: 'clamp(26px, 8.5vw, 40px)', fontWeight: 600, color: TONE.plum, lineHeight: 1.05 }}>
                                Aisyah
                            </div>
                        </TextLine>

                        <TextLine reduce={reduce} delay={2.0}>
                            <CardDivider />
                        </TextLine>

                        <TextLine reduce={reduce} delay={2.08}>
                            <div
                                style={{
                                    fontSize: 'clamp(8px, 2.4vw, 10px)',
                                    letterSpacing: '0.28em',
                                    textTransform: 'uppercase',
                                    color: TONE.muted,
                                    fontFamily: 'system-ui, sans-serif',
                                    fontWeight: 600,
                                }}
                            >
                                {save}
                            </div>
                        </TextLine>
                        <TextLine reduce={reduce} delay={2.16}>
                            <div style={{ fontFamily: SERIF, fontSize: 'clamp(15px, 4.4vw, 20px)', color: TONE.ink, marginTop: 4 }}>{date}</div>
                        </TextLine>
                        <TextLine reduce={reduce} delay={2.24}>
                            <div style={{ fontSize: 'clamp(11px, 3.2vw, 13px)', color: TONE.muted, marginTop: 4, fontFamily: 'system-ui, sans-serif' }}>{venue}</div>
                        </TextLine>
                    </motion.div>

                    {/* One-time light sweep across the card */}
                    {!reduce && (
                        <motion.div
                            aria-hidden="true"
                            style={{
                                position: 'absolute',
                                inset: 0,
                                zIndex: 3,
                                pointerEvents: 'none',
                                background: 'linear-gradient(105deg, transparent 38%, rgba(255,255,255,0.55) 50%, transparent 62%)',
                            }}
                            initial={{ x: '-120%', opacity: 0 }}
                            animate={{ x: ['-120%', '120%'], opacity: [0, 1, 0] }}
                            transition={{ duration: 1.2, delay: 2.5, ease: 'easeInOut' }}
                        />
                    )}

                    {/* Closed curtains that part to reveal the card */}
                    {showCurtains && (
                        <>
                            <motion.div
                                aria-hidden="true"
                                style={{ ...curtainBase, left: 0, borderRight: `2px solid ${TONE.gold}` }}
                                initial={{ x: 0 }}
                                animate={{ x: '-104%' }}
                                transition={{ duration: 1.05, delay: 1.0, ease: EASE_CURTAIN }}
                            >
                                <Damask side="l" />
                            </motion.div>
                            <motion.div
                                aria-hidden="true"
                                style={{ ...curtainBase, right: 0, borderLeft: `2px solid ${TONE.gold}` }}
                                initial={{ x: 0 }}
                                animate={{ x: '104%' }}
                                transition={{ duration: 1.05, delay: 1.0, ease: EASE_CURTAIN }}
                            >
                                <Damask side="r" />
                            </motion.div>

                            {/* Wax seal that breaks as the curtains open */}
                            <motion.div
                                aria-hidden="true"
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    zIndex: 5,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    pointerEvents: 'none',
                                }}
                                initial={{ opacity: 0, scale: 0.6 }}
                                animate={{ opacity: [0, 1, 1, 0], scale: [0.6, 1, 1, 1.4] }}
                                transition={{ duration: 1.3, delay: 0.2, times: [0, 0.35, 0.7, 1], ease: EASE_OUT }}
                            >
                                <Seal />
                            </motion.div>
                        </>
                    )}
                </div>
            </motion.div>
        </div>
    );
}

const curtainBase: CSSProperties = {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '50.5%',
    zIndex: 4,
    background: `linear-gradient(180deg, ${TONE.plum} 0%, ${TONE.plumDeep} 100%)`,
    overflow: 'hidden',
    boxShadow: 'inset 0 0 40px rgba(0,0,0,0.3)',
};

function Seal() {
    return (
        <svg viewBox="0 0 90 90" aria-hidden="true" style={{ display: 'block', width: 'clamp(52px, 16vw, 76px)', height: 'clamp(52px, 16vw, 76px)' }}>
            <circle cx="45" cy="45" r="30" fill={TONE.gold} />
            <circle cx="45" cy="45" r="30" fill="none" stroke={TONE.roseDeep} strokeWidth="1.5" opacity="0.35" />
            {Array.from({ length: 20 }, (_, i) => {
                const a = (i / 20) * Math.PI * 2;
                return <circle key={i} cx={45 + Math.cos(a) * 30} cy={45 + Math.sin(a) * 30} r={2.4} fill={TONE.gold} />;
            })}
            <circle cx="45" cy="45" r="23" fill="none" stroke="#8a6a1e" strokeWidth="1" opacity="0.55" />
            <text x="45" y="57" textAnchor="middle" fontFamily={SERIF} fontStyle="italic" fontSize="34" fill="#4a3208" fontWeight={600}>
                &amp;
            </text>
        </svg>
    );
}

function TextLine({ children, reduce, delay }: { children: ReactNode; reduce: boolean; delay: number }) {
    return (
        <motion.div
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: reduce ? 0 : delay, ease: EASE_OUT }}
        >
            {children}
        </motion.div>
    );
}
