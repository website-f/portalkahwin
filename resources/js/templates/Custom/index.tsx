// ============================================================
// CUSTOM — the config-driven no-code wedding-card ENGINE.
// A single component that renders ANY "custom" design from a
// CustomTemplateConfig (see ../customConfig.ts). Every visual knob
// — palette, heading font, cover reveal, ambient effect, decoration,
// per-section background + scroll animation, motion intensity — is
// read from `normalizeConfig(data.templateConfig)`.
//
// Self-contained: all ornaments are original inline SVG / CSS.
// No external images, fonts, CDNs, network requests or new deps.
// GPU-smooth (transform/opacity only, willChange), mobile-responsive,
// preview-aware and reduced-motion friendly.
// ============================================================

import { useEffect, useId, useMemo, useState } from 'react';
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
    Image as ImageIcon,
    Mail,
} from 'lucide-react';

import type { TemplateProps, ProgramItem, Contact } from '../types';
import { normalizeConfig } from '../customConfig';
import type {
    CustomPalette,
    CustomSectionConfig,
    CustomBackground,
    AmbientEffect,
    DecorationStyle,
    HeadingFont,
} from '../customConfig';
import { useCardText } from '../cardText';

// ---------- typography ---------------------------------------------------
const SERIF = "'Cormorant Garamond', 'Playfair Display', Georgia, 'Times New Roman', serif";
const SANS = "'DM Sans', 'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', sans-serif";
const SCRIPT = "'Segoe Script', 'Brush Script MT', 'Comic Sans MS', cursive";
const ELEGANT = "'Playfair Display', 'Cormorant Garamond', Georgia, serif";
const MODERN = "'Poppins', 'Montserrat', 'DM Sans', system-ui, sans-serif";
const CUSTOM_HEAD = "'pkcustomhead', serif";
const BODY = "'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', sans-serif";
const ARABIC = "'Traditional Arabic', 'Scheherazade New', 'Amiri', 'Noto Naskh Arabic', serif";

/** Resolve the heading font family. When 'custom', use the uploaded face if a URL is present. */
function headingFont(h: HeadingFont, customUrl?: string): string {
    if (h === 'sans') return SANS;
    if (h === 'script') return SCRIPT;
    if (h === 'elegant') return ELEGANT;
    if (h === 'modern') return MODERN;
    if (h === 'custom') return customUrl ? CUSTOM_HEAD : SERIF;
    return SERIF;
}

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];
const EASE_FLAP: [number, number, number, number] = [0.65, 0, 0.35, 1];
const EASE_CURTAIN: [number, number, number, number] = [0.76, 0, 0.24, 1];

// ---------- colour helpers ----------------------------------------------
function clampInt(n: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, Math.round(n)));
}

function parseHex(hex: string): [number, number, number] | null {
    let h = hex.trim().replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Add alpha to a hex colour; non-hex inputs pass through unchanged. */
function withAlpha(color: string, a: number): string {
    const p = parseHex(color);
    if (!p) return color;
    return `rgba(${p[0]}, ${p[1]}, ${p[2]}, ${a})`;
}

/** Blend two colours; non-hex inputs pass the first colour through. */
function mix(color: string, target: string, t: number): string {
    const a = parseHex(color);
    const b = parseHex(target);
    if (!a || !b) return color;
    const r = Math.round(a[0] + (b[0] - a[0]) * t);
    const g = Math.round(a[1] + (b[1] - a[1]) * t);
    const bl = Math.round(a[2] + (b[2] - a[2]) * t);
    return `rgb(${r}, ${g}, ${bl})`;
}

// ---------- theme --------------------------------------------------------
interface Theme {
    primary: string;
    secondary: string;
    accent: string;
    bg: string;
    text: string;
    card: string;
    line: string;
    head: string;
}

// =========================================================================
//  Ambient particle shapes (original inline SVG — transform/opacity only)
// =========================================================================

type ShapeKind =
    | 'petal'
    | 'sakura'
    | 'heart'
    | 'star'
    | 'sparkle'
    | 'snow'
    | 'leaf'
    | 'bubble'
    | 'confetti'
    | 'firefly'
    | 'butterfly'
    | 'bokeh'
    | 'dust'
    | 'rain';

function Shape({ kind, size, color }: { kind: ShapeKind; size: number; color: string }) {
    if (kind === 'petal') {
        return (
            <svg width={size} height={size} viewBox="0 0 20 20" style={{ display: 'block' }}>
                <path d="M10 1 C 15 5 15 13 10 19 C 5 13 5 5 10 1 Z" fill={color} opacity={0.78} />
            </svg>
        );
    }
    if (kind === 'sakura') {
        return (
            <svg width={size} height={size} viewBox="0 0 20 20" style={{ display: 'block' }}>
                {[0, 72, 144, 216, 288].map((a) => (
                    <ellipse key={a} cx="10" cy="5" rx="2.6" ry="4.4" fill={color} opacity={0.82} transform={`rotate(${a} 10 10)`} />
                ))}
                <circle cx="10" cy="10" r="1.6" fill="#fff" opacity={0.55} />
            </svg>
        );
    }
    if (kind === 'heart') {
        return (
            <svg width={size} height={size} viewBox="0 0 20 20" style={{ display: 'block' }}>
                <path d="M10 17.5 C 3 12.5 3.5 6 7 6 C 8.7 6 10 7.6 10 7.6 C 10 7.6 11.3 6 13 6 C 16.5 6 17 12.5 10 17.5 Z" fill={color} opacity={0.85} />
            </svg>
        );
    }
    if (kind === 'star') {
        return (
            <svg width={size} height={size} viewBox="0 0 20 20" style={{ display: 'block' }}>
                <path d="M10 1 L12.4 7 L19 7.5 L14 12 L15.6 18.6 L10 15 L4.4 18.6 L6 12 L1 7.5 L7.6 7 Z" fill={color} opacity={0.9} />
            </svg>
        );
    }
    if (kind === 'sparkle') {
        return (
            <svg width={size} height={size} viewBox="0 0 20 20" style={{ display: 'block' }}>
                <path d="M10 0 C 11 6 14 9 20 10 C 14 11 11 14 10 20 C 9 14 6 11 0 10 C 6 9 9 6 10 0 Z" fill={color} />
            </svg>
        );
    }
    if (kind === 'snow') {
        return (
            <svg width={size} height={size} viewBox="0 0 20 20" style={{ display: 'block' }}>
                <circle cx="10" cy="10" r="5" fill={color} opacity={0.82} />
            </svg>
        );
    }
    if (kind === 'leaf') {
        return (
            <svg width={size} height={size} viewBox="0 0 20 20" style={{ display: 'block' }}>
                <path d="M10 1 C 16 6 16 15 10 19 C 4 15 4 6 10 1 Z" fill={color} opacity={0.85} />
                <path d="M10 3 L10 18" stroke="rgba(0,0,0,0.15)" strokeWidth="0.8" fill="none" />
            </svg>
        );
    }
    if (kind === 'bubble') {
        return (
            <svg width={size} height={size} viewBox="0 0 20 20" style={{ display: 'block' }}>
                <circle cx="10" cy="10" r="7" fill={color} opacity={0.12} stroke={color} strokeWidth="1" />
                <circle cx="7" cy="7" r="1.6" fill="#fff" opacity={0.5} />
            </svg>
        );
    }
    if (kind === 'firefly') {
        // small glowing dot — soft halo + bright core
        return (
            <svg width={size} height={size} viewBox="0 0 20 20" style={{ display: 'block' }}>
                <circle cx="10" cy="10" r="8" fill={color} opacity={0.16} />
                <circle cx="10" cy="10" r="4" fill={color} opacity={0.4} />
                <circle cx="10" cy="10" r="2" fill="#fff" opacity={0.9} />
            </svg>
        );
    }
    if (kind === 'butterfly') {
        // two-wing silhouette (upper + lower wings, mirrored) with a slim body
        return (
            <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block' }}>
                <g fill={color}>
                    <path d="M12 12 C 6 3 1 5 3 11 C 4 14 9 14 12 12 Z" opacity={0.85} />
                    <path d="M12 12 C 5 14 2 17 5 20 C 8 22 11 17 12 12 Z" opacity={0.68} />
                    <path d="M12 12 C 18 3 23 5 21 11 C 20 14 15 14 12 12 Z" opacity={0.85} />
                    <path d="M12 12 C 19 14 22 17 19 20 C 16 22 13 17 12 12 Z" opacity={0.68} />
                </g>
                <ellipse cx="12" cy="12" rx="0.9" ry="5" fill={color} />
            </svg>
        );
    }
    if (kind === 'bokeh') {
        // soft translucent circle with a slightly brighter rim
        return (
            <svg width={size} height={size} viewBox="0 0 20 20" style={{ display: 'block' }}>
                <circle cx="10" cy="10" r="9" fill={color} opacity={0.13} />
                <circle cx="10" cy="10" r="9" fill="none" stroke={color} strokeWidth="1.1" opacity={0.22} />
            </svg>
        );
    }
    if (kind === 'dust') {
        // tiny speck
        return (
            <svg width={size} height={size} viewBox="0 0 20 20" style={{ display: 'block' }}>
                <circle cx="10" cy="10" r="6" fill={color} opacity={0.85} />
            </svg>
        );
    }
    if (kind === 'rain') {
        // slim translucent streak with a soft bright tip
        return (
            <svg width={Math.max(2, size * 0.18)} height={size * 1.4} viewBox="0 0 4 28" style={{ display: 'block' }}>
                <rect x="1" y="0" width="2" height="28" rx="1" fill={color} opacity={0.4} />
                <circle cx="2" cy="26" r="1.6" fill={color} opacity={0.7} />
            </svg>
        );
    }
    // confetti — a thin strip
    return (
        <svg width={size * 0.45} height={size} viewBox="0 0 9 20" style={{ display: 'block' }}>
            <rect x="0" y="0" width="9" height="20" rx="2" fill={color} />
        </svg>
    );
}

// =========================================================================
//  Ambient effect — fixed particle layer over the whole card
// =========================================================================

function Ambient({
    effect,
    color,
    palette,
    count,
    calm,
    simplify = false,
}: {
    effect: AmbientEffect;
    color: string;
    palette: CustomPalette;
    count: number;
    calm: boolean;
    /** Low-spec devices: drop the innermost per-particle animation wrappers. */
    simplify?: boolean;
}) {
    const items = useMemo(
        () =>
            Array.from({ length: count }, (_, i) => ({
                i,
                left: (i * 9.73 + 4) % 100,
                top: (i * 17.31 + 6) % 92,
                size: 10 + (i % 5) * 4,
                delay: (i % 7) * (calm ? 1.2 : 0.85),
            })),
        [count, calm],
    );

    if (effect === 'none') return null;

    const confettiColors = [color, palette.primary, palette.secondary, palette.accent];

    return (
        <div
            aria-hidden="true"
            style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 45 }}
        >
            {items.map(({ i, left, top, size, delay }) => {
                // In-place twinkle effects
                if (effect === 'stars' || effect === 'sparkles') {
                    const dur = (calm ? 3.8 : 2.8) + (i % 4) * 0.6;
                    const anim = effect === 'stars' ? 'pk-twinkle' : 'pk-sparkle';
                    return (
                        <span
                            key={i}
                            style={{
                                position: 'absolute',
                                top: `${top}%`,
                                left: `${left}%`,
                                animation: `${anim} ${dur}s ease-in-out ${delay}s infinite`,
                                willChange: 'transform, opacity',
                            }}
                        >
                            <Shape kind={effect === 'stars' ? 'star' : 'sparkle'} size={size} color={color} />
                        </span>
                    );
                }

                // Fireflies — drift around a fixed point while glowing on and off
                if (effect === 'fireflies') {
                    const dur = (calm ? 9 : 6) + (i % 5) * 1.2;
                    const glow = (calm ? 2.8 : 1.9) + (i % 3) * 0.5;
                    return (
                        <span
                            key={i}
                            style={{
                                position: 'absolute',
                                top: `${top}%`,
                                left: `${left}%`,
                                animation: `pk-drift ${dur}s ease-in-out ${delay}s infinite alternate`,
                                willChange: 'transform',
                            }}
                        >
                            <span style={{ display: 'block', animation: `pk-firefly ${glow}s ease-in-out ${delay}s infinite`, willChange: 'transform, opacity' }}>
                                <Shape kind="firefly" size={size * 0.7} color={color} />
                            </span>
                        </span>
                    );
                }

                // Rain — slim streaks falling fast and straight (no sway)
                if (effect === 'rain') {
                    const dur = (calm ? 1.5 : 1.05) + (i % 5) * 0.22;
                    return (
                        <span
                            key={i}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: `${left}%`,
                                animation: `pk-rain ${dur}s linear ${delay * 0.4}s infinite`,
                                willChange: 'transform',
                            }}
                        >
                            <Shape kind="rain" size={size} color={color} />
                        </span>
                    );
                }

                // Rising bubbles
                if (effect === 'bubbles') {
                    const dur = (calm ? 12 : 9) + (i % 5) * 1.5;
                    return (
                        <span
                            key={i}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: `${left}%`,
                                animation: `pk-rise ${dur}s linear ${delay}s infinite`,
                                willChange: 'transform',
                            }}
                        >
                            <Shape kind="bubble" size={size} color={color} />
                        </span>
                    );
                }

                // Bokeh — large soft orbs that slowly rise and fade
                if (effect === 'bokeh') {
                    const dur = (calm ? 20 : 15) + (i % 5) * 2.5;
                    return (
                        <span
                            key={i}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: `${left}%`,
                                animation: `pk-rise ${dur}s linear ${delay}s infinite`,
                                willChange: 'transform',
                            }}
                        >
                            <Shape kind="bokeh" size={size * 1.6} color={color} />
                        </span>
                    );
                }

                // Butterflies — drift downward, swaying, with fluttering wings
                if (effect === 'butterflies') {
                    const dur = (calm ? 15 : 11) + (i % 5) * 1.8;
                    const sway = (calm ? 4.2 : 3.2) + (i % 4) * 0.5;
                    const flutter = (calm ? 0.95 : 0.68) + (i % 3) * 0.14;
                    return (
                        <span
                            key={i}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: `${left}%`,
                                animation: `pk-fall ${dur}s linear ${delay}s infinite`,
                                willChange: 'transform',
                            }}
                        >
                            <span style={{ display: 'block', animation: `pk-sway ${sway}s ease-in-out ${delay}s infinite alternate`, willChange: 'transform' }}>
                                {simplify ? (
                                    <Shape kind="butterfly" size={size} color={color} />
                                ) : (
                                    <span style={{ display: 'block', animation: `pk-flutter ${flutter}s ease-in-out ${delay}s infinite`, willChange: 'transform' }}>
                                        <Shape kind="butterfly" size={size} color={color} />
                                    </span>
                                )}
                            </span>
                        </span>
                    );
                }

                // Golden dust — tiny specks drifting slowly down
                if (effect === 'dust') {
                    const dur = (calm ? 16 : 12) + (i % 6) * 1.5;
                    const sway = (calm ? 5 : 3.6) + (i % 4) * 0.7;
                    const speck = <Shape kind="dust" size={4 + (i % 3) * 2} color={color} />;
                    return (
                        <span
                            key={i}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: `${left}%`,
                                animation: `pk-fall ${dur}s linear ${delay}s infinite`,
                                willChange: 'transform',
                            }}
                        >
                            {simplify ? speck : (
                                <span style={{ display: 'block', animation: `pk-sway ${sway}s ease-in-out ${delay}s infinite alternate`, willChange: 'transform' }}>
                                    {speck}
                                </span>
                            )}
                        </span>
                    );
                }

                // Falling effects: petals / sakura / hearts / snow / leaves / confetti
                const dur = (calm ? 11 : 8) + (i % 5) * 1.6;
                const sway = (calm ? 3.4 : 2.6) + (i % 4) * 0.6;
                const kind: ShapeKind =
                    effect === 'sakura'
                        ? 'sakura'
                        : effect === 'hearts'
                          ? 'heart'
                          : effect === 'snow'
                            ? 'snow'
                            : effect === 'leaves'
                              ? 'leaf'
                              : effect === 'confetti'
                                ? 'confetti'
                                : 'petal';
                const inner =
                    effect === 'leaves'
                        ? `pk-spin ${sway * 1.4}s linear ${delay}s infinite`
                        : effect === 'confetti'
                          ? `pk-tumble ${sway}s linear ${delay}s infinite`
                          : `pk-sway ${sway}s ease-in-out ${delay}s infinite alternate`;
                const col = effect === 'confetti' ? confettiColors[i % confettiColors.length] : color;

                return (
                    <span
                        key={i}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: `${left}%`,
                            animation: `pk-fall ${dur}s linear ${delay}s infinite`,
                            willChange: 'transform',
                        }}
                    >
                        {simplify ? (
                            <Shape kind={kind} size={size} color={col} />
                        ) : (
                            <span style={{ display: 'block', animation: inner, willChange: 'transform' }}>
                                <Shape kind={kind} size={size} color={col} />
                            </span>
                        )}
                    </span>
                );
            })}
        </div>
    );
}

