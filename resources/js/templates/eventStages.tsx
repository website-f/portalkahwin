// ============================================================
//  Event STAGE covers — genuinely distinct, animated hero layouts.
//
//  The old event system rendered ONE cover layout for every template and only
//  recoloured it, so all concerts / galas / corporate cards looked identical.
//  A "stage" is a bespoke, animated cover composition (like each hand-coded
//  wedding template has its own look): a marquee sign, a swept spotlight stage,
//  a spinning vinyl, an art-deco gala, an aurora launch, an Islamic arch, a
//  garden party, a birthday pop. EventPoster picks one per template
//  (config.eventStage ?? theme default) so no two designs share a layout.
//
//  Self-contained: inline SVG + CSS keyframes + framer-motion. No network.
// ============================================================

import { type CSSProperties, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Ticket, Calendar, MapPin, ChevronDown } from 'lucide-react';
import { hexA } from './templateArt';
import type { ResolvedEventTheme } from './eventThemes';

export type EventStageKey =
    | 'marquee' | 'spotlight' | 'vinyl' | 'deco' | 'launch' | 'arch' | 'garden' | 'pop';

// ---- colour helpers --------------------------------------------------------
function parseHex(hex: string): { r: number; g: number; b: number } {
    let h = (hex || '').replace('#', '').trim();
    if (h.length === 3) h = h.split('').map((x) => x + x).join('');
    const n = parseInt(h || '111319', 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function mix(a: string, b: string, t: number): string {
    const A = parseHex(a), B = parseHex(b);
    const c = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
    return `#${c(A.r, B.r)}${c(A.g, B.g)}${c(A.b, B.b)}`;
}
const lighten = (h: string, t: number) => mix(h, '#ffffff', t);
const darken = (h: string, t: number) => mix(h, '#000000', t);

export interface StageContent {
    chip?: string;
    title: string;
    subtitle?: string;
    dateLabel?: string;
    venueName?: string;
    organizer?: string;
    ctaLabel: string;
    poster?: string | null;
    presents: string;
    scrollLabel: string;
}

interface StageProps extends StageContent {
    stage: EventStageKey;
    T: ResolvedEventTheme;
    preview?: boolean;
    reduce: boolean;
}

/** The keyframes every stage animation references. Injected once by EventPoster. */
export const EVENT_STAGE_KEYFRAMES = `
@keyframes pk-st-spin { to { transform: rotate(360deg); } }
@keyframes pk-st-bob { 0%,100%{ transform: translateY(0) } 50%{ transform: translateY(-10px) } }
@keyframes pk-st-flick { 0%,100%{ opacity:1; transform: scaleY(1) } 45%{ opacity:.6; transform: scaleY(.82) } 70%{ opacity:.95; transform: scaleY(1.06) } }
@keyframes pk-st-bulb { 0%,100%{ opacity:1 } 50%{ opacity:.28 } }
@keyframes pk-st-rise { 0%{ transform: translateY(0) scale(1); opacity:0 } 12%{ opacity:.9 } 100%{ transform: translateY(-150px) scale(.5); opacity:0 } }
@keyframes pk-st-sweep { 0%,100%{ transform: rotate(var(--a,0deg)) translateX(0); opacity:.5 } 50%{ transform: rotate(calc(var(--a,0deg) + 8deg)) translateX(10px); opacity:.85 } }
@keyframes pk-st-aurora { 0%{ transform: translate(0,0) scale(1) } 33%{ transform: translate(6%,4%) scale(1.12) } 66%{ transform: translate(-5%,3%) scale(.94) } 100%{ transform: translate(0,0) scale(1) } }
@keyframes pk-st-eq { 0%,100%{ transform: scaleY(.4) } 50%{ transform: scaleY(1) } }
@keyframes pk-st-sway { 0%,100%{ transform: rotate(-5deg) } 50%{ transform: rotate(5deg) } }
@keyframes pk-st-draw { to { stroke-dashoffset: 0; } }
@keyframes pk-st-pulse { 0%,100%{ transform: scale(1); opacity:.9 } 50%{ transform: scale(1.5); opacity:.3 } }
@keyframes pk-st-twinkle { 0%,100%{ opacity:.2; transform:scale(.6) } 50%{ opacity:1; transform:scale(1) } }
`;

// ---- shared bits -----------------------------------------------------------
const COVER_SECTION: CSSProperties = {
    position: 'relative', minHeight: 'var(--pk-vh, 100vh)', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', textAlign: 'center',
    padding: '3rem 1.25rem var(--pk-cue-clear, 96px)', overflow: 'hidden',
};

function chipStyle(bg: string): CSSProperties {
    return { display: 'inline-block', padding: '0.3rem 0.9rem', borderRadius: 999, background: hexA(bg, 0.16), color: bg, fontSize: '0.74rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' };
}
function btnStyle(accent: string, accent2: string): CSSProperties {
    return { display: 'inline-flex', alignItems: 'center', gap: '0.55rem', padding: '0.9rem 1.7rem', borderRadius: 999, background: `linear-gradient(120deg, ${accent}, ${accent2})`, color: darken(accent, 0.75), fontWeight: 800, textDecoration: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', boxShadow: `0 14px 34px ${hexA(accent, 0.42)}` };
}

function coverAnim(preview: boolean | undefined, d = 0) {
    return preview ? {} : { initial: { opacity: 0, y: 22 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8, delay: d, ease: [0.22, 1, 0.36, 1] as const } };
}

/** Deterministic pseudo-random so SSR/thumbnail frames are stable. */
const rnd = (i: number, m: number) => ((i * 9301 + 49297) % 233280) / 233280 * m;

// ---- backgrounds (absolute layer behind the cover content) -----------------
function StageBg({ stage, T, anim }: { stage: EventStageKey; T: ResolvedEventTheme; anim: boolean }): ReactNode {
    const { ground, accent, accent2, ink } = T;
    const layer: CSSProperties = { position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' };

    switch (stage) {
        case 'launch': {
            // Eye-catching aurora mesh — big blurred blobs drifting. NOT plain black.
            const blobs = [
                { c: accent, x: '12%', y: '18%', s: 420, d: 15 },
                { c: accent2, x: '78%', y: '12%', s: 460, d: 19 },
                { c: lighten(accent2, 0.2), x: '62%', y: '72%', s: 400, d: 22 },
                { c: lighten(accent, 0.15), x: '20%', y: '78%', s: 360, d: 17 },
            ];
            return (
                <div aria-hidden style={{ ...layer, background: `linear-gradient(160deg, ${darken(ground, 0.15)}, ${ground})` }}>
                    {blobs.map((b, i) => (
                        <div key={i} style={{ position: 'absolute', left: b.x, top: b.y, width: b.s, height: b.s, marginLeft: -b.s / 2, marginTop: -b.s / 2, borderRadius: '50%', background: hexA(b.c, 0.55), filter: 'blur(70px)', animation: anim ? `pk-st-aurora ${b.d}s ease-in-out ${-i * 3}s infinite` : undefined }} />
                    ))}
                    {/* faint tech grid on top of the aurora */}
                    <div style={{ position: 'absolute', inset: 0, opacity: 0.14, background: `linear-gradient(${hexA(ink, 0.6)} 1px, transparent 1px), linear-gradient(90deg, ${hexA(ink, 0.6)} 1px, transparent 1px)`, backgroundSize: '48px 48px', maskImage: 'radial-gradient(circle at 50% 40%, #000, transparent 75%)', WebkitMaskImage: 'radial-gradient(circle at 50% 40%, #000, transparent 75%)' }} />
                </div>
            );
        }
        case 'spotlight': {
            // Dark stage: two swept light cones from the top + a floor glow.
            return (
                <div aria-hidden style={{ ...layer, background: `radial-gradient(120% 80% at 50% 120%, ${hexA(accent, 0.22)}, transparent 55%), linear-gradient(180deg, ${darken(ground, 0.1)}, ${ground})` }}>
                    {[{ a: '-14deg', l: '30%', c: accent }, { a: '14deg', l: '70%', c: accent2 }].map((s, i) => (
                        <div key={i} style={{ position: 'absolute', top: '-16%', left: s.l, width: 130, height: '90%', marginLeft: -65, transformOrigin: '50% 0', ['--a' as never]: s.a, background: `linear-gradient(180deg, ${hexA(s.c, 0.5)}, transparent 78%)`, clipPath: 'polygon(42% 0, 58% 0, 100% 100%, 0% 100%)', filter: 'blur(6px)', animation: anim ? `pk-st-sweep ${6 + i * 2}s ease-in-out ${-i}s infinite` : undefined }} />
                    ))}
                </div>
            );
        }
        case 'marquee':
            return (
                <div aria-hidden style={{ ...layer, background: `radial-gradient(90% 60% at 50% 0%, ${hexA(accent, 0.18)}, transparent 60%), linear-gradient(180deg, ${lighten(ground, 0.03)}, ${darken(ground, 0.22)})` }} />
            );
        case 'deco': {
            // Golden radiating fan behind the title.
            return (
                <div aria-hidden style={layer}>
                    <div style={{ position: 'absolute', top: '18%', left: '50%', width: 520, height: 520, marginLeft: -260, transform: 'translateY(-30%)', borderRadius: '50%', background: `repeating-conic-gradient(from 0deg at 50% 50%, ${hexA(accent, 0.18)} 0deg 5deg, transparent 5deg 13deg)`, maskImage: 'radial-gradient(circle, #000 12%, transparent 62%)', WebkitMaskImage: 'radial-gradient(circle, #000 12%, transparent 62%)' }} />
                </div>
            );
        }
        case 'vinyl':
            return <div aria-hidden style={{ ...layer, background: `radial-gradient(80% 60% at 74% 32%, ${hexA(accent, 0.2)}, transparent 60%), linear-gradient(180deg, ${lighten(ground, 0.02)}, ${darken(ground, 0.2)})` }} />;
        case 'arch':
            return <div aria-hidden style={{ ...layer, background: `radial-gradient(70% 50% at 50% 24%, ${hexA(accent, 0.16)}, transparent 62%)` }} />;
        case 'garden':
            return <div aria-hidden style={{ ...layer, background: `radial-gradient(90% 60% at 50% 0%, ${hexA(accent2, 0.18)}, transparent 60%)` }} />;
        case 'pop':
            return (
                <div aria-hidden style={{ ...layer }}>
                    {Array.from({ length: 16 }).map((_, i) => (
                        <span key={i} style={{ position: 'absolute', left: `${rnd(i, 100).toFixed(1)}%`, top: `${rnd(i + 5, 70).toFixed(1)}%`, width: 9, height: 9, borderRadius: i % 3 ? 2 : '50%', background: [accent, accent2, '#8ad6ff', '#ffd36e'][i % 4], transform: `rotate(${i * 40}deg)`, opacity: 0.8 }} />
                    ))}
                </div>
            );
        default:
            return null;
    }
}

// ---- heroes (the signature animated art above the title) -------------------
function StageHero({ stage, T, anim }: { stage: EventStageKey; T: ResolvedEventTheme; anim: boolean }): ReactNode {
    const { accent, accent2, ink } = T;
    const wrap: CSSProperties = { margin: '0.4rem auto 0.2rem', display: 'block' };

    switch (stage) {
        case 'spotlight':
            // Equaliser-free: a mic on a stand, silhouetted.
            return (
                <svg viewBox="0 0 120 130" width={110} style={wrap} aria-hidden>
                    <rect x="48" y="8" width="24" height="46" rx="12" fill={accent} />
                    <path d="M38 44 a22 22 0 0 0 44 0" fill="none" stroke={accent2} strokeWidth="3" />
                    <line x1="60" y1="66" x2="60" y2="104" stroke={hexA(ink, 0.8)} strokeWidth="3" />
                    <line x1="42" y1="112" x2="78" y2="112" stroke={hexA(ink, 0.8)} strokeWidth="4" strokeLinecap="round" />
                    {anim && [0, 1, 2].map((i) => <circle key={i} cx="60" cy="30" r={26 + i * 10} fill="none" stroke={hexA(accent, 0.4 - i * 0.1)} strokeWidth="1.4" style={{ transformOrigin: '60px 30px', animation: `pk-st-pulse ${2.4 + i * 0.5}s ease-out ${i * 0.4}s infinite` }} />)}
                </svg>
            );
        case 'vinyl':
            return (
                <svg viewBox="0 0 140 140" width={140} style={wrap} aria-hidden>
                    <g style={{ transformOrigin: '70px 70px', animation: anim ? 'pk-st-spin 6s linear infinite' : undefined }}>
                        <circle cx="70" cy="70" r="62" fill={darken(T.ground, 0.4)} stroke={hexA(accent, 0.5)} strokeWidth="1.5" />
                        {[54, 44, 34].map((r) => <circle key={r} cx="70" cy="70" r={r} fill="none" stroke={hexA(ink, 0.12)} strokeWidth="1" />)}
                        <circle cx="70" cy="70" r="22" fill={accent} />
                        <circle cx="70" cy="70" r="4" fill={darken(T.ground, 0.5)} />
                    </g>
                    {/* tonearm */}
                    <line x1="120" y1="20" x2="86" y2="60" stroke={hexA(ink, 0.8)} strokeWidth="3" strokeLinecap="round" />
                    <circle cx="120" cy="20" r="6" fill={accent2} />
                </svg>
            );
        case 'deco':
            return (
                <svg viewBox="0 0 200 120" width={200} style={wrap} aria-hidden>
                    {[80, 120].map((x, i) => (
                        <g key={i} transform={`rotate(${i ? 12 : -12} ${x} 60)`}>
                            <path d={`M${x - 12} 24 L${x + 12} 24 L${x + 4} 60 L${x - 4} 60 Z`} fill={hexA(accent, 0.85)} />
                            <line x1={x} y1="60" x2={x} y2="96" stroke={accent} strokeWidth="2" /><line x1={x - 10} y1="96" x2={x + 10} y2="96" stroke={accent} strokeWidth="2" />
                        </g>
                    ))}
                    <path d="M150 20 l3 9 9 3 -9 3 -3 9 -3 -9 -9 -3 9 -3 Z" fill={accent2} />
                </svg>
            );
        case 'launch':
            // A rising line chart that draws itself, glowing node at the peak.
            return (
                <svg viewBox="0 0 200 120" width={188} style={wrap} aria-hidden>
                    <polyline points="18,100 60,78 92,88 128,44 176,20" fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" style={anim ? { strokeDasharray: 320, strokeDashoffset: 320, animation: 'pk-st-draw 2.2s ease-out 0.3s forwards' } : undefined} />
                    <polygon points="18,100 60,78 92,88 128,44 176,20 176,110 18,110" fill={hexA(accent, 0.14)} />
                    <circle cx="176" cy="20" r="6" fill={accent2} />
                    {anim && <circle cx="176" cy="20" r="6" fill="none" stroke={accent2} strokeWidth="2" style={{ transformOrigin: '176px 20px', animation: 'pk-st-pulse 1.8s ease-out infinite' }} />}
                </svg>
            );
        case 'arch':
            // Ogee arch doorway framing two swaying ketupat (woven diamonds).
            return (
                <svg viewBox="0 0 170 150" width={140} style={wrap} aria-hidden>
                    <path d="M22 150 L22 66 Q22 18 85 8 Q148 18 148 66 L148 150" fill="none" stroke={hexA(accent, 0.9)} strokeWidth="2.4" />
                    <path d="M36 150 L36 70 Q36 30 85 22 Q134 30 134 70 L134 150" fill="none" stroke={hexA(accent2, 0.5)} strokeWidth="1.4" />
                    {[62, 108].map((cx, i) => (
                        <g key={i} style={{ transformOrigin: `${cx}px 34px`, animation: anim ? `pk-st-sway ${3.4 + i * 0.6}s ease-in-out ${-i * 0.4}s infinite` : undefined }}>
                            <line x1={cx} y1="34" x2={cx} y2="52" stroke={hexA(accent, 0.55)} strokeWidth="1.3" />
                            <g transform={`translate(${cx},70) rotate(45)`}>
                                <rect x="-17" y="-17" width="34" height="34" rx="3" fill={hexA(accent, 0.2)} stroke={accent} strokeWidth="2" />
                                <path d="M-17 -6 L17 -6 M-17 6 L17 6 M-6 -17 L-6 17 M6 -17 L6 17" stroke={hexA(accent2, 0.8)} strokeWidth="1.2" />
                            </g>
                        </g>
                    ))}
                </svg>
            );
        case 'garden':
            // Swaying floral garland.
            return (
                <svg viewBox="0 0 200 90" width={200} style={wrap} aria-hidden>
                    <path d="M6 14 Q100 70 194 14" fill="none" stroke={hexA(accent2, 0.7)} strokeWidth="2" />
                    {Array.from({ length: 9 }).map((_, i) => {
                        const x = 14 + i * 21; const y = 14 + Math.sin(i / 8 * Math.PI) * 46;
                        return <g key={i} style={{ transformOrigin: `${x}px ${y}px`, animation: `pk-st-sway ${3 + (i % 3)}s ease-in-out ${-i * 0.3}s infinite` }}>
                            <circle cx={x} cy={y} r={i % 2 ? 7 : 5} fill={i % 2 ? accent : accent2} />
                            <circle cx={x} cy={y} r="2" fill={hexA('#fff', 0.7)} />
                        </g>;
                    })}
                </svg>
            );
        case 'pop':
            // Cake with flickering candles + two bobbing balloons.
            return (
                <svg viewBox="0 0 200 160" width={180} style={wrap} aria-hidden>
                    <g style={{ transformOrigin: '42px 40px', animation: anim ? 'pk-st-bob 3s ease-in-out infinite' : undefined }}>
                        <circle cx="42" cy="34" r="17" fill={hexA(accent, 0.8)} /><line x1="42" y1="51" x2="52" y2="92" stroke={hexA(ink, 0.4)} strokeWidth="1.3" />
                    </g>
                    <g style={{ transformOrigin: '166px 30px', animation: anim ? 'pk-st-bob 3.4s ease-in-out .5s infinite' : undefined }}>
                        <circle cx="166" cy="30" r="15" fill={hexA(accent2, 0.8)} /><line x1="166" y1="45" x2="152" y2="88" stroke={hexA(ink, 0.4)} strokeWidth="1.3" />
                    </g>
                    {[86, 100, 114].map((x, i) => (<g key={x}><line x1={x} y1="54" x2={x} y2="72" stroke={accent2} strokeWidth="2.6" /><ellipse cx={x} cy="49" rx="4" ry="6" fill={accent} style={{ transformOrigin: `${x}px 49px`, animation: anim ? `pk-st-flick ${0.9 + i * 0.2}s ease-in-out infinite` : undefined }} /></g>))}
                    <rect x="70" y="72" width="60" height="24" rx="5" fill={hexA(accent, 0.9)} />
                    <rect x="60" y="96" width="80" height="32" rx="6" fill={accent} />
                    <path d="M60 105 q10 8 20 0 q10 8 20 0 q10 8 20 0 q10 8 20 0" fill="none" stroke={hexA('#fff', 0.6)} strokeWidth="2" />
                </svg>
            );
        default:
            return null;
    }
}

/** A theatre marquee board: title framed by chasing light bulbs + an equaliser. */
function MarqueeBoard({ T, title, subtitle, anim }: { T: ResolvedEventTheme; title: string; subtitle?: string; anim: boolean }): ReactNode {
    const { accent, accent2, ink, display, ground } = T;
    const bulbs = 26;
    return (
        <div style={{ position: 'relative', width: 'min(96%, 460px)', margin: '0.6rem auto 0', padding: '2.4rem 1.6rem 1.8rem', borderRadius: 16, background: `linear-gradient(180deg, ${darken(ground, 0.15)}, ${darken(ground, 0.35)})`, border: `2px solid ${hexA(accent, 0.6)}`, boxShadow: `0 0 40px ${hexA(accent, 0.35)}, inset 0 0 40px ${hexA(accent, 0.12)}` }}>
            {/* bulbs around the perimeter */}
            {Array.from({ length: bulbs }).map((_, i) => {
                const t = i / bulbs; const per = t * 2 * Math.PI;
                // place along a rounded rectangle perimeter (approx via ellipse)
                const x = 50 + 47 * Math.cos(per); const y = 50 + 47 * Math.sin(per);
                return <span key={i} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, width: 7, height: 7, marginLeft: -3.5, marginTop: -3.5, borderRadius: '50%', background: i % 2 ? accent2 : accent, boxShadow: `0 0 8px ${hexA(i % 2 ? accent2 : accent, 0.9)}`, animation: anim ? `pk-st-bulb ${1.2}s ease-in-out ${-(i % 6) * 0.2}s infinite` : undefined }} />;
            })}
            <div style={{ fontFamily: display, fontWeight: 900, fontSize: 'clamp(2rem, 9vw, 3.4rem)', lineHeight: 0.98, letterSpacing: '-0.02em', color: ink, textShadow: `0 0 22px ${hexA(accent, 0.6)}` }}>{title}</div>
            {subtitle && <div style={{ marginTop: '0.7rem', color: hexA(ink, 0.75), fontSize: 'clamp(0.95rem, 3.4vw, 1.1rem)' }}>{subtitle}</div>}
            {/* equaliser */}
            <div style={{ display: 'flex', gap: 5, justifyContent: 'center', alignItems: 'flex-end', height: 40, marginTop: '1.2rem' }}>
                {Array.from({ length: 12 }).map((_, i) => (
                    <span key={i} style={{ width: 6, height: '100%', borderRadius: 3, background: i % 2 ? accent2 : accent, transformOrigin: 'bottom', animation: anim ? `pk-st-eq ${0.7 + (i % 4) * 0.18}s ease-in-out ${-(i % 5) * 0.15}s infinite` : undefined, transform: anim ? undefined : `scaleY(${0.4 + rnd(i, 0.6)})` }} />
                ))}
            </div>
        </div>
    );
}

// ---- the stage cover -------------------------------------------------------
export function EventStage(p: StageProps): ReactNode {
    const { T, stage, preview, reduce } = p;
    const { ink, inkSoft, accent, accent2, display } = T;
    const anim = !preview && !reduce;
    const isMarquee = stage === 'marquee';

    const title = (
        <motion.h1 {...coverAnim(preview, 0.2)} style={{ fontFamily: display, fontWeight: 900, fontSize: 'clamp(2.3rem, 11vw, 4.4rem)', lineHeight: 0.98, letterSpacing: '-0.03em', margin: '1rem 0 0', textShadow: `0 2px 30px ${hexA(accent, 0.35)}`, background: `linear-gradient(120deg, ${ink}, ${lighten(accent, 0.35)})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
            {p.title}
        </motion.h1>
    );

    return (
        <section style={COVER_SECTION}>
            <StageBg stage={stage} T={T} anim={anim} />

            <div style={{ position: 'relative', zIndex: 2, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {p.chip && <motion.div {...coverAnim(preview, 0.05)}><span style={chipStyle(accent)}>{p.chip}</span></motion.div>}

                {p.poster ? (
                    <motion.div {...coverAnim(preview, 0.12)} style={{ margin: '1.3rem 0 0.4rem', width: '100%', maxWidth: 320 }}>
                        <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', border: `1px solid ${hexA(accent, 0.5)}`, boxShadow: `0 26px 60px rgba(0,0,0,0.5)`, aspectRatio: '3 / 4' }}>
                            <img src={p.poster} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        </div>
                    </motion.div>
                ) : isMarquee ? (
                    <motion.div {...coverAnim(preview, 0.12)} style={{ width: '100%' }}>
                        <MarqueeBoard T={T} title={p.title} subtitle={p.subtitle} anim={anim} />
                    </motion.div>
                ) : (
                    <motion.div {...coverAnim(preview, 0.12)} style={{ width: '100%' }}>
                        <StageHero stage={stage} T={T} anim={anim} />
                    </motion.div>
                )}

                {/* Marquee already shows title+subtitle inside the board. */}
                {!isMarquee && title}
                {!isMarquee && p.subtitle && (
                    <motion.p {...coverAnim(preview, 0.28)} style={{ maxWidth: 520, marginTop: '1rem', fontSize: 'clamp(1.05rem, 4vw, 1.25rem)', lineHeight: 1.6, color: inkSoft }}>{p.subtitle}</motion.p>
                )}

                <motion.div {...coverAnim(preview, 0.36)} style={{ display: 'flex', gap: '0.6rem 1.2rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '1.4rem', color: inkSoft, fontSize: '0.98rem' }}>
                    {p.dateLabel && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}><Calendar size={17} style={{ color: accent }} /> {p.dateLabel}</span>}
                    {p.venueName && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}><MapPin size={17} style={{ color: accent }} /> {p.venueName}</span>}
                </motion.div>

                <motion.div {...coverAnim(preview, 0.46)} style={{ marginTop: '1.7rem' }}>
                    <a href="#tickets" style={btnStyle(accent, accent2)}><Ticket size={19} /> {p.ctaLabel}</a>
                </motion.div>

                {p.organizer && (
                    <motion.div {...coverAnim(preview, 0.54)} style={{ marginTop: '1.4rem', fontSize: '0.8rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: inkSoft }}>
                        {p.presents} · <span style={{ color: ink, fontWeight: 700 }}>{p.organizer}</span>
                    </motion.div>
                )}
            </div>

            {!preview && (
                <motion.div style={{ position: 'absolute', bottom: 26, display: 'flex', flexDirection: 'column', alignItems: 'center', color: accent, fontSize: '0.7rem', letterSpacing: '0.24em', textTransform: 'uppercase', zIndex: 2 }} animate={{ y: [0, 9, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}>
                    {p.scrollLabel}<ChevronDown size={22} />
                </motion.div>
            )}
        </section>
    );
}
