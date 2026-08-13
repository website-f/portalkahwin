import { toPng } from 'html-to-image';

/**
 * Capture a rendered template as a PNG data URL.
 *
 * Thumbnails are produced in the browser, from the real template component,
 * rather than by a headless browser on the server: the front-end is the only
 * thing that knows how a design actually looks, and a contributed design exists
 * *only* as a config the React engine interprets. Capturing here means a cover
 * can never drift from what a guest sees.
 */

/** Capture size — matches the live cover's 9 : 17.5 frame, at ~1.6x for retina. */
export const THUMB_W = 460;
export const THUMB_H = Math.round((THUMB_W * 17.5) / 9);

export async function captureThumbnail(node: HTMLElement): Promise<string> {
    // Two passes: the first warms the font and image caches that html-to-image
    // inlines, the second renders with everything resolved. Without it the very
    // first capture in a session comes out with fallback fonts.
    const opts = {
        width: THUMB_W,
        height: THUMB_H,
        pixelRatio: 1.6,
        cacheBust: false,
        // The stage is white-backed so a template with a transparent body does
        // not capture onto black.
        backgroundColor: '#ffffff',
        style: { margin: '0', transformOrigin: 'top left' },
    };

    await toPng(node, opts);
    return toPng(node, opts);
}

/**
 * Give the browser a moment to settle after mounting a template: web fonts,
 * lazy images and the templates' own entrance animations all need a frame or
 * two before the cover is worth capturing.
 */
export function settle(ms = 900): Promise<void> {
    return new Promise((resolve) => {
        const done = () => setTimeout(resolve, ms);
        if (document.fonts?.ready) void document.fonts.ready.then(done);
        else done();
    });
}