// =========================================================================
//  Device capability — throttle the ambient layer on low-spec hardware.
//  (Fewer particles + collapsed animation wrappers → smooth on budget phones.)
// =========================================================================

interface Perf { low: boolean; scale: number; cap: number; simplify: boolean }

function usePerf(): Perf {
    const [low, setLow] = useState(false);
    useEffect(() => {
        const nav = navigator as Navigator & { deviceMemory?: number; hardwareConcurrency?: number };
        const cores = nav.hardwareConcurrency ?? 8;
        const mem = nav.deviceMemory ?? 8;
        // Budget devices commonly report ≤4 cores or ≤4 GB; flagships far exceed both.
        setLow(cores <= 4 || mem <= 4);
    }, []);
    return low
        ? { low: true, scale: 0.5, cap: 9, simplify: true }
        : { low: false, scale: 1, cap: 24, simplify: false };
}

// =========================================================================
//  Decorations (original inline SVG)
// =========================================================================

function DecoSprig({ color }: { color: string }) {
    return (
        <svg width={112} height={112} viewBox="0 0 120 120" aria-hidden="true" style={{ display: 'block' }}>
            <path d="M6 6 C 40 22 66 52 84 98" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
            {[
                { x: 24, y: 22, r: -35 },
                { x: 42, y: 42, r: -20 },
                { x: 60, y: 64, r: -5 },
                { x: 76, y: 88, r: 10 },
                { x: 18, y: 32, r: -80 },
                { x: 36, y: 54, r: -62 },
                { x: 54, y: 78, r: -48 },
            ].map((l, i) => (
                <g key={i} transform={`translate(${l.x} ${l.y}) rotate(${l.r}) scale(0.55)`}>
                    <path d="M0 0 C 7 -11 7 -27 0 -38 C -7 -27 -7 -11 0 0 Z" fill={color} opacity={i % 2 ? 0.62 : 0.85} />
                </g>
            ))}
            <g transform="translate(90 102) scale(0.9)">
                <circle r={7} fill={color} opacity={0.9} />
                <circle r={3} fill="#fff" opacity={0.35} />
            </g>
        </svg>
    );
}

function DecoLeaf({ color }: { color: string }) {
    return (
        <svg width={100} height={100} viewBox="0 0 100 100" aria-hidden="true" style={{ display: 'block' }}>
            <path d="M4 4 C 30 20 44 44 52 82" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
            {[
                { x: 16, y: 18, r: -40, s: 0.7 },
                { x: 30, y: 36, r: -25, s: 0.8 },
                { x: 42, y: 56, r: -10, s: 0.9 },
                { x: 12, y: 30, r: -75, s: 0.6 },
                { x: 26, y: 50, r: -60, s: 0.7 },
            ].map((l, i) => (
                <g key={i} transform={`translate(${l.x} ${l.y}) rotate(${l.r}) scale(${l.s})`}>
                    <path d="M0 0 C 9 -6 9 -20 0 -28 C -9 -20 -9 -6 0 0 Z" fill={color} opacity={i % 2 ? 0.6 : 0.82} />
                </g>
            ))}
        </svg>
    );
}

