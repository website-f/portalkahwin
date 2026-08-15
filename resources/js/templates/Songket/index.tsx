import { useEffect, useId, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { BrandLogo } from '../../components/BrandLogo';
import { motion, useReducedMotion } from 'framer-motion';
import { PkSec } from '../PkSec';
import {
    Calendar,
    Check,
    ChevronDown,
    Clock,
    Copy,
    Gift,
    Heart,
    MapPin,
    Navigation,
    Phone,
} from 'lucide-react';
import type { TemplateProps } from '../types';
import { useCardText } from '../cardText';
import { REVEAL_TIMING, TEMPLATE_ART } from '../templateArt';

/**
 * Entrance personality for this design, from its art direction — the
 * catalogue used to share one easing curve, which made every card feel
 * the same however differently it was coloured.
 */
const MOTION = REVEAL_TIMING[TEMPLATE_ART['songket'].reveal];


// ============================================================
// Songket — a warm, regal Malay-traditional wedding e-invite.
// Rich maroon/marsala + antique gold. All motifs are ORIGINAL
// inline SVG: a woven songket lattice, "pucuk rebung" borders
// and "tampuk manggis" rosettes. Self-contained, no network.
// ============================================================

const SERIF = "Georgia, 'Palatino Linotype', 'Book Antiqua', 'Times New Roman', serif";
const NAMES = "var(--pk-name, Georgia), 'Palatino Linotype', 'Book Antiqua', 'Times New Roman', serif";

// ---- colour helpers --------------------------------------------------------
interface Colors {
    base: string;
    baseDeep: string;
    baseMid: string;
    gold: string;
    goldLight: string;
    goldDeep: string;
    cream: string;
    text: string;
    onMaroon: string;
}

function clamp255(n: number): number {
    return Math.max(0, Math.min(255, Math.round(n)));
}

function parseHex(hex: string): { r: number; g: number; b: number } {
    let h = hex.replace('#', '').trim();
    if (h.length === 3) h = h.split('').map((x) => x + x).join('');
    const num = parseInt(h || '000000', 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function toHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map((v) => clamp255(v).toString(16).padStart(2, '0')).join('');
}

function mix(a: string, b: string, t: number): string {
    const A = parseHex(a);
    const B = parseHex(b);
    return toHex(A.r + (B.r - A.r) * t, A.g + (B.g - A.g) * t, A.b + (B.b - A.b) * t);
}

const darken = (hex: string, t: number): string => mix(hex, '#000000', t);
const lighten = (hex: string, t: number): string => mix(hex, '#ffffff', t);

function rgba(hex: string, a: number): string {
    const { r, g, b } = parseHex(hex);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function fallbackCopy(text: string, done: () => void): void {
    try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
    } catch {
        /* ignore — non-critical */
    }
    done();
}

// ---- live countdown hook ---------------------------------------------------
interface CountdownParts {
    days: number;
    hours: number;
    mins: number;
    secs: number;
    done: boolean;
}

function useCountdown(target?: string, paused?: boolean): CountdownParts | null {
    const [now, setNow] = useState<number>(() => Date.now());

    useEffect(() => {
        if (!target || paused) return;
        const id = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(id);
    }, [target, paused]);

    if (!target) return null;
    const t = new Date(target).getTime();
    if (Number.isNaN(t)) return null;

    const diff = Math.max(0, t - now);
    return {
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        mins: Math.floor((diff % 3600000) / 60000),
        secs: Math.floor((diff % 60000) / 1000),
        done: diff <= 0,
    };
}

// ---- ORIGINAL SVG motifs ---------------------------------------------------

/** Woven gold songket lattice — a tiling diamond/floral pattern. */
function SongketPattern({
    c,
    id,
    opacity = 0.5,
    animateIn = true,
    preview = false,
}: {
    c: Colors;
    id: string;
    opacity?: number;
    animateIn?: boolean;
    preview?: boolean;
}) {
    const pid = `sk-pat-${id}`;
    const fill = `url(#${pid})`;
    return (
        <svg aria-hidden="true" width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
            <defs>
                <pattern id={pid} width="44" height="44" patternUnits="userSpaceOnUse">
                    <g fill="none" stroke={c.gold} strokeWidth={1}>
                        <path d="M22 3 L41 22 L22 41 L3 22 Z" opacity={0.45} />
                        <path d="M22 12 L32 22 L22 32 L12 22 Z" opacity={0.75} />
                    </g>
                    <path
                        d="M0 22 L22 0 L44 22 L22 44 Z"
                        fill="none"
                        stroke={c.goldLight}
                        strokeWidth={0.5}
                        opacity={0.3}
                    />
                    <g fill={c.gold}>
                        <circle cx="22" cy="22" r="1.7" />
                        <circle cx="0" cy="0" r="1.1" />
                        <circle cx="44" cy="0" r="1.1" />
                        <circle cx="0" cy="44" r="1.1" />
                        <circle cx="44" cy="44" r="1.1" />
                        <circle cx="22" cy="0" r="1" />
                        <circle cx="0" cy="22" r="1" />
                        <circle cx="44" cy="22" r="1" />
                        <circle cx="22" cy="44" r="1" />
                    </g>
                    <g fill={c.goldLight} opacity={0.85}>
                        <circle cx="22" cy="15" r="1.3" />
                        <circle cx="29" cy="22" r="1.3" />
                        <circle cx="22" cy="29" r="1.3" />
                        <circle cx="15" cy="22" r="1.3" />
                    </g>
                </pattern>
            </defs>
            {animateIn && !preview ? (
                <motion.rect
                    width="100%"
                    height="100%"
                    fill={fill}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity }}
                    transition={{ duration: 1.6, ease: 'easeOut' }}
                    viewport={{ once: true, amount: 0.15 }}
                />
            ) : (
                <rect width="100%" height="100%" fill={fill} opacity={opacity} />
            )}
        </svg>
    );
}

