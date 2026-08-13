import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useReducedMotion } from 'framer-motion';
import { loadPlayer, loadAnimation, tintAnimation } from '../lib/lottie';

/**
 * A Lottie animation layered onto a card — falling petals, drifting sparkles,
 * a curtain sweep.
 *
 * Decorative by definition: it is `aria-hidden`, it never intercepts a tap, and
 * if anything at all goes wrong (missing file, bad JSON, blocked fetch) it
 * renders nothing. A card that loses its petals is fine; a card that fails to
 * open is not.
 *
 * Nothing loads until the element is near the viewport, so an animation placed
 * near the footer costs the guest nothing while they are reading the cover.
 */
export function CardMotion({
    file,
    tint,
    loop = true,
    speed = 1,
    opacity = 1,
    style,
    className,
}: {
    /** Filename inside `public/lottie/`, e.g. `petals-fall.json`. */
    file: string;
    /** Palette ramp to retint onto, darkest first. Omit to keep original colours. */
    tint?: string[];
    loop?: boolean;
    speed?: number;
    opacity?: number;
    style?: CSSProperties;
    className?: string;
}) {
    const hostRef = useRef<HTMLDivElement>(null);
    const [near, setNear] = useState(false);
    const reduce = useReducedMotion() ?? false;

    // Only mount once it is worth mounting.
    useEffect(() => {
        const el = hostRef.current;
        if (!el || reduce) return;
        if (typeof IntersectionObserver === 'undefined') { setNear(true); return; }

        const io = new IntersectionObserver(
            (entries) => {
                if (entries.some((e) => e.isIntersecting)) {
                    setNear(true);
                    io.disconnect();
                }
            },
            { rootMargin: '200px' },
        );
        io.observe(el);
        return () => io.disconnect();
    }, [reduce]);

    useEffect(() => {
        if (!near || reduce) return;
        const host = hostRef.current;
        if (!host) return;

        let anim: { destroy: () => void; setSpeed: (n: number) => void } | null = null;
        let alive = true;

        void (async () => {
            try {
                const [player, json] = await Promise.all([loadPlayer(), loadAnimation(file)]);
                if (!alive || !hostRef.current) return;

                const data = tint?.length ? tintAnimation(json, tint) : json;

                anim = player.default.loadAnimation({
                    container: hostRef.current,
                    renderer: 'svg',
                    loop,
                    autoplay: true,
                    animationData: data as object,
                    rendererSettings: {
                        // Fill the box the card gave us rather than letter-boxing.
                        preserveAspectRatio: 'xMidYMid slice',
                        progressiveLoad: true,
                    },
                });
                anim.setSpeed(speed);
            } catch {
                /* decoration only — a card must open without it */
            }
        })();

        return () => {
            alive = false;
            try { anim?.destroy(); } catch { /* already gone */ }
        };
        // `tint` is an array literal at most call sites; key on its content.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [near, reduce, file, loop, speed, (tint ?? []).join(',')]);

    // Reduced motion: no player, no fetch, nothing rendered.
    if (reduce) return null;

    return (
        <div
            ref={hostRef}
            aria-hidden="true"
            className={className}
            style={{
                pointerEvents: 'none',
                opacity,
                ...style,
            }}
        />
    );
}