function DecoGeo({ color }: { color: string }) {
    return (
        <svg width={92} height={92} viewBox="0 0 92 92" aria-hidden="true" style={{ display: 'block' }}>
            <path d="M4 4 L70 4 M4 4 L4 70" stroke={color} strokeWidth={2} fill="none" />
            <path d="M4 16 L54 16 M16 4 L16 54" stroke={color} strokeWidth={1} fill="none" opacity={0.7} />
            <path d="M4 28 L40 28 M28 4 L28 40" stroke={color} strokeWidth={1} fill="none" opacity={0.5} />
            <rect x="2" y="2" width="8" height="8" transform="rotate(45 6 6)" fill={color} />
        </svg>
    );
}

function VineSvg({ color }: { color: string }) {
    return (
        <svg
            width="100%"
            height="100%"
            viewBox="0 0 80 600"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
            style={{ display: 'block' }}
        >
            <path
                d="M20 600 C 60 540 10 480 40 420 C 70 360 10 300 40 240 C 70 180 15 120 40 60 C 55 30 45 10 40 0"
                fill="none"
                stroke={color}
                strokeWidth={2.4}
                strokeLinecap="round"
            />
            {Array.from({ length: 10 }).map((_, i) => {
                const y = 30 + i * 58;
                const dir = i % 2 === 0 ? 1 : -1;
                const bx = 40 + (i % 2 === 0 ? -6 : 6);
                return (
                    <g key={i} transform={`translate(${bx} ${y}) rotate(${dir * 40}) scale(0.7)`}>
                        <path d="M0 0 C 12 -7 12 -22 0 -30 C -12 -22 -12 -7 0 0 Z" fill={color} opacity={i % 2 ? 0.6 : 0.8} />
                    </g>
                );
            })}
            {[120, 320, 500].map((y, i) => (
                <g key={`f${i}`} transform={`translate(40 ${y})`}>
                    <circle r={5} fill={color} opacity={0.9} />
                    <circle r={2} fill="#fff" opacity={0.4} />
                </g>
            ))}
        </svg>
    );
}

/** Hanging string of paper lanterns strung across the top edge. Scales uniformly (responsive). */
function DecoLanterns({ color }: { color: string }) {
    // Wire is a quadratic sag from (0,12) via (200,40) to (400,12) → x = 400·t, so t = x/400.
    const xs = [8, 22, 36, 50, 64, 78, 92];
    return (
        <svg viewBox="0 0 400 96" aria-hidden="true" style={{ display: 'block', width: '100%', height: 'auto' }}>
            <path d="M0 12 Q 200 40 400 12" fill="none" stroke={color} strokeWidth={1.4} opacity={0.7} />
            {xs.map((xp, i) => {
                const x = (xp / 100) * 400;
                const t = x / 400;
                const y = 12 * (1 - t) ** 2 + 12 * t ** 2 + 80 * t * (1 - t);
                const cy = y + 22;
                return (
                    <g key={i}>
                        <line x1={x} y1={y} x2={x} y2={y + 8} stroke={color} strokeWidth={1} opacity={0.6} />
                        <rect x={x - 4} y={y + 6} width={8} height={3} rx={1} fill={color} opacity={0.85} />
                        <ellipse cx={x} cy={cy} rx={7.5} ry={10} fill={color} opacity={i % 2 ? 0.5 : 0.78} />
                        <ellipse cx={x} cy={cy} rx={7.5} ry={10} fill="none" stroke={color} strokeWidth={0.7} opacity={0.5} />
                        <line x1={x} y1={cy + 10} x2={x} y2={cy + 15} stroke={color} strokeWidth={1} opacity={0.6} />
                    </g>
                );
            })}
        </svg>
    );
}

/** A radiating Art-Deco corner fan (drawn from the top-left origin; mirrored per corner). */
function ArtDecoFan({ color }: { color: string }) {
    return (
        <svg width={104} height={104} viewBox="0 0 104 104" aria-hidden="true" style={{ display: 'block' }}>
            {[0, 15, 30, 45, 60, 75, 90].map((a, i) => {
                const rad = (a * Math.PI) / 180;
                return (
                    <line
                        key={i}
                        x1={2}
                        y1={2}
                        x2={2 + Math.cos(rad) * 92}
                        y2={2 + Math.sin(rad) * 92}
                        stroke={color}
                        strokeWidth={i % 2 ? 0.8 : 1.5}
                        opacity={i % 2 ? 0.45 : 0.85}
                    />
                );
            })}
            {[26, 44, 62].map((r, i) => (
                <path key={`arc${i}`} d={`M ${2 + r} 2 A ${r} ${r} 0 0 1 2 ${2 + r}`} fill="none" stroke={color} strokeWidth={1} opacity={0.55 - i * 0.12} />
            ))}
            <path d="M2 2 L20 2 L2 20 Z" fill={color} opacity={0.9} />
        </svg>
    );
}

/** Ornamental repeating Moroccan-tile border, built from four one-directional tiled strips (no distortion). */
function MoroccanBorder({ color }: { color: string }) {
    const uid = useId().replace(/:/g, '');
    const band = 26;
    const strip = (id: string, edge: CSSProperties, w: number | string, h: number | string) => (
        <svg width={w} height={h} aria-hidden="true" style={{ position: 'absolute', display: 'block', ...edge }}>
            <defs>
                <pattern id={id} width={26} height={26} patternUnits="userSpaceOnUse">
                    <path d="M13 1 L25 13 L13 25 L1 13 Z" fill="none" stroke={color} strokeWidth={1} opacity={0.5} />
                    <path d="M13 6 L20 13 L13 20 L6 13 Z" fill="none" stroke={color} strokeWidth={0.7} opacity={0.38} />
                    <circle cx={13} cy={13} r={1.4} fill={color} opacity={0.55} />
                </pattern>
            </defs>
            <rect x={0} y={0} width={w} height={h} fill={`url(#${id})`} />
        </svg>
    );
    return (
        <>
            {strip(`${uid}-t`, { top: 0, left: 0 }, '100%', band)}
            {strip(`${uid}-b`, { bottom: 0, left: 0 }, '100%', band)}
            {strip(`${uid}-l`, { top: 0, left: 0 }, band, '100%')}
            {strip(`${uid}-r`, { top: 0, right: 0 }, band, '100%')}
        </>
    );
}

/** A layered bloom (peony/camellia style) built from rotated petal ellipses. */
function Bloom({ cx, cy, r, c1, c2, cc }: { cx: number; cy: number; r: number; c1: string; c2: string; cc: string }) {
    return (
        <g>
            {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
                <ellipse key={a} cx={cx} cy={cy - r * 0.5} rx={r * 0.3} ry={r * 0.52} fill={c1} opacity={0.92} transform={`rotate(${a} ${cx} ${cy})`} />
            ))}
            {[22, 82, 142, 202, 262, 322].map((a) => (
                <ellipse key={`i${a}`} cx={cx} cy={cy - r * 0.3} rx={r * 0.2} ry={r * 0.34} fill={c2} opacity={0.95} transform={`rotate(${a} ${cx} ${cy})`} />
            ))}
            <circle cx={cx} cy={cy} r={r * 0.24} fill={cc} />
            <circle cx={cx} cy={cy} r={r * 0.12} fill="#fff" opacity={0.4} />
        </g>
    );
}

/** A lush corner floral spray (blooms + greenery), anchored at the bottom-left origin. */
function FloralSpray({ color }: { color: string }) {
    const c1 = color;
    const c2 = mix(color, '#ffffff', 0.4);
    const cc = mix(color, '#000000', 0.22);
    const leaf = '#6f8050';
    const leafDeep = '#516038';
    const leafAt = (x: number, y: number, rot: number, s: number, deep = false) => (
        <path
            d="M0 0 C 9 -6 9 -22 0 -30 C -9 -22 -9 -6 0 0 Z"
            fill={deep ? leafDeep : leaf}
            opacity={deep ? 0.85 : 0.92}
            transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}
        />
    );
    return (
        <svg width="100%" height="100%" viewBox="0 0 170 170" preserveAspectRatio="xMidYMax meet" aria-hidden="true" style={{ display: 'block' }}>
            {/* greenery first (behind the blooms) */}
            {leafAt(30, 150, -8, 1.5, true)}
            {leafAt(64, 132, 26, 1.35)}
            {leafAt(100, 108, 44, 1.2, true)}
            {leafAt(128, 82, 58, 1.05)}
            {leafAt(14, 118, -46, 1.2)}
            {leafAt(52, 104, 70, 1.05, true)}
            {leafAt(146, 58, 40, 0.85)}
            {/* blooms, largest at the corner */}
            <Bloom cx={44} cy={132} r={30} c1={c1} c2={c2} cc={cc} />
            <Bloom cx={90} cy={100} r={21} c1={c1} c2={c2} cc={cc} />
            <Bloom cx={126} cy={68} r={14} c1={c2} c2={c1} cc={cc} />
        </svg>
    );
}

/** An ornate vertical cartouche (double-stroked oval + finials) framing the names. */
function OvalCartouche({ color }: { color: string }) {
    const soft = withAlpha(color, 0.6);
    const finial = (cy: number, dir: 1 | -1) => (
        <g transform={`translate(100 ${cy}) scale(1 ${dir})`}>
            <path d="M-16 0 C -6 -9 6 -9 16 0" fill="none" stroke={color} strokeWidth={1.5} />
            <circle cx="0" cy="-9" r="3.2" fill={color} />
            <path d="M-9 -3 C -3 -12 3 -12 9 -3" fill="none" stroke={soft} strokeWidth={1} />
        </g>
    );
    return (
        <svg
            viewBox="0 0 200 320"
            preserveAspectRatio="xMidYMid meet"
            aria-hidden="true"
            style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 'min(80vw, 350px)', height: 'min(86vh, 560px)' }}
        >
            {/* soft-cornered vertical oval (vesica-ish), double lined */}
            <path d="M100 12 C 168 12 186 92 186 160 C 186 228 168 308 100 308 C 32 308 14 228 14 160 C 14 92 32 12 100 12 Z" fill="none" stroke={color} strokeWidth={2.2} />
            <path d="M100 24 C 156 24 172 96 172 160 C 172 224 156 296 100 296 C 44 296 28 224 28 160 C 28 96 44 24 100 24 Z" fill="none" stroke={soft} strokeWidth={1} />
            {finial(30, 1)}
            {finial(290, -1)}
            {/* tiny florets at the four cardinal points */}
            {[[100, 22], [100, 298], [16, 160], [184, 160]].map(([x, y], i) => (
                <g key={i}>
                    <circle cx={x} cy={y} r={2.6} fill={color} />
                    <circle cx={x} cy={y} r={5} fill="none" stroke={soft} strokeWidth={0.8} />
                </g>
            ))}
        </svg>
    );
}

