import { useMemo, type CSSProperties, type ReactNode } from 'react';
import { ORNAMENTS } from '../templates/ornaments';
import { artFor, textureCss, textureSize, hexA, type TemplateArt } from '../templates/templateArt';
import { CardMotion } from './CardMotion';

/**
 * The layer that gives each design its own atmosphere.
 *
 * Wraps a rendered card and paints, from back to front:
 *
 *   1. a ground texture (CSS gradients — no bytes, no requests)
 *   2. a corner ornament and an edge band (inline SVG, palette-coloured)
 *   3. an optional Lottie drift (lazy, one per card, off on reduced motion)
 *   4. a vignette, so text at the edges stays readable over all of it
 *
 * Everything is `pointer-events: none` and `aria-hidden`, sits behind the card
 * content, and is driven entirely by the design's entry in TEMPLATE_ART — so a
 * design's look changes in one table rather than in its own file.
 *
 * Weight: a typical card adds ~6 KB of SVG and zero requests. A card with an
 * animation adds the shared 47 KB player chunk plus that one JSON.
 */
export function CardAtmosphere({
    templateKey,
    palette,
    motionFile,
    motionTint,
    children,
}: {
    templateKey?: string | null;
    /** The card's live palette — already contrast-corrected upstream. */
    palette?: { primary?: string; secondary?: string; accent?: string; bg?: string } | null;
    /** Host's own choice; overrides the design's default when set. */
    motionFile?: string | null;
    motionTint?: boolean;
    children: ReactNode;
}) {
    const art: TemplateArt | null = artFor(templateKey);

    const accent = palette?.accent ?? art?.palette.accent ?? '#c9a24b';
    const primary = palette?.primary ?? art?.palette.primary ?? '#4a4a4a';
    const secondary = palette?.secondary ?? art?.palette.secondary ?? accent;
    const bg = palette?.bg ?? art?.palette.bg ?? '#ffffff';

    // A host who picked their own animation gets it; otherwise the design's.
    const motion = motionFile ?? art?.motion ?? null;
    const tint = motionFile ? motionTint !== false : (art?.motionTint ?? true);

    const ramp = useMemo(
        () => [primary, secondary, accent].filter(Boolean) as string[],
        [primary, secondary, accent],
    );

    if (!art) return <>{children}</>;

    const Corner = art.ornament ? ORNAMENTS[art.ornament] : null;
    const Band = art.ornamentAlt ? ORNAMENTS[art.ornamentAlt] : null;
    const texture = textureCss(art.texture, accent, bg);

    return (
        <div style={{ position: 'relative', isolation: 'isolate' }}>
            {/* 1. Ground texture. Fixed, so it does not repaint while scrolling. */}
            {texture && (
                <div
                    aria-hidden="true"
                    style={{
                        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
                        backgroundImage: texture,
                        backgroundSize: textureSize(art.texture),
                    }}
                />
            )}

            {/* 2. Ornament: one corner, mirrored opposite, plus an edge band. Kept
                   small and low-opacity — decoration, never competition. */}
            {Corner && (
                <>
                    <div aria-hidden="true" style={cornerStyle('top left')}>
                        <Corner color={secondary} accent={accent} opacity={0.5} />
                    </div>
                    <div aria-hidden="true" style={{ ...cornerStyle('bottom right'), transform: 'rotate(180deg)' }}>
                        <Corner color={secondary} accent={accent} opacity={0.36} />
                    </div>
                </>
            )}
            {Band && (
                <div
                    aria-hidden="true"
                    style={{
                        position: 'fixed', left: 0, right: 0, bottom: 0, height: 34,
                        zIndex: 0, pointerEvents: 'none', opacity: 0.32,
                    }}
                >
                    <Band color={accent} opacity={1} />
                </div>
            )}

            {/* 3. Motion. One per card, and only if the design asks for it. */}
            {motion && (
                <CardMotion
                    file={motion}
                    tint={tint ? ramp : undefined}
                    speed={art.motionSpeed}
                    opacity={art.motionOpacity}
                    style={{ position: 'fixed', inset: 0, zIndex: 0 }}
                />
            )}

            {/* 3b. Side frame — two hairlines down the edges with a corner
                   bracket, so the card reads as a printed piece rather than a
                   web page. Inset, so it never crowds text on a narrow phone. */}
            <div aria-hidden="true" style={frameStyle(accent)} />

            {/* 4. Vignette. The cheapest way to keep text legible over texture
                   and motion without dimming the middle of the card. */}
            <div
                aria-hidden="true"
                style={{
                    position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
                    background: `radial-gradient(ellipse 85% 65% at 50% 45%, transparent 55%, ${hexA(bg, 0.55)} 100%)`,
                }}
            />

            {/* The card itself, above every layer. */}
            <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
        </div>
    );
}

/**
 * A printed-border frame drawn with gradients on a fixed inset box: two thin
 * edge rules the full height, and a brighter L-bracket in each corner (a
 * vertical AND a horizontal stroke), so the card reads as a bordered card stock
 * rather than a web page. Costs nothing, scales to any screen, picks up the
 * palette accent.
 */
const frameStyle = (accent: string): CSSProperties => {
    const rule = hexA(accent, 0.28);
    const bright = hexA(accent, 0.6);
    const line = `linear-gradient(${bright}, ${bright})`;
    const B = 40; // corner-bracket length
    return {
        position: 'fixed',
        inset: 'clamp(8px, 2.2vw, 20px)',
        zIndex: 0,
        pointerEvents: 'none',
        borderLeft: `1px solid ${rule}`,
        borderRight: `1px solid ${rule}`,
        // 4 vertical + 4 horizontal bracket strokes, one at each corner.
        backgroundImage: `${line}, ${line}, ${line}, ${line}, ${line}, ${line}, ${line}, ${line}`,
        backgroundRepeat: 'no-repeat',
        backgroundSize:
            `1px ${B}px, 1px ${B}px, 1px ${B}px, 1px ${B}px, ` + // verticals
            `${B}px 1px, ${B}px 1px, ${B}px 1px, ${B}px 1px`,     // horizontals
        backgroundPosition:
            'left top, right top, left bottom, right bottom, ' +   // verticals
            'left top, right top, left bottom, right bottom',      // horizontals
    };
};

const cornerStyle = (corner: 'top left' | 'bottom right'): CSSProperties => ({
    position: 'fixed',
    ...(corner === 'top left' ? { top: 0, left: 0 } : { bottom: 0, right: 0 }),
    width: 'min(38vw, 230px)',
    height: 'min(38vw, 230px)',
    zIndex: 0,
    pointerEvents: 'none',
});