/** "Pucuk rebung" bamboo-shoot triangle border — draws itself in on scroll. */
function PucukRebungBorder({
    c,
    preview = false,
    flip = false,
}: {
    c: Colors;
    preview?: boolean;
    flip?: boolean;
}) {
    const W = 320;
    const H = 30;
    const count = 10;
    const top = 4;
    const bottom = H - 3;
    const step = W / count;

    let zig = `M 0 ${bottom}`;
    const tris: string[] = [];
    for (let i = 0; i < count; i += 1) {
        const x0 = i * step;
        zig += ` L ${x0 + step / 2} ${top} L ${x0 + step} ${bottom}`;
        tris.push(`M ${x0} ${bottom} L ${x0 + step / 2} ${top} L ${x0 + step} ${bottom} Z`);
    }

    return (
        <svg
            aria-hidden="true"
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            width="100%"
            height={H}
            style={{ display: 'block', transform: flip ? 'scaleY(-1)' : undefined }}
        >
            {tris.map((d, i) => (
                <motion.path
                    key={i}
                    d={d}
                    fill={c.gold}
                    stroke="none"
                    initial={preview ? false : { opacity: 0 }}
                    whileInView={preview ? undefined : { opacity: 0.16 }}
                    animate={preview ? { opacity: 0.16 } : undefined}
                    transition={{ duration: 0.5, delay: 0.1 + i * 0.05 }}
                    viewport={{ once: true, amount: 0.15 }}
                />
            ))}
            <motion.path
                d={zig}
                fill="none"
                stroke={c.gold}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                initial={preview ? false : { pathLength: 0, opacity: 0 }}
                whileInView={preview ? undefined : { pathLength: 1, opacity: 1 }}
                animate={preview ? { pathLength: 1, opacity: 1 } : undefined}
                transition={{ duration: 1.6, ease: 'easeInOut' }}
                viewport={{ once: true, amount: 0.15 }}
            />
            <line x1="0" y1={bottom} x2={W} y2={bottom} stroke={c.goldDeep} strokeWidth={1} opacity={0.7} />
            {Array.from({ length: count }).map((_, i) => (
                <circle key={`d${i}`} cx={i * step + step / 2} cy={top} r="1.6" fill={c.goldLight} />
            ))}
        </svg>
    );
}

/** "Tampuk manggis" — mangosteen-calyx rosette. */
function TampukManggis({ c, size = 56 }: { c: Colors; size?: number }) {
    const petals = 8;
    return (
        <svg aria-hidden="true" width={size} height={size} viewBox="-50 -50 100 100" style={{ display: 'block' }}>
            <g fill="none" stroke={c.gold}>
                <circle r="47" strokeWidth={1} opacity={0.45} />
                <circle r="41" strokeWidth={1.5} opacity={0.8} />
            </g>
            {Array.from({ length: petals }).map((_, i) => (
                <path
                    key={i}
                    d="M0 -40 C 9 -31, 9 -15, 0 -9 C -9 -15, -9 -31, 0 -40 Z"
                    transform={`rotate(${(360 / petals) * i})`}
                    fill={i % 2 ? c.gold : c.goldLight}
                    stroke={c.goldDeep}
                    strokeWidth={0.6}
                    opacity={i % 2 ? 0.9 : 0.7}
                />
            ))}
            {Array.from({ length: petals }).map((_, i) => (
                <circle
                    key={`p${i}`}
                    cx="0"
                    cy="-26"
                    r="1.6"
                    fill={c.baseDeep}
                    transform={`rotate(${(360 / petals) * i})`}
                />
            ))}
            <circle r="11" fill={c.goldDeep} />
            <circle r="6.5" fill={c.gold} />
            <circle r="2.5" fill={c.goldLight} />
        </svg>
    );
}

/** Small pucuk-rebung bullet used in the programme timeline. */
function MiniPucuk({ c }: { c: Colors }) {
    return (
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" style={{ display: 'block' }}>
            <path d="M8 1 L15 15 L1 15 Z" fill="none" stroke={c.gold} strokeWidth={1.2} />
            <path d="M8 5 L11.5 13 L4.5 13 Z" fill={c.gold} opacity={0.5} />
        </svg>
    );
}

/** Horizontal gold rule with a rosette centre (section divider). */
function GoldRule({ c, preview = false, size = 52 }: { c: Colors; preview?: boolean; size?: number }) {
    const line = (dir: 'l' | 'r'): CSSProperties => ({
        height: 1,
        width: 'clamp(40px, 18vw, 120px)',
        background:
            dir === 'l'
                ? `linear-gradient(90deg, transparent, ${c.gold})`
                : `linear-gradient(90deg, ${c.gold}, transparent)`,
    });
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.9rem',
                margin: '1.6rem 0',
            }}
        >
            <span style={line('l')} />
            <motion.span
                style={{ display: 'inline-flex' }}
                initial={preview ? false : { rotate: -40, scale: 0.4, opacity: 0 }}
                whileInView={preview ? undefined : { rotate: 0, scale: 1, opacity: 1 }}
                animate={preview ? { rotate: 0, scale: 1, opacity: 1 } : undefined}
                transition={{ duration: 0.9, ease: 'easeOut' }}
                viewport={{ once: true, amount: 0.15 }}
            >
                <TampukManggis c={c} size={size} />
            </motion.span>
            <span style={line('r')} />
        </div>
    );
}