/** Chinese double-happiness (囍) medallion + a gold double frame — the classic 囍 motif. */
function DoubleHappiness({ color }: { color: string }) {
    const soft = withAlpha(color, 0.55);
    return (
        <>
            {/* double frame */}
            <div style={{ position: 'absolute', inset: 'clamp(12px, 4vw, 26px)', border: `2px solid ${color}`, borderRadius: 4 }} />
            <div style={{ position: 'absolute', inset: 'clamp(18px, 5vw, 34px)', border: `1px solid ${soft}`, borderRadius: 3 }} />
            {/* 囍 medallion near the top */}
            <div style={{ position: 'absolute', top: 'clamp(40px, 12vh, 96px)', left: '50%', transform: 'translateX(-50%)' }}>
                <svg width="clamp(56px, 18vw, 92px)" height="clamp(56px, 18vw, 92px)" viewBox="0 0 100 100" aria-hidden="true" style={{ display: 'block' }}>
                    <circle cx="50" cy="50" r="47" fill="none" stroke={color} strokeWidth={2} />
                    <circle cx="50" cy="50" r="41" fill="none" stroke={soft} strokeWidth={1} />
                    <text
                        x="50"
                        y="50"
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize="58"
                        fontFamily="'Noto Sans SC','Microsoft YaHei','PingFang SC','Songti SC',sans-serif"
                        fontWeight={700}
                        fill={color}
                    >
                        囍
                    </text>
                </svg>
            </div>
        </>
    );
}

function Decoration({ style, color, faded }: { style: DecorationStyle; color: string; faded: boolean }) {
    if (style === 'none') return null;

    const wrap = (children: ReactNode) => (
        <div
            aria-hidden="true"
            style={{
                position: 'absolute',
                inset: 0,
                zIndex: 1,
                pointerEvents: 'none',
                opacity: faded ? 0 : 1,
                transition: 'opacity 0.9s ease',
            }}
        >
            {children}
        </div>
    );

    if (style === 'goldFrame') {
        return wrap(
            <>
                <div style={{ position: 'absolute', inset: 'clamp(12px, 4vw, 26px)', border: `1px solid ${color}`, borderRadius: 6 }} />
                <div style={{ position: 'absolute', inset: 'clamp(18px, 5vw, 34px)', border: `1px solid ${withAlpha(color, 0.55)}`, borderRadius: 4 }} />
            </>,
        );
    }

    if (style === 'arch') {
        return wrap(
            <svg
                viewBox="0 0 200 320"
                preserveAspectRatio="xMidYMid meet"
                style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 'min(78vw, 360px)',
                    height: 'min(82vh, 560px)',
                }}
            >
                <path d="M26 312 L26 150 C26 74 100 66 100 24 C100 66 174 74 174 150 L174 312" fill="none" stroke={color} strokeWidth={2} />
                <path d="M36 312 L36 152 C36 84 100 78 100 40 C100 78 164 84 164 152 L164 312" fill="none" stroke={withAlpha(color, 0.5)} strokeWidth={1} />
                <circle cx="100" cy="24" r="3" fill={color} />
            </svg>,
        );
    }

    if (style === 'roots') {
        const vine = (side: 'left' | 'right') => {
            const edge: CSSProperties = side === 'left' ? { left: 0 } : { right: 0, transform: 'scaleX(-1)' };
            return (
                <div style={{ position: 'absolute', top: 0, bottom: 0, width: 'clamp(40px, 14vw, 90px)', ...edge }}>
                    <VineSvg color={color} />
                </div>
            );
        };
        return wrap(
            <>
                {vine('left')}
                {vine('right')}
            </>,
        );
    }

    if (style === 'lantern') {
        return wrap(
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
                <DecoLanterns color={color} />
            </div>,
        );
    }

    if (style === 'moroccan') {
        return wrap(
            <div style={{ position: 'absolute', inset: 'clamp(8px, 3vw, 18px)' }}>
                <MoroccanBorder color={color} />
            </div>,
        );
    }

    if (style === 'artdeco') {
        return wrap(
            <>
                <span style={{ position: 'absolute', top: 0, left: 0 }}>
                    <ArtDecoFan color={color} />
                </span>
                <span style={{ position: 'absolute', top: 0, right: 0, transform: 'scaleX(-1)' }}>
                    <ArtDecoFan color={color} />
                </span>
                <span style={{ position: 'absolute', bottom: 0, left: 0, transform: 'scaleY(-1)' }}>
                    <ArtDecoFan color={color} />
                </span>
                <span style={{ position: 'absolute', bottom: 0, right: 0, transform: 'scale(-1,-1)' }}>
                    <ArtDecoFan color={color} />
                </span>
            </>,
        );
    }

    if (style === 'doubleHappiness') {
        return wrap(<DoubleHappiness color={color} />);
    }

    if (style === 'ovalFrame') {
        return wrap(<OvalCartouche color={color} />);
    }

    if (style === 'floralCorners') {
        return wrap(
            <>
                <span style={{ position: 'absolute', bottom: 0, left: 0, width: 'clamp(120px, 44vw, 250px)', height: 'clamp(120px, 44vw, 250px)' }}>
                    <FloralSpray color={color} />
                </span>
                <span style={{ position: 'absolute', bottom: 0, right: 0, width: 'clamp(120px, 44vw, 250px)', height: 'clamp(120px, 44vw, 250px)', transform: 'scaleX(-1)' }}>
                    <FloralSpray color={color} />
                </span>
                <span style={{ position: 'absolute', top: 0, left: 0, width: 'clamp(70px, 26vw, 140px)', height: 'clamp(70px, 26vw, 140px)', transform: 'scaleY(-1)' }}>
                    <FloralSpray color={color} />
                </span>
                <span style={{ position: 'absolute', top: 0, right: 0, width: 'clamp(70px, 26vw, 140px)', height: 'clamp(70px, 26vw, 140px)', transform: 'scale(-1,-1)' }}>
                    <FloralSpray color={color} />
                </span>
            </>,
        );
    }

    // corner-based: cornerFloral / leaves / geometric
    const Corner = style === 'geometric' ? DecoGeo : style === 'leaves' ? DecoLeaf : DecoSprig;
    return wrap(
        <>
            <span style={{ position: 'absolute', top: 0, left: 0 }}>
                <Corner color={color} />
            </span>
            <span style={{ position: 'absolute', top: 0, right: 0, transform: 'scaleX(-1)' }}>
                <Corner color={color} />
            </span>
            <span style={{ position: 'absolute', bottom: 0, left: 0, transform: 'scaleY(-1)' }}>
                <Corner color={color} />
            </span>
            <span style={{ position: 'absolute', bottom: 0, right: 0, transform: 'scale(-1,-1)' }}>
                <Corner color={color} />
            </span>
        </>,
    );
}

// =========================================================================
//  Cover reveal overlays
// =========================================================================

function CurtainPanel({ side, open, color, dur }: { side: 'left' | 'right'; open: boolean; color: string; dur: number }) {
    const off = side === 'left' ? '-101%' : '101%';
    const edge: CSSProperties = side === 'left' ? { left: 0 } : { right: 0 };
    const trim: CSSProperties = side === 'left' ? { right: 0 } : { left: 0 };
    return (
        <motion.div
            aria-hidden="true"
            initial={{ x: 0 }}
            animate={{ x: open ? off : 0 }}
            transition={{ duration: dur, ease: EASE_CURTAIN, delay: 0.1 }}
            style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                width: '51%',
                zIndex: 30,
                background: `linear-gradient(${side === 'left' ? 90 : 270}deg, ${withAlpha(color, 0.92)}, ${color})`,
                boxShadow: 'inset 0 0 120px rgba(0,0,0,0.35)',
                pointerEvents: 'none',
                willChange: 'transform',
                ...edge,
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    width: 10,
                    background: `linear-gradient(${side === 'left' ? 270 : 90}deg, rgba(0,0,0,0.25), transparent)`,
                    ...trim,
                }}
            />
        </motion.div>
    );
}

function BlindsOverlay({ open, color, dur }: { open: boolean; color: string; dur: number }) {
    const STRIPS = 7;
    return (
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 30, perspective: 800, pointerEvents: 'none' }}>
            {Array.from({ length: STRIPS }).map((_, i) => (
                <motion.div
                    key={i}
                    initial={{ rotateX: 0 }}
                    animate={{ rotateX: open ? -92 : 0 }}
                    transition={{ duration: dur, ease: 'easeInOut', delay: open ? i * 0.07 : 0 }}
                    style={{
                        height: `${100 / STRIPS}%`,
                        transformOrigin: '50% 0%',
                        transformStyle: 'preserve-3d',
                        background: `linear-gradient(180deg, ${withAlpha(color, 0.98)}, ${withAlpha(color, 0.82)})`,
                        borderBottom: `1px solid ${withAlpha('#000000', 0.18)}`,
                        willChange: 'transform',
                    }}
                />
            ))}
        </div>
    );
}

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

function WaxSeal({
    uid,
    accent,
    soft,
    deep,
    initials,
    size,
    head,
}: {
    uid: string;
    accent: string;
    soft: string;
    deep: string;
    initials: string;
    size: number | string;
    head: string;
}) {
    const edge = useMemo(() => waxBlob(50, 50, 42, 22), []);
    return (
        <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Cap lilin">
            <defs>
                <radialGradient id={`${uid}-seal`} cx="40%" cy="34%" r="78%">
                    <stop offset="0%" stopColor={soft} />
                    <stop offset="52%" stopColor={accent} />
                    <stop offset="100%" stopColor={deep} />
                </radialGradient>
            </defs>
            <path d={edge} fill={`url(#${uid}-seal)`} stroke={deep} strokeWidth={0.8} strokeLinejoin="round" />
            <circle cx="50" cy="50" r="34" fill="none" stroke={soft} strokeWidth={1.4} opacity={0.75} />
            <circle cx="50" cy="50" r="30" fill="none" stroke={deep} strokeWidth={0.8} opacity={0.5} />
            <text x="50" y="58" textAnchor="middle" fontFamily={head} fontSize="24" fontWeight={600} fill={deep}>
                {initials}
            </text>
            <ellipse cx="40" cy="34" rx="16" ry="9" fill="#fff" opacity={0.18} />
        </svg>
    );
}

