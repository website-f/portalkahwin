// ============================================================
//  Card ornaments — original, palette-aware SVG decoration.
//
//  Every piece here is drawn from paths rather than shipped as an image, for
//  three reasons that matter for this product:
//
//   • It recolours. A host picks a palette and the ornament follows, which a
//     stock PNG cannot do.
//   • It costs nothing. A card is opened on 4G at a wedding; a 400 KB floral
//     corner is the difference between the card opening and the guest giving up.
//   • It is ours. No licence to track, no attribution to carry, and it can be
//     offered inside the template designer without a rights question.
//
//  Everything takes a `color` and renders in `currentColor`-friendly tones, and
//  everything is decorative: `aria-hidden`, never announced.
// ============================================================

import type { CSSProperties } from 'react';

interface OrnamentProps {
    color?: string;
    /** Second tone. Falls back to `color` at lower opacity. */
    accent?: string;
    opacity?: number;
    style?: CSSProperties;
    className?: string;
}

const base = (style?: CSSProperties): CSSProperties => ({ display: 'block', ...style });

/* ------------------------------------------------------------------ *
 * Corners — anchor a cover without covering it
 * ------------------------------------------------------------------ */

/** Layered roses and eucalyptus, for a floral cover corner. */
export function FloralCorner({ color = '#9aab88', accent, opacity = 1, style, className }: OrnamentProps) {
    const a = accent ?? color;
    return (
        <svg viewBox="0 0 220 220" width="100%" height="100%" aria-hidden="true" className={className} style={base(style)} preserveAspectRatio="xMinYMin meet">
            <g opacity={opacity} fill="none" strokeLinecap="round" strokeLinejoin="round">
                {/* Stems sweeping in from the corner. */}
                <path d="M2 44 C 46 40, 78 62, 96 100 S 132 168, 178 186" stroke={color} strokeWidth="2" opacity=".75" />
                <path d="M2 78 C 40 82, 64 104, 76 140" stroke={color} strokeWidth="1.6" opacity=".55" />

                {/* Eucalyptus leaves along the main stem. */}
                {[
                    [30, 44, -28], [52, 54, -14], [74, 74, 4], [90, 100, 18],
                    [104, 128, 32], [124, 152, 46], [150, 172, 58],
                ].map(([x, y, r], i) => (
                    <ellipse key={i} cx={x} cy={y} rx="15" ry="8"
                        transform={`rotate(${r} ${x} ${y})`}
                        fill={color} opacity={0.28 + (i % 3) * 0.08} />
                ))}

                {/* Two open roses, drawn as nested arcs rather than filled blobs. */}
                {[[46, 96, 30], [104, 52, 22]].map(([cx, cy, r], i) => (
                    <g key={i} transform={`translate(${cx} ${cy})`}>
                        <circle r={r} fill={a} opacity=".16" />
                        <circle r={r * 0.72} fill={a} opacity=".2" />
                        <circle r={r * 0.46} fill={a} opacity=".26" />
                        <path d={`M ${-r * 0.5} 0 A ${r * 0.5} ${r * 0.5} 0 0 1 ${r * 0.5} 0`} stroke={a} strokeWidth="1.4" opacity=".55" fill="none" />
                        <path d={`M ${-r * 0.28} ${r * 0.12} A ${r * 0.3} ${r * 0.3} 0 0 0 ${r * 0.28} ${r * 0.12}`} stroke={a} strokeWidth="1.2" opacity=".5" fill="none" />
                    </g>
                ))}

                {/* Scattered buds for depth. */}
                {[[136, 96], [158, 130], [86, 168]].map(([cx, cy], i) => (
                    <circle key={i} cx={cx} cy={cy} r={4 - i * 0.6} fill={a} opacity=".5" />
                ))}
            </g>
        </svg>
    );
}

/* ------------------------------------------------------------------ *
 * Malay motifs
 * ------------------------------------------------------------------ */

/**
 * Pucuk rebung — the bamboo-shoot triangle that borders a songket sarong.
 * Rendered as a repeating band, so it tiles across any width.
 */
export function PucukRebung({ color = '#d4af37', accent, opacity = 1, style, className }: OrnamentProps) {
    const a = accent ?? color;
    return (
        <svg viewBox="0 0 240 60" width="100%" height="100%" aria-hidden="true" className={className} style={base(style)} preserveAspectRatio="none">
            <g opacity={opacity}>
                {Array.from({ length: 8 }, (_, i) => {
                    const x = i * 30;
                    return (
                        <g key={i} transform={`translate(${x} 0)`}>
                            <path d="M15 4 L28 52 L2 52 Z" fill={color} opacity=".22" />
                            <path d="M15 12 L24 50 L6 50 Z" fill="none" stroke={a} strokeWidth="1.1" opacity=".7" />
                            <path d="M15 22 L20 48 L10 48 Z" fill={a} opacity=".3" />
                            <circle cx="15" cy="7" r="1.8" fill={a} opacity=".8" />
                        </g>
                    );
                })}
                <rect x="0" y="55" width="240" height="1.2" fill={a} opacity=".5" />
            </g>
        </svg>
    );
}