function Eyebrow({ c, icon, children }: { c: Colors; icon?: ReactNode; children: ReactNode }) {
    return (
        <div
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.55rem',
                color: c.gold,
                textTransform: 'uppercase',
                letterSpacing: '0.26em',
                fontSize: '0.82rem',
                fontWeight: 600,
                justifyContent: 'center',
            }}
        >
            {icon}
            <span>{children}</span>
        </div>
    );
}

function Placeholder({ c, text }: { c: Colors; text: string }) {
    return (
        <div
            style={{
                border: `1px dashed ${rgba(c.gold, 0.5)}`,
                borderRadius: 16,
                padding: '2rem 1.4rem',
                color: c.onMaroon,
                background: rgba(c.baseDeep, 0.5),
                fontStyle: 'italic',
                fontSize: '1.02rem',
            }}
        >
            {text}
        </div>
    );
}

/** Signature: drifting tiny gold songket flecks (cover flourish).
 *  GPU-cheap — the outer span falls, the inner diamond sways; both animate
 *  transform + opacity only. Capped at 14 elements. */
function GoldFlecks({ c }: { c: Colors }) {
    const flecks = useMemo(
        () =>
            Array.from({ length: 14 }, (_, i) => ({
                key: i,
                left: (i * 7.1 + 4) % 100,
                delay: (i % 7) * 1.3,
                fall: 10 + (i % 5) * 2,
                sway: 2.8 + (i % 4) * 0.6,
                size: 4 + (i % 3) * 3,
            })),
        [],
    );
    return (
        <div
            aria-hidden="true"
            style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}
        >
            {flecks.map((f) => (
                <span
                    key={f.key}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: `${f.left}%`,
                        animation: `sk-fleck-fall ${f.fall}s linear ${f.delay}s infinite`,
                        willChange: 'transform',
                    }}
                >
                    <span
                        style={{
                            display: 'block',
                            width: f.size,
                            height: f.size,
                            background: c.goldLight,
                            transform: 'rotate(45deg)',
                            opacity: 0.75,
                            animation: `sk-fleck-sway ${f.sway}s ease-in-out ${f.delay}s infinite alternate`,
                            willChange: 'transform',
                        }}
                    />
                </span>
            ))}
        </div>
    );
}