function EnvelopeCover({
    theme,
    accent,
    initials,
    opened,
    onOpen,
    onGone,
    groomShort,
    brideShort,
    reduce,
}: {
    theme: Theme;
    accent: string;
    initials: string;
    opened: boolean;
    onOpen: () => void;
    onGone: () => void;
    groomShort: string;
    brideShort: string;
    reduce: boolean;
}) {
    const tr = useCardText();
    const uid = useId().replace(/:/g, '');
    const cream = '#fbf5ea';
    const creamDeep = '#efe2cb';
    const line = withAlpha(accent, 0.4);
    const soft = mix(accent, '#ffffff', 0.5);
    const deep = mix(accent, '#000000', 0.35);

    return (
        <motion.div
            role="button"
            tabIndex={0}
            aria-label={tr("Ketik untuk membuka jemputan")}
            onClick={onOpen}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpen();
                }
            }}
            initial={false}
            animate={opened ? { opacity: 0 } : { opacity: 1 }}
            transition={{ duration: reduce ? 0.001 : 0.55, delay: opened && !reduce ? 1.35 : 0 }}
            onAnimationComplete={() => {
                if (opened) onGone();
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
                background: `radial-gradient(120% 90% at 50% 30%, ${cream}, ${creamDeep})`,
                cursor: opened ? 'default' : 'pointer',
                pointerEvents: opened ? 'none' : 'auto',
            }}
        >
            <div
                aria-hidden="true"
                style={{
                    position: 'absolute',
                    width: 'min(120vw, 640px)',
                    height: 'min(120vw, 640px)',
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${withAlpha(accent, 0.13)}, transparent 62%)`,
                    animation: reduce ? undefined : 'pk-glow 5s ease-in-out infinite',
                }}
            />

            {/* Envelope stack */}
            <motion.div
                initial={false}
                animate={opened ? { scale: reduce ? 1 : 2.35, y: reduce ? 0 : '-6%' } : { scale: 1, y: 0 }}
                transition={{ duration: reduce ? 0.001 : 1, delay: opened && !reduce ? 1.05 : 0, ease: EASE_OUT }}
                style={{ position: 'relative', width: 'min(82vw, 360px)', aspectRatio: '3 / 2', perspective: 1400, zIndex: 1 }}
            >
                {/* Back panel */}
                <svg viewBox="0 0 300 200" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0 }} aria-hidden="true">
                    <rect x="4" y="4" width="292" height="192" rx="10" fill={creamDeep} />
                    <rect x="14" y="14" width="272" height="150" rx="6" fill="rgba(74,54,38,0.10)" />
                </svg>

                {/* Invitation card sliding up */}
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
                        border: `1px solid ${line}`,
                        boxShadow: `inset 0 0 0 3px ${cream}, 0 10px 24px -12px rgba(74,54,38,0.5)`,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        padding: '6% 8%',
                        overflow: 'hidden',
                    }}
                >
                    <div style={{ fontFamily: BODY, fontSize: 'clamp(7px, 2vw, 10px)', letterSpacing: '0.3em', textTransform: 'uppercase', color: accent }}>
                        {tr("Walimatulurus")}
                    </div>
                    <div style={{ fontFamily: theme.head, fontSize: 'clamp(15px, 5vw, 26px)', fontWeight: 600, color: theme.primary, lineHeight: 1.15, marginTop: '3%' }}>
                        {groomShort}
                        <span style={{ color: accent, fontStyle: 'italic', margin: '0 6px' }}>&amp;</span>
                        {brideShort}
                    </div>
                </motion.div>

                {/* Front folds */}
                <svg viewBox="0 0 300 200" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 2 }} aria-hidden="true">
                    <defs>
                        <linearGradient id={`${uid}-fold`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={cream} />
                            <stop offset="100%" stopColor={creamDeep} />
                        </linearGradient>
                    </defs>
                    <path d="M4 8 L150 112 L4 192 Z" fill={creamDeep} stroke={line} strokeWidth="1" />
                    <path d="M296 8 L150 112 L296 192 Z" fill={creamDeep} stroke={line} strokeWidth="1" />
                    <path d="M4 192 L150 112 L296 192 Z" fill={`url(#${uid}-fold)`} stroke={accent} strokeWidth="1" />
                    <path d="M150 112 L4 192 M150 112 L296 192" stroke={accent} strokeWidth="0.8" opacity="0.5" />
                </svg>

                {/* Top flap */}
                <motion.div
                    initial={false}
                    animate={opened ? { rotateX: reduce ? 0 : -172 } : { rotateX: 0 }}
                    transition={{ duration: reduce ? 0.001 : 0.72, delay: opened && !reduce ? 0.32 : 0, ease: EASE_FLAP }}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '56%', transformOrigin: '50% 0%', transformStyle: 'preserve-3d', zIndex: 3 }}
                >
                    <svg viewBox="0 0 300 112" preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }} aria-hidden="true">
                        <defs>
                            <linearGradient id={`${uid}-flap`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#fffdf8" />
                                <stop offset="100%" stopColor={cream} />
                            </linearGradient>
                        </defs>
                        <path d="M2 2 L298 2 L150 112 Z" fill={`url(#${uid}-flap)`} stroke={accent} strokeWidth="1.2" />
                        <path d="M150 112 L2 2 M150 112 L298 2" stroke={soft} strokeWidth="0.7" opacity="0.45" />
                    </svg>
                </motion.div>

                {/* Wax seal */}
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
                        <WaxSeal uid={uid} accent={accent} soft={soft} deep={deep} initials={initials} size="100%" head={theme.head} />
                    </motion.div>
                </div>
            </motion.div>

            {/* Hint */}
            <motion.div
                initial={false}
                animate={opened ? { opacity: 0 } : { opacity: 1 }}
                transition={{ duration: reduce ? 0.001 : 0.3 }}
                style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: theme.secondary, textAlign: 'center' }}
            >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: BODY, fontSize: 13, letterSpacing: '0.24em', textTransform: 'uppercase' }}>
                    <Mail size={16} color={accent} />
                    Ketik untuk buka
                </span>
                <span aria-hidden="true" style={{ display: 'block', animation: reduce ? undefined : 'pk-pulse 1.8s ease-in-out infinite', color: accent }}>
                    <ChevronDown size={18} />
                </span>
            </motion.div>
        </motion.div>
    );
}

// =========================================================================
//  Shared primitives
// =========================================================================

function Divider({ theme }: { theme: Theme }) {
    return (
        <svg width={210} height={22} viewBox="0 0 210 22" aria-hidden="true" style={{ display: 'block', margin: '16px auto 0' }}>
            <line x1="26" y1="11" x2="90" y2="11" stroke={theme.accent} strokeWidth={1.1} />
            <line x1="120" y1="11" x2="184" y2="11" stroke={theme.accent} strokeWidth={1.1} />
            <g transform="translate(105 11)">
                <rect x="-5" y="-5" width="10" height="10" transform="rotate(45)" fill="none" stroke={theme.accent} strokeWidth={1} />
                <circle r="1.8" fill={theme.accent} />
            </g>
            <circle cx="20" cy="11" r="1.6" fill={theme.accent} />
            <circle cx="190" cy="11" r="1.6" fill={theme.accent} />
        </svg>
    );
}

function SectionHeading({ theme, eyebrow, title, icon }: { theme: Theme; eyebrow?: string; title: string; icon?: ReactNode }) {
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
            <h2 style={{ fontFamily: theme.head, fontSize: 'clamp(30px, 6vw, 46px)', fontWeight: 600, color: theme.primary, margin: 0, lineHeight: 1.1 }}>
                {title}
            </h2>
            <Divider theme={theme} />
        </div>
    );
}

/** Section shell: relative <section> with per-section background + centred column. */
function SectionShell({ bg, children }: { bg: CustomSectionConfig['bg']; children: ReactNode }) {
    const bgStyle: CSSProperties = (() => {
        switch (bg.type) {
            case 'color':
                return { background: bg.color };
            case 'gradient':
                return {
                    backgroundImage: `linear-gradient(${bg.angle ?? 135}deg, ${bg.color ?? 'transparent'}, ${bg.color2 ?? bg.color ?? 'transparent'})`,
                };
            case 'image':
                return bg.image
                    ? { backgroundImage: `url("${bg.image}")`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }
                    : {};
            default:
                return {};
        }
    })();
    return (
        <section
            style={{
                position: 'relative',
                padding: 'clamp(60px, 11vw, 120px) 20px',
                // Skip rendering/animation work for sections that are offscreen —
                // a big win on long cards and low-spec devices.
                contentVisibility: 'auto',
                containIntrinsicSize: '1px 620px',
                ...bgStyle,
            }}
        >
            <div style={{ maxWidth: 720, margin: '0 auto', position: 'relative', zIndex: 1 }}>{children}</div>
        </section>
    );
}