/** Songket weave — the gold thread lattice, as a seamless tile. */
export function SongketWeave({ color = '#d4af37', opacity = 0.18, style, className }: OrnamentProps) {
    return (
        <svg viewBox="0 0 80 80" width="100%" height="100%" aria-hidden="true" className={className} style={base(style)}>
            <defs>
                <pattern id="pk-songket" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M20 4 L36 20 L20 36 L4 20 Z" fill="none" stroke={color} strokeWidth="1.1" />
                    <path d="M20 12 L28 20 L20 28 L12 20 Z" fill={color} opacity=".45" />
                    <circle cx="20" cy="20" r="1.6" fill={color} />
                    <circle cx="0" cy="0" r="1.2" fill={color} opacity=".6" />
                    <circle cx="40" cy="40" r="1.2" fill={color} opacity=".6" />
                </pattern>
            </defs>
            <rect width="80" height="80" fill="url(#pk-songket)" opacity={opacity} />
        </svg>
    );
}

/** Batik parang — the diagonal knife motif, tiled. */
export function BatikParang({ color = '#1f3f6b', opacity = 0.16, style, className }: OrnamentProps) {
    return (
        <svg viewBox="0 0 120 120" width="100%" height="100%" aria-hidden="true" className={className} style={base(style)}>
            <defs>
                <pattern id="pk-parang" width="60" height="60" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <path d="M0 30 C 10 18, 20 18, 30 30 S 50 42, 60 30" fill="none" stroke={color} strokeWidth="3.2" strokeLinecap="round" />
                    <path d="M0 12 C 10 0, 20 0, 30 12 S 50 24, 60 12" fill="none" stroke={color} strokeWidth="1.4" opacity=".6" />
                    <circle cx="15" cy="45" r="2.4" fill={color} opacity=".7" />
                    <circle cx="45" cy="45" r="1.4" fill={color} opacity=".5" />
                </pattern>
            </defs>
            <rect width="120" height="120" fill="url(#pk-parang)" opacity={opacity} />
        </svg>
    );
}

/** Awan larat — the Malay "drifting cloud" scroll, as a border strip. */
export function AwanLarat({ color = '#d4af37', opacity = 0.8, style, className }: OrnamentProps) {
    return (
        <svg viewBox="0 0 240 40" width="100%" height="100%" aria-hidden="true" className={className} style={base(style)} preserveAspectRatio="none">
            <g opacity={opacity} fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round">
                {Array.from({ length: 6 }, (_, i) => (
                    <g key={i} transform={`translate(${i * 40} 0)`}>
                        <path d="M2 30 C 8 30, 10 20, 18 20 C 26 20, 28 30, 34 30" />
                        <path d="M18 20 C 18 12, 12 10, 12 16 C 12 20, 18 20, 18 20 Z" opacity=".85" />
                        <circle cx="20" cy="32" r="1.4" fill={color} stroke="none" />
                    </g>
                ))}
            </g>
        </svg>
    );
}

/* ------------------------------------------------------------------ *
 * Atmosphere
 * ------------------------------------------------------------------ */

/** Islamic eight-point star lattice, for khat and geometric covers. */
export function GeometricLattice({ color = '#d4af37', opacity = 0.14, style, className }: OrnamentProps) {
    return (
        <svg viewBox="0 0 120 120" width="100%" height="100%" aria-hidden="true" className={className} style={base(style)}>
            <defs>
                <pattern id="pk-lattice" width="60" height="60" patternUnits="userSpaceOnUse">
                    <g fill="none" stroke={color} strokeWidth="1.1">
                        <path d="M30 2 L58 30 L30 58 L2 30 Z" />
                        <rect x="12" y="12" width="36" height="36" transform="rotate(45 30 30)" />
                        <circle cx="30" cy="30" r="8" />
                    </g>
                </pattern>
            </defs>
            <rect width="120" height="120" fill="url(#pk-lattice)" opacity={opacity} />
        </svg>
    );
}

/** A drawn divider — two rules meeting at a diamond. */
export function Divider({ color = '#d4af37', opacity = 0.9, style, className }: OrnamentProps) {
    return (
        <svg viewBox="0 0 200 20" width="100%" height="100%" aria-hidden="true" className={className} style={base(style)} preserveAspectRatio="xMidYMid meet">
            <g opacity={opacity} stroke={color} fill={color}>
                <line x1="6" y1="10" x2="80" y2="10" strokeWidth="1" opacity=".55" />
                <line x1="120" y1="10" x2="194" y2="10" strokeWidth="1" opacity=".55" />
                <path d="M100 3 L107 10 L100 17 L93 10 Z" opacity=".9" stroke="none" />
                <circle cx="86" cy="10" r="1.6" stroke="none" opacity=".7" />
                <circle cx="114" cy="10" r="1.6" stroke="none" opacity=".7" />
            </g>
        </svg>
    );
}

/** A soft glow, for placing behind a name block on a dark cover. */
export function Halo({ color = '#d4af37', opacity = 0.35, style, className }: OrnamentProps) {
    return (
        <svg viewBox="0 0 200 200" width="100%" height="100%" aria-hidden="true" className={className} style={base(style)}>
            <defs>
                <radialGradient id="pk-halo">
                    <stop offset="0%" stopColor={color} stopOpacity={opacity} />
                    <stop offset="55%" stopColor={color} stopOpacity={opacity * 0.25} />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </radialGradient>
            </defs>
            <circle cx="100" cy="100" r="100" fill="url(#pk-halo)" />
        </svg>
    );
}

/** The ornament catalogue, for the template designer's decoration picker. */
export const ORNAMENTS = {
    floralCorner: FloralCorner,
    pucukRebung: PucukRebung,
    songketWeave: SongketWeave,
    batikParang: BatikParang,
    awanLarat: AwanLarat,
    geometricLattice: GeometricLattice,
    divider: Divider,
    halo: Halo,
} as const;

export type OrnamentKey = keyof typeof ORNAMENTS;
