/**
 * Lottie playback for wedding cards.
 *
 * Three constraints shape this file, all of them about the guest rather than
 * the developer:
 *
 *  • **Nobody pays for what they don't use.** The player is ~50 KB gzipped, so
 *    it is loaded with a dynamic `import()` — a card with no animation never
 *    downloads it, and the chunk is shared once a card does.
 *  • **The animations are data, not code.** They live in `public/lottie/` and
 *    are fetched at runtime, so adding one is dropping in a file — no rebuild,
 *    no deploy of the bundle, and an admin could upload one later.
 *  • **Motion is optional.** `prefers-reduced-motion` is honoured, and a failed
 *    fetch renders nothing rather than breaking the card.
 */

import { url } from './base';

/** The lottie-web instance, once. `null` until the first animated card. */
type LottiePlayer = typeof import('lottie-web/build/player/lottie_light');
let playerPromise: Promise<LottiePlayer> | null = null;

export function loadPlayer(): Promise<LottiePlayer> {
    // The light build drops expression support, which wedding animations do not
    // use, for roughly half the bytes of the full player.
    playerPromise ??= import('lottie-web/build/player/lottie_light');
    return playerPromise;
}

/** Parsed animations, keyed by file. Cards reuse the same few. */
const cache = new Map<string, Promise<unknown>>();

export function loadAnimation(file: string): Promise<unknown> {
    const src = url(`/lottie/${file}`);
    let entry = cache.get(src);
    if (!entry) {
        entry = fetch(src).then((r) => {
            if (!r.ok) throw new Error(`lottie ${file}: ${r.status}`);
            return r.json();
        });
        cache.set(src, entry);
    }
    return entry;
}

/* ------------------------------------------------------------------ *
 * Recolouring
 * ------------------------------------------------------------------ */

type Rgba = [number, number, number, number];

const isColor = (v: unknown): v is Rgba =>
    Array.isArray(v) && (v.length === 3 || v.length === 4) &&
    v.every((n) => typeof n === 'number' && n >= 0 && n <= 1);

const lum = ([r, g, b]: Rgba): number => 0.2126 * r + 0.7152 * g + 0.0722 * b;

function hexToUnit(hex: string): Rgba | null {
    const m = hex.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (!m) return null;
    const h = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1];
    return [
        parseInt(h.slice(0, 2), 16) / 255,
        parseInt(h.slice(2, 4), 16) / 255,
        parseInt(h.slice(4, 6), 16) / 255,
        1,
    ];
}

/**
 * Retint an animation onto a card's palette.
 *
 * A downloaded animation arrives in whatever colours its author chose — usually
 * pink flowers or gold sparkles — which fights every palette but one. Rather
 * than ask a host to find a matching animation, its distinct colours are ranked
 * by lightness and mapped onto the palette ramp in the same order, so the
 * artwork keeps its shading and picks up the card's hues.
 *
 * Returns a deep copy: the cached original must stay pristine for the next card.
 */
export function tintAnimation(json: unknown, ramp: string[]): unknown {
    const targets = ramp.map(hexToUnit).filter((c): c is Rgba => c !== null);
    if (targets.length === 0) return json;

    const copy = structuredClone(json) as unknown;

    // Pass 1: collect every distinct colour in the file.
    const found: Rgba[] = [];
    const seen = new Set<string>();
    const collect = (node: unknown): void => {
        if (Array.isArray(node)) {
            if (isColor(node)) {
                const key = node.slice(0, 3).map((n) => n.toFixed(3)).join(',');
                if (!seen.has(key)) {
                    seen.add(key);
                    found.push(node as Rgba);
                }
                return;
            }
            node.forEach(collect);
            return;
        }
        if (node && typeof node === 'object') Object.values(node).forEach(collect);
    };
    collect(copy);
    if (found.length === 0) return copy;

    // Rank by lightness and spread the ramp across that range, so the darkest
    // colour in the art becomes the darkest in the palette and shading survives.
    const ordered = [...found].sort((a, b) => lum(a) - lum(b));
    const map = new Map<string, Rgba>();
    ordered.forEach((c, i) => {
        const t = ordered.length === 1 ? 0 : i / (ordered.length - 1);
        const target = targets[Math.round(t * (targets.length - 1))];
        map.set(c.slice(0, 3).map((n) => n.toFixed(3)).join(','), target);
    });

    // Pass 2: write the new colours in, preserving each colour's own alpha.
    const paint = (node: unknown): void => {
        if (Array.isArray(node)) {
            if (isColor(node)) {
                const key = node.slice(0, 3).map((n) => n.toFixed(3)).join(',');
                const to = map.get(key);
                if (to) {
                    node[0] = to[0];
                    node[1] = to[1];
                    node[2] = to[2];
                }
                return;
            }
            node.forEach(paint);
            return;
        }
        if (node && typeof node === 'object') Object.values(node).forEach(paint);
    };
    paint(copy);

    return copy;
}