/** Scroll-in reveal driven by the section's configured animation. */
function SectionReveal({
    anim,
    preview,
    reduce,
    dur,
    delay = 0,
    style,
    children,
}: {
    anim: CustomSectionConfig['animation'];
    preview?: boolean;
    reduce: boolean;
    dur: number;
    delay?: number;
    style?: CSSProperties;
    children: ReactNode;
}) {
    if (preview || reduce || anim === 'none') {
        return <div style={style}>{children}</div>;
    }
    const initial: { opacity: number; y?: number; x?: number; scale?: number } =
        anim === 'slideUp'
            ? { opacity: 0, y: 40 }
            : anim === 'slideLeft'
              ? { opacity: 0, x: 40 }
              : anim === 'zoom'
                ? { opacity: 0, scale: 0.92 }
                : { opacity: 0 };
    return (
        <motion.div
            style={style}
            initial={initial}
            whileInView={{ opacity: 1, y: 0, x: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: dur, delay, ease: 'easeOut' }}
        >
            {children}
        </motion.div>
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

function CountdownBox({ theme, value, label }: { theme: Theme; value: number; label: string }) {
    return (
        <div
            style={{
                minWidth: 70,
                padding: '16px 10px',
                borderRadius: 14,
                background: theme.card,
                border: `1px solid ${theme.line}`,
                boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                textAlign: 'center',
            }}
        >
            <div style={{ fontFamily: theme.head, fontSize: 'clamp(28px, 7vw, 40px)', fontWeight: 600, color: theme.primary, lineHeight: 1 }}>
                {String(value).padStart(2, '0')}
            </div>
            <div style={{ fontFamily: BODY, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: theme.secondary, marginTop: 8 }}>
                {label}
            </div>
        </div>
    );
}

/** Full-bleed image backdrop for the cover, with a legibility scrim + optional blur. */
function CoverBackdrop({ image, overlay, overlayColor, blur }: { image: string; overlay: number; overlayColor: string; blur: number }) {
    const pad = blur > 0 ? -Math.ceil(blur * 2.5) : 0;
    return (
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden' }}>
            <div
                style={{
                    position: 'absolute',
                    inset: pad,
                    backgroundImage: `url("${image}")`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    filter: blur > 0 ? `blur(${blur}px)` : undefined,
                }}
            />
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: `linear-gradient(180deg, ${withAlpha(overlayColor, Math.max(0, overlay - 0.14))} 0%, ${withAlpha(overlayColor, overlay)} 58%, ${withAlpha(overlayColor, Math.min(0.96, overlay + 0.16))} 100%)`,
                }}
            />
        </div>
    );
}

// =========================================================================
//  Main engine component
// =========================================================================