// ---- main template ---------------------------------------------------------
export default function SongketTemplate({ data, preview, slots }: TemplateProps) {
    const tr = useCardText();
    const uid = useId().replace(/:/g, '');
    const reduce = useReducedMotion() ?? false;
    const pal = data.palette;

    // A ground-is-primary design can arrive with its palette in either convention:
    // the art table stores primary=maroon/bg=cream, but the saved DB row stores it
    // inverted (primary=cream, bg=maroon). Pick the ground + surface by luminance
    // so the ground is ALWAYS the dark maroon and the card never washes out.
    const lum = (hex: string) => { const { r, g, b } = parseHex(hex); return 0.299 * r + 0.587 * g + 0.114 * b; };
    const cPrimary = pal?.primary ?? '#54121d';
    const cBg = pal?.bg ?? '#f7ecd6';
    const base = lum(cPrimary) <= lum(cBg) ? cPrimary : cBg; // dark maroon ground
    const cream = lum(cPrimary) <= lum(cBg) ? cBg : cPrimary; // light surface
    const gold = pal?.accent ?? '#caa14a';
    const bodyText = pal?.text ?? '#4a2a24';

    const c: Colors = {
        base,
        baseDeep: darken(base, 0.45),
        baseMid: lighten(base, 0.1),
        gold,
        goldLight: lighten(gold, 0.35),
        goldDeep: darken(gold, 0.3),
        cream,
        text: bodyText,
        onMaroon: lighten(gold, 0.72), // pale gold — always light & readable on maroon
    };

    const cd = useCountdown(data.receptionAt, preview);

    const [copied, setCopied] = useState(false);
    const copyText = (t: string) => {
        const done = () => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1800);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(t).then(done).catch(() => fallbackCopy(t, done));
        } else {
            fallbackCopy(t, done);
        }
    };

    // reveal helpers (reduced motion when preview)
    const item = (delay = 0) =>
        preview
            ? {}
            : {
                  initial: { opacity: 0, y: MOTION.y },
                  whileInView: { opacity: 1, y: 0 },
                  viewport: { once: true, amount: 0.15 },
                  transition: { duration: 0.7, delay, ease: 'easeOut' as const },
              };
    const coverItem = (delay = 0) =>
        preview
            ? {}
            : {
                  initial: { opacity: 0, y: 26 },
                  animate: { opacity: 1, y: 0 },
                  transition: { duration: 0.8, delay, ease: 'easeOut' as const },
              };

    // shared style tokens
    const sectionStyle: CSSProperties = {
        position: 'relative',
        padding: '4rem 1.3rem',
        textAlign: 'center',
    };
    const bodyStyle: CSSProperties = {
        fontSize: 'clamp(1.02rem, 3.6vw, 1.18rem)',
        lineHeight: 1.8,
        color: c.onMaroon,
        margin: 0,
    };
    const headingStyle: CSSProperties = {
        fontFamily: SERIF,
        fontSize: 'clamp(2rem, 9vw, 3rem)',
        color: c.goldLight,
        margin: 0,
        lineHeight: 1.15,
    };
    /** headingStyle, but for the couple's names, which follow the host's font. */
    const nameStyle: CSSProperties = { ...headingStyle, fontFamily: NAMES };

    const panelStyle: CSSProperties = {
        background: `linear-gradient(160deg, ${c.baseDeep}, ${darken(c.base, 0.2)})`,
        border: `1px solid ${rgba(c.gold, 0.4)}`,
        borderRadius: 18,
        padding: '1.5rem 1.35rem',
        boxShadow: `0 12px 34px rgba(0,0,0,0.35), inset 0 0 0 1px ${rgba(c.goldLight, 0.05)}`,
        textAlign: 'center',
    };

    const cssVars: Record<string, string> = {
        '--sk-gold': c.gold,
        '--sk-gold-light': c.goldLight,
        '--sk-gold-deep': c.goldDeep,
        '--sk-base': c.base,
        '--sk-base-deep': c.baseDeep,
        '--sk-on': c.onMaroon,
    };
    const rootStyle = {
        ...cssVars,
        position: 'relative',
        minHeight: '100%',
        fontFamily: SERIF,
        color: c.onMaroon,
        background: `radial-gradient(760px 520px at 14% 6%, ${rgba(c.gold, 0.12)}, transparent 55%), radial-gradient(760px 520px at 86% 94%, ${rgba(c.gold, 0.1)}, transparent 55%), radial-gradient(1200px 600px at 50% -10%, ${lighten(c.base, 0.1)}, transparent 60%), linear-gradient(180deg, ${c.baseDeep}, ${c.base} 32%, ${c.baseDeep})`,
        WebkitFontSmoothing: 'antialiased',
        overflowX: 'hidden',
    } as unknown as CSSProperties;

    const styleText = `
.sk-root .sk-shimmer{
    background: linear-gradient(100deg, var(--sk-gold-deep), var(--sk-gold-light), var(--sk-gold), var(--sk-gold-light), var(--sk-gold-deep));
    background-size: 220% auto;
    -webkit-background-clip: text;
    background-clip: text;
    color: var(--sk-gold-light);
    -webkit-text-fill-color: transparent;
}
.sk-root .sk-shimmer:not(.sk-static){ animation: sk-shimmer 6s linear infinite; }
@keyframes sk-shimmer{ from{ background-position: 0% center; } to{ background-position: 220% center; } }
.sk-root .sk-btn{
    display: inline-flex; align-items: center; gap: 0.55rem;
    padding: 0.82rem 1.35rem; border: 1px solid var(--sk-gold);
    border-radius: 999px; color: var(--sk-gold-light); background: transparent;
    font-family: inherit; font-size: 1rem; line-height: 1.2; text-decoration: none;
    cursor: pointer;
    transition: background .25s ease, color .25s ease, box-shadow .25s ease, transform .15s ease;
}
.sk-root .sk-btn:hover{ background: var(--sk-gold); color: var(--sk-base-deep); box-shadow: 0 8px 22px rgba(0,0,0,.4); }
.sk-root .sk-btn:active{ transform: translateY(1px); }
@keyframes sk-fleck-fall{
    0%{ transform: translateY(-12vh); opacity: 0; }
    10%{ opacity: 0.8; }
    90%{ opacity: 0.8; }
    100%{ transform: translateY(112vh); opacity: 0; }
}
@keyframes sk-fleck-sway{
    0%{ transform: translateX(-9px) rotate(35deg); }
    100%{ transform: translateX(9px) rotate(55deg); }
}
@media (prefers-reduced-motion: reduce){
    .sk-root .sk-shimmer{ animation: none !important; }
}
`;

    const groomShort = data.groomShort || data.groomName;
    const brideShort = data.brideShort || data.brideName;
    const nameCls = `sk-shimmer${preview ? ' sk-static' : ''}`;
    const nameStaticStyle: CSSProperties | undefined = preview ? { animation: 'none' } : undefined;

    const hasContacts = !!(data.contacts && data.contacts.length > 0);
    const hasProgram = !!(data.program && data.program.length > 0);
    const hasGallery = !!(data.galleryImages && data.galleryImages.length > 0);
    const hasLokasi = !!(data.venueName || data.venueAddress);
    const hasMapButtons = !!(data.mapsUrl || data.wazeUrl);

    const countdownCells: Array<{ v: number; label: string; pad?: boolean }> = cd
        ? [
              { v: cd.days, label: 'Hari' },
              { v: cd.hours, label: tr("Jam"), pad: true },
              { v: cd.mins, label: tr("Minit"), pad: true },
              { v: cd.secs, label: tr("Saat"), pad: true },
          ]
        : [];

    return (
        <div className="sk-root" style={rootStyle}>
            <style>{styleText}</style>

            {/* Woven ground, two scales: a large gold diamond lattice under the
                fine songket weave, so the maroon reads as cloth rather than paint.
                Both stay low-opacity — the pale-gold text keeps full contrast. */}
            <div
                aria-hidden="true"
                style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.16,
                    backgroundImage: `repeating-linear-gradient(45deg, ${rgba(c.gold, 0.55)} 0 1px, transparent 1px 34px), repeating-linear-gradient(-45deg, ${rgba(c.gold, 0.55)} 0 1px, transparent 1px 34px)`,
                }}
            />
            <div
                aria-hidden="true"
                style={{ position: 'absolute', inset: 0, overflow: 'hidden', opacity: 0.11, pointerEvents: 'none' }}
            >
                <SongketPattern c={c} id={`${uid}-bg`} opacity={1} animateIn={false} preview={preview} />
            </div>

            <div style={{ position: 'relative', zIndex: 1, maxWidth: 680, margin: '0 auto' }}>
                {/* ============ 1. COVER ============ */}
                <section
                    style={{
                        minHeight: 'var(--pk-vh, 100vh)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        padding: '2.5rem 1.25rem',
                        // Clear the absolutely-positioned scroll cue below (~66px tall from the
                        // bottom edge) so centred content can never sit underneath it.
                        paddingBottom: 'var(--pk-cue-clear, 96px)',
                        position: 'relative',
                    }}
                >
                    {!preview && !reduce && <GoldFlecks c={c} />}

                    {data.bismillah && (
                        <motion.div
                            {...coverItem(0.05)}
                            style={{ position: 'relative', zIndex: 1, marginBottom: '1.6rem', color: c.goldLight }}
                        >
                            <div dir="rtl" lang="ar" style={{ fontSize: 'clamp(1.6rem, 8vw, 2.4rem)', lineHeight: 1.6 }}>
                                بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                            </div>
                            <div
                                style={{
                                    fontStyle: 'italic',
                                    fontSize: '0.9rem',
                                    color: c.onMaroon,
                                    marginTop: '0.45rem',
                                    opacity: 0.9,
                                }}
                            >
                                Dengan nama Allah Yang Maha Pemurah lagi Maha Penyayang
                            </div>
                        </motion.div>
                    )}

                    <motion.div {...coverItem(0.18)} style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 520 }}>
                        <div
                            style={{
                                position: 'relative',
                                borderRadius: 22,
                                overflow: 'hidden',
                                border: `1px solid ${rgba(c.gold, 0.5)}`,
                                background: `linear-gradient(160deg, ${rgba(c.baseDeep, 0.92)}, ${rgba(c.base, 0.6)})`,
                                padding: '2rem 1.4rem 2.2rem',
                                boxShadow: '0 22px 55px rgba(0,0,0,0.45)',
                            }}
                        >
                            <SongketPattern c={c} id={`${uid}-cover`} opacity={0.5} preview={preview} />
                            <div style={{ position: 'relative', zIndex: 1 }}>
                                <PucukRebungBorder c={c} preview={preview} />

                                <div
                                    style={{
                                        margin: '1.4rem 0 0.4rem',
                                        color: c.gold,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.34em',
                                        fontSize: '0.8rem',
                                    }}
                                >
                                    {tr("Walimatulurus")}
                                </div>

                                <div
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.2rem',
                                        margin: '1rem 0 1.2rem',
                                    }}
                                >
                                    <span
                                        className={nameCls}
                                        style={{
                                            ...nameStaticStyle,
                                            fontFamily: NAMES,
                                            fontSize: 'clamp(2.6rem, 13vw, 4rem)',
                                            lineHeight: 1.02,
                                        }}
                                    >
                                        {groomShort}
                                    </span>
                                    <span
                                        style={{
                                            fontFamily: SERIF,
                                            fontSize: 'clamp(1.4rem, 7vw, 2rem)',
                                            color: c.gold,
                                            fontStyle: 'italic',
                                        }}
                                    >
                                        &amp;
                                    </span>
                                    <span
                                        className={nameCls}
                                        style={{
                                            ...nameStaticStyle,
                                            fontFamily: NAMES,
                                            fontSize: 'clamp(2.6rem, 13vw, 4rem)',
                                            lineHeight: 1.02,
                                        }}
                                    >
                                        {brideShort}
                                    </span>
                                </div>

                                <PucukRebungBorder c={c} preview={preview} flip />
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        {...coverItem(0.4)}
                        style={{
                            position: 'relative',
                            zIndex: 1,
                            marginTop: '2rem',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.35rem',
                            color: c.gold,
                        }}
                    >
                        <motion.div
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', willChange: 'transform' }}
                            animate={preview ? undefined : { y: [0, 10, 0] }}
                            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                        >
                            <span
                                style={{
                                    fontSize: '0.72rem',
                                    letterSpacing: '0.28em',
                                    textTransform: 'uppercase',
                                }}
                            >
                                {tr("Skrol")}
                            </span>
                            <ChevronDown size={26} />
                        </motion.div>
                    </motion.div>
                </section>

                {/* ============ 2. OPENING ============ */}
                <section style={sectionStyle}>
                    <motion.div {...item(0)}>
                        <Eyebrow c={c}>Assalamualaikum w.b.t.</Eyebrow>
                    </motion.div>
                    <motion.div {...item(0.05)}>
                        <GoldRule c={c} preview={preview} size={46} />
                    </motion.div>
                    {data.openingLine && (
                        <motion.p
                            {...item(0.1)}
                            style={{
                                ...bodyStyle,
                                maxWidth: 560,
                                margin: '0 auto',
                                fontStyle: 'italic',
                                fontSize: 'clamp(1.15rem, 4.4vw, 1.42rem)',
                            }}
                        >
                            {data.openingLine}
                        </motion.p>
                    )}
                </section>

                {/* ============ 3. COUPLE ============ */}
                <section style={sectionStyle}>
                    <motion.div {...item(0)}>
                        <Eyebrow c={c} icon={<Heart size={16} />}>
                            Dengan hormat menjemput ke walimatulurus
                        </Eyebrow>
                    </motion.div>

                    <motion.div {...item(0.08)} style={{ marginTop: '1.8rem' }}>
                        <h2 style={nameStyle}>{data.groomName}</h2>
                        {data.groomParents && (
                            <p style={{ ...bodyStyle, fontSize: '1rem', marginTop: '0.5rem' }}>{data.groomParents}</p>
                        )}
                    </motion.div>

                    <motion.div
                        {...item(0.14)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.9rem',
                            margin: '1.9rem 0',
                        }}
                    >
                        <span
                            style={{
                                height: 1,
                                width: 'clamp(24px, 12vw, 70px)',
                                background: `linear-gradient(90deg, transparent, ${c.gold})`,
                            }}
                        />
                        <TampukManggis c={c} size={40} />
                        <span style={{ fontFamily: SERIF, fontSize: '2rem', color: c.gold, fontStyle: 'italic' }}>
                            &amp;
                        </span>
                        <TampukManggis c={c} size={40} />
                        <span
                            style={{
                                height: 1,
                                width: 'clamp(24px, 12vw, 70px)',
                                background: `linear-gradient(90deg, ${c.gold}, transparent)`,
                            }}
                        />
                    </motion.div>

                    <motion.div {...item(0.2)}>
                        <h2 style={nameStyle}>{data.brideName}</h2>
                        {data.brideParents && (
                            <p style={{ ...bodyStyle, fontSize: '1rem', marginTop: '0.5rem' }}>{data.brideParents}</p>
                        )}
                    </motion.div>
                </section>

                {/* ============ 4. DATE + COUNTDOWN ============ */}
                <section style={sectionStyle}>
                    <motion.div {...item(0)}>
                        <Eyebrow c={c} icon={<Calendar size={16} />}>
                            {tr("Menuju Hari Bahagia")}
                        </Eyebrow>
                    </motion.div>

                    {data.dateLabel && (
                        <motion.h3
                            {...item(0.06)}
                            style={{ ...headingStyle, marginTop: '0.7rem', fontSize: 'clamp(1.7rem, 7vw, 2.5rem)' }}
                        >
                            {data.dateLabel}
                        </motion.h3>
                    )}
                    {data.hijriLabel && (
                        <motion.p {...item(0.1)} style={{ color: c.gold, fontStyle: 'italic', marginTop: '0.4rem' }}>
                            {data.hijriLabel}
                        </motion.p>
                    )}
                    {data.timeLabel && (
                        <motion.p
                            {...item(0.14)}
                            style={{
                                ...bodyStyle,
                                marginTop: '0.6rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                            }}
                        >
                            <Clock size={18} style={{ color: c.gold }} />
                            {data.timeLabel}
                        </motion.p>
                    )}

                    {cd && (
                        <motion.div
                            {...item(0.2)}
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(4, 1fr)',
                                gap: '0.6rem',
                                maxWidth: 420,
                                margin: '1.8rem auto 0',
                            }}
                        >
                            {countdownCells.map((cell) => (
                                <div
                                    key={cell.label}
                                    style={{
                                        background: rgba(c.baseDeep, 0.65),
                                        border: `1px solid ${rgba(c.gold, 0.4)}`,
                                        borderRadius: 12,
                                        padding: '0.9rem 0.3rem',
                                    }}
                                >
                                    <div
                                        style={{
                                            fontFamily: SERIF,
                                            fontSize: 'clamp(1.6rem, 7vw, 2.2rem)',
                                            color: c.goldLight,
                                            lineHeight: 1,
                                        }}
                                    >
                                        {cell.pad ? String(cell.v).padStart(2, '0') : cell.v}
                                    </div>
                                    <div
                                        style={{
                                            marginTop: '0.35rem',
                                            fontSize: '0.68rem',
                                            letterSpacing: '0.16em',
                                            textTransform: 'uppercase',
                                            color: c.gold,
                                        }}
                                    >
                                        {cell.label}
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    )}
                </section>

                {/* Sections 5–11: full render only (preview shows cover + opening + couple + date). */}
                {!preview && (
                    <>
                        {/* ============ 5. ATUR CARA ============ */}
                        <PkSec name="program">{hasProgram && (
                            <section style={sectionStyle}>
                                <motion.div {...item(0)}>
                                    <Eyebrow c={c}>Rentak Majlis</Eyebrow>
                                </motion.div>
                                <GoldRule c={c} preview={preview} size={46} />
                                <div style={{ maxWidth: 460, margin: '0.8rem auto 0', textAlign: 'left' }}>
                                    {data.program!.map((p, i) => (
                                        <motion.div
                                            {...item(i * 0.06)}
                                            key={`${p.time}-${i}`}
                                            style={{
                                                display: 'flex',
                                                gap: '1rem',
                                                alignItems: 'flex-start',
                                                padding: '0.85rem 0',
                                                borderBottom:
                                                    i < data.program!.length - 1
                                                        ? `1px dashed ${rgba(c.gold, 0.25)}`
                                                        : 'none',
                                            }}
                                        >
                                            <span style={{ marginTop: 5, flexShrink: 0 }}>
                                                <MiniPucuk c={c} />
                                            </span>
                                            <div>
                                                <div
                                                    style={{
                                                        color: c.goldLight,
                                                        fontFamily: SERIF,
                                                        fontSize: '1.2rem',
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    {p.title}
                                                </div>
                                                <div style={{ color: c.gold, fontSize: '0.95rem', marginTop: '0.15rem' }}>
                                                    {p.time}
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </section>
                        )}</PkSec>

                        {/* ============ 6. LOKASI ============ */}
                        <PkSec name="location">{hasLokasi && (
                            <section style={sectionStyle}>
                                <motion.div {...item(0)}>
                                    <Eyebrow c={c} icon={<MapPin size={16} />}>
                                        {tr("Tempat Berlangsung")}
                                    </Eyebrow>
                                </motion.div>
                                {data.venueName && (
                                    <motion.h3
                                        {...item(0.06)}
                                        style={{ ...headingStyle, marginTop: '0.7rem', fontSize: 'clamp(1.6rem, 6.5vw, 2.3rem)' }}
                                    >
                                        {data.venueName}
                                    </motion.h3>
                                )}
                                {data.venueAddress && (
                                    <motion.p
                                        {...item(0.1)}
                                        style={{ ...bodyStyle, maxWidth: 460, margin: '0.6rem auto 0' }}
                                    >
                                        {data.venueAddress}
                                    </motion.p>
                                )}
                                {hasMapButtons && (
                                    <motion.div
                                        {...item(0.16)}
                                        style={{
                                            display: 'flex',
                                            gap: '0.8rem',
                                            justifyContent: 'center',
                                            flexWrap: 'wrap',
                                            marginTop: '1.5rem',
                                        }}
                                    >
                                        {data.mapsUrl && (
                                            <a
                                                className="sk-btn"
                                                href={data.mapsUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                <MapPin size={18} /> Google Maps
                                            </a>
                                        )}
                                        {data.wazeUrl && (
                                            <a
                                                className="sk-btn"
                                                href={data.wazeUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                <Navigation size={18} /> Waze
                                            </a>
                                        )}
                                    </motion.div>
                                )}
                            </section>
                        )}</PkSec>

                        {/* ============ 7. RSVP ============ */}
                        <PkSec name="rsvp">{slots?.rsvp && (
                            <section style={sectionStyle}>
                                <motion.div {...item(0)}>
                                    <Eyebrow c={c} icon={<Check size={16} />}>
                                        {tr("RSVP Kehadiran")}
                                    </Eyebrow>
                                </motion.div>
                                <GoldRule c={c} preview={preview} size={46} />
                                <motion.div {...item(0.1)} style={{ maxWidth: 520, margin: '0.6rem auto 0' }}>
                                    {slots.rsvp}
                                </motion.div>
                            </section>
                        )}</PkSec>

                        {/* ============ 8. UCAPAN ============ */}
                        <PkSec name="wishes"><section style={sectionStyle}>
                            <motion.div {...item(0)}>
                                <Eyebrow c={c} icon={<Heart size={16} />}>
                                    Ucapan &amp; Doa
                                </Eyebrow>
                            </motion.div>
                            <GoldRule c={c} preview={preview} size={46} />
                            <motion.div {...item(0.1)} style={{ maxWidth: 520, margin: '0.6rem auto 0' }}>
                                {slots?.wishes ?? (
                                    <Placeholder
                                        c={c}
                                        text="Titipkan ucapan dan doa restu buat kedua mempelai di ruangan ini."
                                    />
                                )}
                            </motion.div>
                        </section></PkSec>

                        {/* ============ 8b. SENARAI HADIAH ============ */}
                        <PkSec name="wishlist">{slots?.wishlist && (
                            <section style={sectionStyle}>
                                <motion.div {...item(0)}>
                                    <Eyebrow c={c} icon={<Gift size={16} />}>
                                        {tr("Senarai Hadiah")}
                                    </Eyebrow>
                                </motion.div>
                                <GoldRule c={c} preview={preview} size={46} />
                                <motion.div {...item(0.1)} style={{ maxWidth: 520, margin: '0.6rem auto 0' }}>
                                    {slots.wishlist}
                                </motion.div>
                            </section>
                        )}</PkSec>

                        {/* ============ 9. HUBUNGI ============ */}
                        <PkSec name="contacts">{hasContacts && (
                            <section style={sectionStyle}>
                                <motion.div {...item(0)}>
                                    <Eyebrow c={c} icon={<Phone size={16} />}>
                                        {tr("Hubungi")}
                                    </Eyebrow>
                                </motion.div>
                                <div
                                    style={{
                                        display: 'grid',
                                        gap: '0.8rem',
                                        maxWidth: 460,
                                        margin: '1.5rem auto 0',
                                    }}
                                >
                                    {data.contacts!.map((ct, i) => (
                                        <motion.a
                                            {...item(i * 0.06)}
                                            key={`${ct.phone}-${i}`}
                                            className="sk-btn"
                                            style={{ justifyContent: 'space-between', width: '100%' }}
                                            href={`tel:${ct.phone.replace(/\s+/g, '')}`}
                                        >
                                            <span style={{ textAlign: 'left' }}>
                                                <span style={{ display: 'block', fontWeight: 600 }}>{ct.name}</span>
                                                {ct.role && (
                                                    <span style={{ display: 'block', fontSize: '0.8rem', opacity: 0.8 }}>
                                                        {ct.role}
                                                    </span>
                                                )}
                                            </span>
                                            <Phone size={18} />
                                        </motion.a>
                                    ))}
                                </div>
                            </section>
                        )}</PkSec>

                        {/* ============ 10. SALAM KAUT ============ */}
                        <PkSec name="gift">{data.gift && (
                            <section style={sectionStyle}>
                                <motion.div {...item(0)}>
                                    <Eyebrow c={c} icon={<Gift size={16} />}>
                                        {tr("Salam Kasih")}
                                    </Eyebrow>
                                </motion.div>
                                <GoldRule c={c} preview={preview} size={46} />
                                <motion.div {...item(0.1)} style={{ maxWidth: 440, margin: '0.6rem auto 0' }}>
                                    <div style={panelStyle}>
                                        {data.gift.note && (
                                            <p style={{ ...bodyStyle, marginBottom: '1rem' }}>{data.gift.note}</p>
                                        )}
                                        {data.gift.bankName && (
                                            <div style={{ marginBottom: '0.6rem' }}>
                                                <div
                                                    style={{
                                                        fontSize: '0.72rem',
                                                        letterSpacing: '0.2em',
                                                        textTransform: 'uppercase',
                                                        color: c.gold,
                                                    }}
                                                >
                                                    Bank
                                                </div>
                                                <div style={{ color: c.onMaroon, fontSize: '1.1rem' }}>
                                                    {data.gift.bankName}
                                                </div>
                                            </div>
                                        )}
                                        {data.gift.accountName && (
                                            <div style={{ marginBottom: '0.6rem' }}>
                                                <div
                                                    style={{
                                                        fontSize: '0.72rem',
                                                        letterSpacing: '0.2em',
                                                        textTransform: 'uppercase',
                                                        color: c.gold,
                                                    }}
                                                >
                                                    Nama Akaun
                                                </div>
                                                <div style={{ color: c.onMaroon, fontSize: '1.1rem' }}>
                                                    {data.gift.accountName}
                                                </div>
                                            </div>
                                        )}
                                        {data.gift.accountNo && (
                                            <div
                                                style={{
                                                    marginTop: '1rem',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '0.55rem',
                                                    alignItems: 'center',
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        fontSize: '0.72rem',
                                                        letterSpacing: '0.2em',
                                                        textTransform: 'uppercase',
                                                        color: c.gold,
                                                    }}
                                                >
                                                    No. Akaun
                                                </div>
                                                <div
                                                    style={{
                                                        fontFamily: SERIF,
                                                        fontSize: '1.5rem',
                                                        letterSpacing: '0.08em',
                                                        color: c.goldLight,
                                                    }}
                                                >
                                                    {data.gift.accountNo}
                                                </div>
                                                <button
                                                    type="button"
                                                    className="sk-btn"
                                                    onClick={() => copyText(data.gift!.accountNo!)}
                                                >
                                                    {copied ? (
                                                        <>
                                                            <Check size={18} /> Telah disalin
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Copy size={18} /> Salin No. Akaun
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                        {data.gift.qrUrl && (
                                            <img
                                                src={data.gift.qrUrl}
                                                alt="DuitNow QR"
                                                style={{
                                                    width: 180,
                                                    height: 180,
                                                    objectFit: 'contain',
                                                    display: 'block',
                                                    margin: '1.1rem auto 0',
                                                    borderRadius: 12,
                                                    background: '#fff',
                                                    padding: 8,
                                                }}
                                            />
                                        )}
                                    </div>
                                </motion.div>
                            </section>
                        )}</PkSec>

                        {/* ============ 11. GALERI ============ */}
                        <PkSec name="gallery">{hasGallery && (
                            <section style={sectionStyle}>
                                <motion.div {...item(0)}>
                                    <Eyebrow c={c}>Galeri Memori</Eyebrow>
                                </motion.div>
                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                                        gap: '0.6rem',
                                        maxWidth: 600,
                                        margin: '1.5rem auto 0',
                                    }}
                                >
                                    {data.galleryImages!.map((src, i) => (
                                        <motion.div
                                            {...item(i * 0.05)}
                                            key={`${src}-${i}`}
                                            style={{
                                                aspectRatio: '1 / 1',
                                                overflow: 'hidden',
                                                borderRadius: 12,
                                                border: `1px solid ${rgba(c.gold, 0.4)}`,
                                            }}
                                        >
                                            <img
                                                src={src}
                                                alt=""
                                                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                            />
                                        </motion.div>
                                    ))}
                                </div>
                            </section>
                        )}</PkSec>
                    </>
                )}

                {/* ============ 12. FOOTER ============ */}
                <footer style={{ textAlign: 'center', padding: '3rem 1.3rem 4rem', position: 'relative' }}>
                    <div style={{ maxWidth: 320, margin: '0 auto 1.6rem' }}>
                        <PucukRebungBorder c={c} preview={preview} flip />
                    </div>
                    <motion.div {...item(0)} style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                        <TampukManggis c={c} size={54} />
                    </motion.div>
                    <div
                        className={nameCls}
                        style={{ ...nameStaticStyle, fontFamily: NAMES, fontSize: 'clamp(1.8rem, 8vw, 2.6rem)' }}
                    >
                        {groomShort} &amp; {brideShort}
                    </div>
                    <p style={{ ...bodyStyle, marginTop: '0.8rem' }}>
                        Terima kasih atas kesudian &amp; doa restu anda.
                    </p>
                    <div
                        style={{
                            marginTop: '1.6rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            fontSize: '0.78rem',
                            color: rgba(c.gold, 0.6),
                            letterSpacing: '0.08em',
                        }}
                    >
                        <span>Direka dengan</span>
                        <Heart size={13} />
                        <span>di </span><BrandLogo height={12} plate style={{ verticalAlign: 'middle', padding: '3px 7px' }} />
                    </div>
                </footer>
            </div>
        </div>
    );
}
