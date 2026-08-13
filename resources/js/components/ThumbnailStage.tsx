import { useEffect, useRef, useState } from 'react';
import { getTemplate } from '../templates/registry';
import { COVER_SAMPLE } from '../templates/sampleData';
import { captureThumbnail, settle, THUMB_W, THUMB_H } from '../lib/thumbnail';
import type { CustomTemplateConfig } from '../templates/customConfig';

/** One design to capture. `baseKey`/`config` describe a contributed design. */
export interface ThumbJob {
    id: string;
    key: string;
    baseKey?: string | null;
    config?: Partial<CustomTemplateConfig> | null;
}

/**
 * Renders one template at a time, off-screen at full card width, and hands the
 * captured PNG back. Kept off-screen rather than hidden: `display: none` and
 * `visibility: hidden` both make the subtree unrenderable, and html-to-image
 * would capture nothing.
 *
 * Sample content comes from SAMPLE_INVITATION, so every cover shows the same
 * couple (Adam & Hawa) and today's date.
 */
export function ThumbnailStage({
    job,
    onCaptured,
    onFailed,
}: {
    job: ThumbJob | null;
    onCaptured: (job: ThumbJob, dataUrl: string) => void;
    onFailed: (job: ThumbJob, message: string) => void;
}) {
    const ref = useRef<HTMLDivElement>(null);
    // Remount the subtree per job so entrance animations replay from the start
    // instead of the next template inheriting the previous one's finished state.
    const [mounted, setMounted] = useState<ThumbJob | null>(null);

    useEffect(() => {
        setMounted(job);
    }, [job]);

    useEffect(() => {
        if (!mounted) return;
        let alive = true;

        (async () => {
            await settle();
            if (!alive || !ref.current) return;
            try {
                const png = await captureThumbnail(ref.current);
                if (alive) onCaptured(mounted, png);
            } catch (e) {
                if (alive) onFailed(mounted, e instanceof Error ? e.message : 'Capture failed');
            }
        })();

        return () => { alive = false; };
        // onCaptured/onFailed are stable callbacks from the caller's render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mounted]);

    if (!mounted) return null;

    const Tpl = getTemplate(mounted.baseKey || mounted.key);

    return (
        <div
            aria-hidden="true"
            style={{
                position: 'fixed', top: 0, left: -9999, zIndex: -1,
                width: THUMB_W, height: THUMB_H, overflow: 'hidden',
                background: '#fff', pointerEvents: 'none',
            }}
        >
            <div
                ref={ref}
                style={{
                    width: THUMB_W,
                    // Templates size their cover with min-height: var(--pk-vh, 100vh);
                    // pin it to the capture height so the hero fills the frame exactly.
                    ['--pk-vh' as string]: `${THUMB_H}px`,
                    // No scroll cue in a still image — reclaim the space it reserves.
                    ['--pk-cue-clear' as string]: '24px',
                }}
            >
                <Tpl
                    key={mounted.id}
                    data={{ ...COVER_SAMPLE, templateConfig: mounted.config as CustomTemplateConfig | undefined }}
                    preview
                />
            </div>
        </div>
    );
}
