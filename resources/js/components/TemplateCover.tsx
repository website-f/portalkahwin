import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { getTemplate } from '../templates/registry';
import { COVER_SAMPLE } from '../templates/sampleData';
import { readablePalette } from '../lib/contrast';
import type { CustomTemplateConfig } from '../templates/customConfig';

/**
 * Natural width the template is laid out at before being scaled into the card.
 * Height follows the card screen's 9 : 17.5 ratio, so the cover fills the frame
 * exactly and nothing below it leaks in.
 */
export const COVER_W = 400;
export const COVER_H = Math.round((COVER_W * 17.5) / 9);

/**
 * A template's own cover, rendered live and scaled into a card thumbnail.
 *
 * Rendering the real component — rather than a baked screenshot or a
 * palette-driven stand-in — is the only way a card can show a design's true
 * colours, type and ornament. Templates render statically in `preview` mode
 * (no framer-motion), and each cover only mounts once it scrolls near the
 * viewport, so a full gallery stays cheap.
 */
export function TemplateCover({
    templateKey,
    baseKey,
    config,
    background = '#f6efe6',
}: {
    templateKey: string;
    baseKey?: string | null;
    config?: Partial<CustomTemplateConfig> | null;
    /** Painted under the cover while it mounts, so cards never flash white. */
    background?: string;
}) {
    const hostRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(0);
    const [near, setNear] = useState(false);

    // Mount only when the card is on its way into view. A gallery can list 20+
    // designs and every one of them is a full card's worth of DOM.
    useEffect(() => {
        const el = hostRef.current;
        if (!el) return;
        if (typeof IntersectionObserver === 'undefined') { setNear(true); return; }

        const io = new IntersectionObserver(
            (entries) => {
                if (entries.some((e) => e.isIntersecting)) {
                    setNear(true);
                    io.disconnect();
                }
            },
            { rootMargin: '400px' },
        );
        io.observe(el);
        return () => io.disconnect();
    }, []);

    // Scale the fixed-width stage down to whatever the card gives us.
    useLayoutEffect(() => {
        const el = hostRef.current;
        if (!el) return;
        const measure = () => setScale(el.clientWidth / COVER_W);
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const Tpl = getTemplate(baseKey || templateKey);

    return (
        <div ref={hostRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden', background }}>
            {near && scale > 0 && (
                <div
                    aria-hidden="true"
                    style={{
                        width: COVER_W,
                        height: COVER_H,
                        overflow: 'hidden',
                        transform: `scale(${scale})`,
                        transformOrigin: 'top left',
                        // Templates size their cover with min-height: var(--pk-vh, 100vh).
                        // Raw 100vh here would mean the browser window, not this
                        // little frame, so the hero would tower over the thumbnail.
                        ['--pk-vh' as string]: `${COVER_H}px`,
                        // The scroll cue sits above the fold on a real card; inside a
                        // thumbnail that reserved space just squeezes the artwork.
                        ['--pk-cue-clear' as string]: '24px',
                        pointerEvents: 'none',
                    }}
                >
                    <Tpl
                        data={{
                            ...COVER_SAMPLE,
                            palette: readablePalette(COVER_SAMPLE.palette),
                            templateConfig: config as CustomTemplateConfig | undefined,
                        }}
                        preview
                    />
                </div>
            )}
        </div>
    );
}