export default function CustomTemplate({ data, preview, slots }: TemplateProps) {
    const tr = useCardText();
    const cfg = normalizeConfig(data.templateConfig);
    const reduce = useReducedMotion() ?? false;
    const perf = usePerf();

    // ----- palette / theme (cfg.palette overrides data.palette) -----
    const palette = cfg.palette;
    const theme: Theme = {
        primary: palette.primary,
        secondary: palette.secondary,
        accent: palette.accent,
        bg: palette.bg,
        text: palette.text,
        card: 'rgba(255,255,255,0.72)',
        line: withAlpha(palette.accent, 0.35),
        head: headingFont(cfg.heading, cfg.headingFontUrl),
    };

    // Inject the uploaded custom heading face (only when a custom font URL is present).
    const customFontFace =
        cfg.heading === 'custom' && cfg.headingFontUrl
            ? `@font-face { font-family: 'pkcustomhead'; src: url("${cfg.headingFontUrl}"); font-display: swap; }`
            : '';

    const calm = cfg.motion === 'calm';
    // Duration scaler: calm = a touch slower / gentler, lively = a touch snappier.
    const D = (base: number) => base * (calm ? 1.15 : 0.82);

    const reveal = cfg.cover.reveal;
    const coverAccent = cfg.cover.accentColor || palette.primary;
    const effectColor = cfg.effect.color || palette.accent;
    // Density is throttled on low-spec devices so the ambient layer stays smooth.
    const effectCount = clampInt(cfg.effect.density * perf.scale, 3, perf.cap);
    const decoColor = cfg.decoration.color || palette.accent;

    // ----- whole-card background (gradient/tint paints edge-to-edge; an image
    //       becomes a full-bleed cover backdrop with a legibility scrim) -----
    const bg: CustomBackground = cfg.background ?? { type: 'none' };
    const bgImage = bg.type === 'image' && bg.image ? bg.image : null;
    const rootBg: string | undefined =
        bg.type === 'gradient'
            ? `linear-gradient(${bg.angle ?? 135}deg, ${bg.color ?? palette.bg}, ${bg.color2 ?? bg.color ?? palette.bg})`
            : bg.type === 'color'
              ? (bg.color ?? palette.bg)
              : undefined;
    const bgOverlay = Math.max(0, Math.min(0.92, bg.overlay ?? 0.34));
    const bgOverlayColor = bg.overlayColor || palette.bg;
    const bgBlur = clampInt(bg.blur ?? 0, 0, 10);
    // Text over a photo needs a soft shadow to stay crisp on any image.
    const coverTextShadow = bgImage ? '0 1px 14px rgba(0,0,0,0.30), 0 0 2px rgba(0,0,0,0.18)' : undefined;

    const groomShort = data.groomShort ?? data.groomName;
    const brideShort = data.brideShort ?? data.brideName;
    const gInit = (groomShort || 'G').trim().charAt(0).toUpperCase();
    const bInit = (brideShort || 'B').trim().charAt(0).toUpperCase();
    const initials = `${gInit}&${bInit}`;

    // In preview / reduced-motion we render the SETTLED cover (skip the intro).
    const staticCover = !!preview || reduce;

    const [revealed, setRevealed] = useState<boolean>(staticCover);
    const [envGone, setEnvGone] = useState<boolean>(reveal !== 'envelope' || staticCover);

    // Auto-play the cover reveal shortly after mount (skipped when settled).
    useEffect(() => {
        if (staticCover) return;
        const wait = reveal === 'envelope' ? 1500 : 80;
        const id = window.setTimeout(() => setRevealed(true), wait);
        return () => window.clearTimeout(id);
    }, [staticCover, reveal]);

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

    const locked = reveal === 'envelope' && !envGone;

    const rootStyle: CSSProperties = {
        fontFamily: BODY,
        fontSize: 18,
        lineHeight: 1.7,
        color: theme.text,
        background: rootBg ?? theme.bg,
        // A configured gradient/tint owns the whole surface; otherwise keep the
        // gentle top sheen over the flat palette background.
        backgroundImage: rootBg ? undefined : 'radial-gradient(120% 60% at 50% 0%, rgba(255,255,255,0.5), rgba(255,255,255,0) 55%)',
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

    // Cover content entrance (varies by reveal type; settled instantly when static).
    const coverInitial: false | { opacity: number; scale?: number } = staticCover
        ? false
        : reveal === 'zoom'
          ? { opacity: 0, scale: 0.6 }
          : reveal === 'plain'
            ? { opacity: 0, scale: 0.96 }
            : { opacity: 0 };
    const coverAnimate: undefined | { opacity: number; scale?: number } = staticCover
        ? undefined
        : revealed
          ? { opacity: 1, scale: 1 }
          : reveal === 'zoom'
            ? { opacity: 0, scale: 0.6 }
            : reveal === 'plain'
              ? { opacity: 0, scale: 0.96 }
              : { opacity: 0 };
    const coverDelay = reveal === 'curtain' || reveal === 'blinds' ? 0.9 : reveal === 'envelope' ? 1.3 : 0.1;

    const bismillah = data.bismillah ? (
        <div style={{ direction: 'rtl', fontFamily: ARABIC, fontSize: 'clamp(22px, 5.5vw, 34px)', color: theme.primary, lineHeight: 1.9, marginBottom: 22 }}>
            بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ
        </div>
    ) : null;

    const sec = (key: string): CustomSectionConfig => cfg.sections[key];

    return (
        <div style={rootStyle}>
            <style>{`
                ${customFontFace}
                @keyframes pk-fall {
                    0%   { transform: translateY(-12vh); opacity: 0; }
                    10%  { opacity: 0.85; }
                    90%  { opacity: 0.85; }
                    100% { transform: translateY(112vh); opacity: 0; }
                }
                @keyframes pk-rise {
                    0%   { transform: translateY(110vh) scale(0.7); opacity: 0; }
                    12%  { opacity: 0.7; }
                    88%  { opacity: 0.7; }
                    100% { transform: translateY(-12vh) scale(1); opacity: 0; }
                }
                @keyframes pk-rain {
                    0%   { transform: translateY(-14vh); opacity: 0; }
                    10%  { opacity: 0.9; }
                    100% { transform: translateY(116vh); opacity: 0.4; }
                }
                @keyframes pk-sway {
                    0%   { transform: translateX(-11px) rotate(-22deg); }
                    100% { transform: translateX(11px) rotate(22deg); }
                }
                @keyframes pk-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                @keyframes pk-tumble {
                    0%   { transform: rotateZ(0deg) scaleX(1); }
                    50%  { transform: rotateZ(180deg) scaleX(0.4); }
                    100% { transform: rotateZ(360deg) scaleX(1); }
                }
                @keyframes pk-twinkle {
                    0%,100% { transform: scale(0.55); opacity: 0.15; }
                    50%     { transform: scale(1); opacity: 0.9; }
                }
                @keyframes pk-sparkle {
                    0%,100% { transform: translateY(3px) scale(0.5) rotate(0deg); opacity: 0; }
                    50%     { transform: translateY(-3px) scale(1) rotate(90deg); opacity: 0.9; }
                }
                @keyframes pk-pulse {
                    0%,100% { transform: translateY(0); opacity: 0.85; }
                    50%     { transform: translateY(4px); opacity: 1; }
                }
                @keyframes pk-glow {
                    0%,100% { opacity: 0.35; }
                    50%     { opacity: 0.6; }
                }
                @keyframes pk-drift {
                    0%   { transform: translate(-10px, 6px); }
                    50%  { transform: translate(9px, -9px); }
                    100% { transform: translate(-6px, 11px); }
                }
                @keyframes pk-firefly {
                    0%,100% { transform: scale(0.65); opacity: 0.12; }
                    50%     { transform: scale(1.1); opacity: 1; }
                }
                @keyframes pk-flutter {
                    0%,100% { transform: scaleX(1); }
                    50%     { transform: scaleX(0.42); }
                }
                @media (prefers-reduced-motion: reduce) {
                    * { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; }
                }
            `}</style>

            {/* Ambient particle layer (over the whole card; off in preview / reduced-motion) */}
            {!staticCover && cfg.effect.type !== 'none' && (
                <Ambient effect={cfg.effect.type} color={effectColor} palette={palette} count={effectCount} calm={calm} simplify={perf.simplify} />
            )}

            {/* Envelope reveal overlay */}
            {reveal === 'envelope' && !envGone && (
                <EnvelopeCover
                    theme={theme}
                    accent={coverAccent}
                    initials={initials}
                    opened={revealed}
                    onOpen={() => setRevealed(true)}
                    onGone={() => setEnvGone(true)}
                    groomShort={groomShort}
                    brideShort={brideShort}
                    reduce={reduce}
                />
            )}

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
                }}
            >
                {bgImage && <CoverBackdrop image={bgImage} overlay={bgOverlay} overlayColor={bgOverlayColor} blur={bgBlur} />}
                <Decoration style={cfg.decoration.style} color={decoColor} faded={!staticCover && !revealed} />

                <motion.div
                    initial={coverInitial}
                    animate={coverAnimate}
                    transition={{ duration: D(1), delay: staticCover ? 0 : coverDelay, ease: EASE_OUT }}
                    style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 560, textShadow: coverTextShadow }}
                >
                    {bismillah}

                    <div style={{ fontFamily: BODY, fontSize: 12, letterSpacing: '0.3em', textTransform: 'uppercase', color: theme.secondary, marginBottom: 8 }}>
                        {tr("Raikan Cinta")}
                    </div>
                    <div style={{ fontFamily: theme.head, fontSize: 'clamp(34px, 9vw, 56px)', fontWeight: 600, color: theme.primary, lineHeight: 1.1 }}>
                        {groomShort}
                    </div>
                    <div style={{ fontFamily: theme.head, fontStyle: 'italic', fontSize: 'clamp(22px, 6vw, 34px)', color: theme.accent, margin: '2px 0' }}>
                        &amp;
                    </div>
                    <div style={{ fontFamily: theme.head, fontSize: 'clamp(34px, 9vw, 56px)', fontWeight: 600, color: theme.primary, lineHeight: 1.1 }}>
                        {brideShort}
                    </div>

                    <Divider theme={theme} />

                    <div style={{ marginTop: 20, fontFamily: BODY, fontSize: 13, letterSpacing: '0.34em', textTransform: 'uppercase', color: theme.secondary }}>
                        {tr("Walimatulurus")}
                    </div>
                    {data.dateLabel && (
                        <div style={{ fontFamily: theme.head, fontSize: 'clamp(18px, 4.5vw, 24px)', color: theme.primary, marginTop: 8 }}>
                            {data.dateLabel}
                        </div>
                    )}
                </motion.div>

                {/* scroll cue */}
                <motion.div
                    initial={staticCover ? false : { opacity: 0 }}
                    animate={staticCover ? undefined : { opacity: revealed ? 1 : 0 }}
                    transition={{ duration: 0.8, delay: staticCover ? 0 : coverDelay + 0.6 }}
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
                    <span style={{ fontFamily: BODY, fontSize: 11, letterSpacing: '0.24em', textTransform: 'uppercase' }}>{tr("Skrol")}</span>
                    <motion.div
                        animate={staticCover ? undefined : { y: [0, 9, 0] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                        style={{ willChange: 'transform' }}
                    >
                        <ChevronDown size={22} />
                    </motion.div>
                </motion.div>

                {/* Curtain / blinds reveal overlays */}
                {!staticCover && reveal === 'curtain' && (
                    <>
                        <CurtainPanel side="left" open={revealed} color={coverAccent} dur={D(1.5)} />
                        <CurtainPanel side="right" open={revealed} color={coverAccent} dur={D(1.5)} />
                    </>
                )}
                {!staticCover && reveal === 'blinds' && <BlindsOverlay open={revealed} color={coverAccent} dur={D(0.7)} />}
            </section>

            {/* ---------------------------------------------------------- */}
            {/* 2. OPENING (opening line)                                   */}
            {/* ---------------------------------------------------------- */}
            {sec('opening').enabled && data.openingLine && (
                <SectionShell bg={sec('opening').bg}>
                    <SectionReveal anim={sec('opening').animation} preview={preview} reduce={reduce} dur={D(0.8)}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                                <Heart size={22} color={theme.accent} />
                            </div>
                            <p style={{ fontFamily: theme.head, fontSize: 'clamp(21px, 4.4vw, 30px)', fontWeight: 500, lineHeight: 1.6, color: theme.primary, margin: '0 auto', maxWidth: 620 }}>
                                {data.openingLine}
                            </p>
                            <Divider theme={theme} />
                        </div>
                    </SectionReveal>
                </SectionShell>
            )}

            {/* ---------------------------------------------------------- */}
            {/* 3. COUPLE (names)                                           */}
            {/* ---------------------------------------------------------- */}
            {sec('couple').enabled && (
                <SectionShell bg={sec('couple').bg}>
                    <SectionReveal anim={sec('couple').animation} preview={preview} reduce={reduce} dur={D(0.8)}>
                        <SectionHeading theme={theme} eyebrow={tr("Pasangan Bahagia")} title={tr("Pengantin")} />
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26 }}>
                            <div style={{ textAlign: 'center', width: '100%' }}>
                                <h3 style={{ fontFamily: theme.head, fontSize: 'clamp(30px, 7vw, 48px)', fontWeight: 600, color: theme.primary, margin: 0, lineHeight: 1.15 }}>
                                    {data.groomName}
                                </h3>
                                {data.groomParents && <p style={{ margin: '8px 0 0', color: theme.secondary, fontSize: 16 }}>{data.groomParents}</p>}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
                                <svg width={56} height={16} viewBox="0 0 56 16" aria-hidden="true">
                                    <line x1="0" y1="8" x2="48" y2="8" stroke={theme.accent} strokeWidth={1} />
                                    <circle cx="52" cy="8" r="2" fill={theme.accent} />
                                </svg>
                                <span style={{ fontFamily: theme.head, fontStyle: 'italic', fontSize: 'clamp(40px, 9vw, 60px)', color: theme.accent, lineHeight: 1 }}>
                                    &amp;
                                </span>
                                <svg width={56} height={16} viewBox="0 0 56 16" aria-hidden="true">
                                    <circle cx="4" cy="8" r="2" fill={theme.accent} />
                                    <line x1="8" y1="8" x2="56" y2="8" stroke={theme.accent} strokeWidth={1} />
                                </svg>
                            </div>

                            <div style={{ textAlign: 'center', width: '100%' }}>
                                <h3 style={{ fontFamily: theme.head, fontSize: 'clamp(30px, 7vw, 48px)', fontWeight: 600, color: theme.primary, margin: 0, lineHeight: 1.15 }}>
                                    {data.brideName}
                                </h3>
                                {data.brideParents && <p style={{ margin: '8px 0 0', color: theme.secondary, fontSize: 16 }}>{data.brideParents}</p>}
                            </div>
                        </div>
                    </SectionReveal>
                </SectionShell>
            )}

            {/* ---------------------------------------------------------- */}
            {/* 4. DATE + COUNTDOWN                                         */}
            {/* ---------------------------------------------------------- */}
            {sec('date').enabled && (
                <SectionShell bg={sec('date').bg}>
                    <SectionReveal anim={sec('date').animation} preview={preview} reduce={reduce} dur={D(0.8)}>
                        <SectionHeading theme={theme} eyebrow={tr("Menuju Hari Bahagia")} title={tr("Kira Detik Bahagia")} icon={<Calendar size={15} />} />
                        <div style={{ textAlign: 'center' }}>
                            {data.dateLabel && (
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontFamily: theme.head, fontSize: 'clamp(22px, 5vw, 30px)', color: theme.primary }}>
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
                            {data.hijriLabel && <div style={{ marginTop: 6, color: theme.secondary, fontStyle: 'italic' }}>{data.hijriLabel}</div>}
                        </div>
                        {countdown && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 34 }}>
                                <CountdownBox theme={theme} value={countdown.days} label={tr("Hari")} />
                                <CountdownBox theme={theme} value={countdown.hours} label={tr("Jam")} />
                                <CountdownBox theme={theme} value={countdown.minutes} label={tr("Minit")} />
                                <CountdownBox theme={theme} value={countdown.seconds} label={tr("Saat")} />
                            </div>
                        )}
                    </SectionReveal>
                </SectionShell>
            )}

            {/* ---------------------------------------------------------- */}
            {/* 5. PROGRAM (atur cara)                                      */}
            {/* ---------------------------------------------------------- */}
            <PkSec name="program">{sec('program').enabled && data.program && data.program.length > 0 && (
                <SectionShell bg={sec('program').bg}>
                    <SectionReveal anim={sec('program').animation} preview={preview} reduce={reduce} dur={D(0.8)}>
                        <SectionHeading theme={theme} eyebrow={tr("Rentak Majlis")} title={tr("Atur Cara")} />
                        <div style={{ position: 'relative', maxWidth: 480, margin: '0 auto' }}>
                            <div aria-hidden="true" style={{ position: 'absolute', left: 11, top: 6, bottom: 6, width: 2, background: theme.line }} />
                            {data.program.map((item: ProgramItem, i: number) => (
                                <div key={`${item.time}-${i}`} style={{ position: 'relative', paddingLeft: 40, marginBottom: 26 }}>
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
                                    <div style={{ fontFamily: theme.head, fontSize: 'clamp(20px, 4.5vw, 26px)', color: theme.primary, marginTop: 2 }}>
                                        {item.title}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </SectionReveal>
                </SectionShell>
            )}</PkSec>

            {/* ---------------------------------------------------------- */}
            {/* 6. LOCATION (lokasi)                                        */}
            {/* ---------------------------------------------------------- */}
            <PkSec name="location">{sec('location').enabled && (data.venueName || data.venueAddress || data.mapsUrl || data.wazeUrl) && (
                <SectionShell bg={sec('location').bg}>
                    <SectionReveal anim={sec('location').animation} preview={preview} reduce={reduce} dur={D(0.8)}>
                        <SectionHeading theme={theme} eyebrow={tr("Tempat Berlangsung")} title={tr("Lokasi Majlis")} icon={<MapPin size={15} />} />
                        <div style={{ textAlign: 'center' }}>
                            {data.venueName && (
                                <h3 style={{ fontFamily: theme.head, fontSize: 'clamp(24px, 5.5vw, 34px)', color: theme.primary, margin: 0 }}>{data.venueName}</h3>
                            )}
                            {data.venueAddress && <p style={{ color: theme.secondary, fontSize: 17, maxWidth: 440, margin: '12px auto 0' }}>{data.venueAddress}</p>}
                            {(data.mapsUrl || data.wazeUrl) && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 26 }}>
                                    {data.mapsUrl && (
                                        <a href={data.mapsUrl} target="_blank" rel="noopener noreferrer" style={{ ...buttonBase, background: theme.accent, color: '#fff', borderColor: theme.accent }}>
                                            <MapPin size={17} />
                                            Buka Google Maps
                                        </a>
                                    )}
                                    {data.wazeUrl && (
                                        <a href={data.wazeUrl} target="_blank" rel="noopener noreferrer" style={{ ...buttonBase, background: 'transparent', color: theme.primary }}>
                                            <Navigation size={17} />
                                            Waze
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>
                    </SectionReveal>
                </SectionShell>
            )}</PkSec>

            {/* ---------------------------------------------------------- */}
            {/* 7. WISHES (ucapan — slots.wishes)                           */}
            {/* ---------------------------------------------------------- */}
            <PkSec name="wishes">{sec('wishes').enabled && (
                <SectionShell bg={sec('wishes').bg}>
                    <SectionReveal anim={sec('wishes').animation} preview={preview} reduce={reduce} dur={D(0.8)}>
                        <SectionHeading theme={theme} eyebrow={tr("Doa & Restu")} title={tr("Ucapan Kasih")} />
                        {slots?.wishes ?? (
                            <div style={{ background: theme.card, border: `1px solid ${theme.line}`, borderRadius: 18, padding: '34px 24px', textAlign: 'center', boxShadow: '0 12px 30px rgba(0,0,0,0.07)' }}>
                                <p style={{ margin: 0, color: theme.secondary, fontSize: 17 }}>Ruangan ucapan akan dipaparkan di sini.</p>
                                <p style={{ margin: '6px 0 0', color: theme.secondary, fontSize: 14, fontStyle: 'italic' }}>Tinggalkan kata-kata aluan buat pengantin.</p>
                            </div>
                        )}
                    </SectionReveal>
                </SectionShell>
            )}</PkSec>

            {/* ---------------------------------------------------------- */}
            {/* 8. WISHLIST (senarai hadiah — slots.wishlist)               */}
            {/* ---------------------------------------------------------- */}
            <PkSec name="wishlist">{sec('wishlist').enabled && slots?.wishlist && (
                <SectionShell bg={sec('wishlist').bg}>
                    <SectionReveal anim={sec('wishlist').animation} preview={preview} reduce={reduce} dur={D(0.8)}>
                        <SectionHeading theme={theme} eyebrow={tr("Tanda Ingatan")} title={tr("Senarai Hadiah")} icon={<Gift size={15} />} />
                        {slots.wishlist}
                    </SectionReveal>
                </SectionShell>
            )}</PkSec>

            {/* ---------------------------------------------------------- */}
            {/* 9. CONTACTS (hubungi)                                       */}
            {/* ---------------------------------------------------------- */}
            <PkSec name="contacts">{sec('contacts').enabled && data.contacts && data.contacts.length > 0 && (
                <SectionShell bg={sec('contacts').bg}>
                    <SectionReveal anim={sec('contacts').animation} preview={preview} reduce={reduce} dur={D(0.8)}>
                        <SectionHeading theme={theme} eyebrow={tr("Sebarang Pertanyaan")} title={tr("Hubungi")} icon={<Phone size={15} />} />
                        <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                            {data.contacts.map((c: Contact, i: number) => (
                                <a
                                    key={`${c.phone}-${i}`}
                                    href={`tel:${c.phone.replace(/\s+/g, '')}`}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 14,
                                        padding: '16px 18px',
                                        borderRadius: 14,
                                        background: theme.card,
                                        border: `1px solid ${theme.line}`,
                                        textDecoration: 'none',
                                        color: theme.text,
                                        boxShadow: '0 8px 20px rgba(0,0,0,0.06)',
                                    }}
                                >
                                    <span style={{ flex: '0 0 auto', width: 44, height: 44, borderRadius: '50%', background: theme.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Phone size={19} />
                                    </span>
                                    <span style={{ minWidth: 0 }}>
                                        <span style={{ display: 'block', fontFamily: theme.head, fontSize: 20, color: theme.primary, lineHeight: 1.2 }}>{c.name}</span>
                                        {c.role && <span style={{ display: 'block', fontSize: 13, color: theme.secondary }}>{c.role}</span>}
                                    </span>
                                </a>
                            ))}
                        </div>
                    </SectionReveal>
                </SectionShell>
            )}</PkSec>

            {/* ---------------------------------------------------------- */}
            {/* 10. GIFT (salam kasih)                                      */}
            {/* ---------------------------------------------------------- */}
            <PkSec name="gift">{sec('gift').enabled && data.gift && (data.gift.bankName || data.gift.accountNo || data.gift.accountName || data.gift.qrUrl) && (
                <SectionShell bg={sec('gift').bg}>
                    <SectionReveal anim={sec('gift').animation} preview={preview} reduce={reduce} dur={D(0.8)}>
                        <SectionHeading theme={theme} eyebrow={tr("Tanda Kasih")} title={tr("Salam Kasih")} icon={<Gift size={15} />} />
                        <div style={{ maxWidth: 420, margin: '0 auto', background: theme.card, border: `1px solid ${theme.line}`, borderRadius: 20, padding: '30px 26px', textAlign: 'center', boxShadow: '0 14px 34px rgba(0,0,0,0.09)' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                                <span style={{ width: 54, height: 54, borderRadius: '50%', background: withAlpha(theme.accent, 0.14), display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.accent }}>
                                    <Gift size={26} />
                                </span>
                            </div>
                            {data.gift.bankName && <div style={{ fontFamily: theme.head, fontSize: 26, color: theme.primary }}>{data.gift.bankName}</div>}
                            {data.gift.accountName && <div style={{ color: theme.secondary, marginTop: 2 }}>{data.gift.accountName}</div>}
                            {data.gift.accountNo && (
                                <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
                                    <span style={{ fontFamily: theme.head, fontSize: 24, letterSpacing: '0.06em', color: theme.primary, fontWeight: 600 }}>{data.gift.accountNo}</span>
                                    <button
                                        type="button"
                                        onClick={handleCopy}
                                        style={{ ...buttonBase, padding: '9px 16px', fontSize: 14, background: copied ? mix(theme.accent, '#000000', 0.25) : theme.accent, color: '#fff', borderColor: copied ? mix(theme.accent, '#000000', 0.25) : theme.accent }}
                                    >
                                        {copied ? <Check size={16} /> : <Copy size={16} />}
                                        {copied ? 'Telah disalin' : 'Salin nombor'}
                                    </button>
                                </div>
                            )}
                            {data.gift.qrUrl && (
                                <img
                                    src={data.gift.qrUrl}
                                    alt="DuitNow QR"
                                    loading="lazy"
                                    style={{ width: 168, height: 168, objectFit: 'contain', borderRadius: 12, background: '#fff', padding: 8, margin: '18px auto 0', display: 'block' }}
                                />
                            )}
                            {data.gift.note && <p style={{ marginTop: 18, color: theme.secondary, fontStyle: 'italic', fontSize: 15 }}>{data.gift.note}</p>}
                        </div>
                    </SectionReveal>
                </SectionShell>
            )}</PkSec>

            {/* ---------------------------------------------------------- */}
            {/* 11. GALLERY (galeri)                                        */}
            {/* ---------------------------------------------------------- */}
            <PkSec name="gallery">{sec('gallery').enabled && (
                <SectionShell bg={sec('gallery').bg}>
                    <SectionReveal anim={sec('gallery').animation} preview={preview} reduce={reduce} dur={D(0.8)}>
                        <SectionHeading theme={theme} eyebrow={tr("Kenangan")} title={tr("Galeri Memori")} icon={<ImageIcon size={15} />} />
                        <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                            {data.galleryImages && data.galleryImages.length > 0
                                ? data.galleryImages.map((src, i) => (
                                      <div key={`${src}-${i}`} style={{ borderRadius: 14, overflow: 'hidden', border: `1px solid ${theme.line}`, boxShadow: '0 10px 24px rgba(0,0,0,0.08)', aspectRatio: '3 / 4', background: theme.card }}>
                                          <img src={src} alt={`Galeri ${i + 1}`} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                      </div>
                                  ))
                                : Array.from({ length: 3 }).map((_, i) => (
                                      <div
                                          key={`ph-${i}`}
                                          style={{
                                              borderRadius: 14,
                                              border: `1px solid ${theme.line}`,
                                              aspectRatio: '3 / 4',
                                              background: withAlpha(theme.accent, 0.06),
                                              display: 'flex',
                                              flexDirection: 'column',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              gap: 10,
                                              color: theme.accent,
                                          }}
                                      >
                                          <ImageIcon size={26} />
                                          <span style={{ fontFamily: BODY, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', color: theme.secondary }}>Gambar</span>
                                      </div>
                                  ))}
                        </div>
                    </SectionReveal>
                </SectionShell>
            )}</PkSec>

            {/* ---------------------------------------------------------- */}
            {/* 12. FOOTER                                                  */}
            {/* ---------------------------------------------------------- */}
            <footer style={{ position: 'relative', textAlign: 'center', padding: 'clamp(60px, 11vw, 110px) 20px 48px', overflow: 'hidden' }}>
                <div>
                    <div style={{ fontFamily: theme.head, fontSize: 'clamp(28px, 7vw, 42px)', fontWeight: 600, color: theme.primary, lineHeight: 1.2 }}>
                        {groomShort}
                        <span style={{ color: theme.accent, fontStyle: 'italic', margin: '0 12px' }}>&amp;</span>
                        {brideShort}
                    </div>
                    <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: theme.head, fontSize: 'clamp(20px, 5vw, 28px)', color: theme.secondary }}>
                        {tr("Terima Kasih")}
                        <Heart size={20} color={theme.accent} fill={withAlpha(theme.accent, 0.4)} />
                    </div>
                    <Divider theme={theme} />
                    <div style={{ marginTop: 22, fontFamily: BODY, fontSize: 12, letterSpacing: '0.24em', textTransform: 'uppercase', color: theme.secondary, opacity: 0.75 }}>
                        Dibina dengan{' '}
                        <Heart size={12} color={theme.accent} style={{ display: 'inline', verticalAlign: 'middle', margin: '0 2px' }} />{' '}
                        <BrandLogo height={12} plate style={{ verticalAlign: 'middle', padding: '3px 7px' }} />
                    </div>
                </div>
            </footer>
        </div>
    );
}
