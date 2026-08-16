// ============================================================
//  Section anchors — the one seam that lets the host reorder and
//  hide card sections without every template having to know about it.
//
//  Each optional block in a template is wrapped in <PkSec name="…">, which
//  renders a plain block-level div. That div is transparent to normal flow
//  (the <Section> inside keeps its own full-bleed background and padding),
//  but it gives `useSectionOrder` a stable handle on each block.
// ============================================================

import { useEffect, useLayoutEffect, useMemo, useRef, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { findCardFont, loadCardFont } from '../lib/cardFonts';

/** Sections a host may move. Mirrors Invitation::MOVABLE_SECTIONS on the server. */
/**
 * MUST match the order the templates actually render these sections in.
 *
 * This is the baseline every permutation is computed against: if it disagrees
 * with the DOM, an untouched card gets silently rearranged and a host's move
 * lands somewhere other than where the list says it will.
 */
// Default order (a host can reorder / hide any of these in the editor):
// details → intro → date/countdown (fixed template parts) → tentatif(program)
// → gallery → ucapan(wishes) → gifts(gift/wishlist) → rsvp → contact.
export const MOVABLE_SECTIONS = ['program', 'location', 'gallery', 'wishes', 'gift', 'wishlist', 'rsvp', 'contacts'] as const;
export type MovableSection = (typeof MOVABLE_SECTIONS)[number];

/**
 * Repair a stored order into a complete, duplicate-free list. A stored order is
 * a preference, never the whole truth — a section added to the product after
 * the host last saved must still appear, in its canonical place.
 */
export function resolveSectionOrder(stored?: string[] | null): MovableSection[] {
    const seen: MovableSection[] = [];
    for (const k of stored ?? []) {
        if ((MOVABLE_SECTIONS as readonly string[]).includes(k) && !seen.includes(k as MovableSection)) {
            seen.push(k as MovableSection);
        }
    }
    return [...seen, ...MOVABLE_SECTIONS.filter((k) => !seen.includes(k))];
}

/** Wraps one movable card section. Renders a bare div — no styling of its own. */
export function PkSec({ name, children }: { name: MovableSection; children: ReactNode }) {
    return <div data-pk-sec={name}>{children}</div>;
}

/**
 * Apply the host's section order (and hide switched-off sections) inside
 * `rootRef`, by permuting CSS `order` on the sections' shared parent.
 *
 * Only the slots the tagged sections already occupied are permuted, so every
 * untagged sibling — cover, couple block, footer — keeps exactly the position
 * the template designed for it.
 */
export function useSectionOrder(
    rootRef: RefObject<HTMLElement | null>,
    order: string[] | null | undefined,
    hidden?: Record<string, boolean>,
) {
    // Serialise the inputs so the effect re-runs on a real change, not on every
    // parent render handing us a fresh array/object identity.
    const orderKey = (order ?? []).join(',');
    const hiddenKey = Object.entries(hidden ?? {}).filter(([, off]) => off).map(([k]) => k).sort().join(',');
    // Derived from orderKey alone, so it is a new array only on a real change.
    const wanted = useMemo(() => resolveSectionOrder(order), [orderKey]);

    useLayoutEffect(() => {
        const root = rootRef.current;
        if (!root) return;

        /**
         * Apply hiding + ordering to whatever is in the DOM right now.
         *
         * Re-runnable on purpose: the template re-renders on every keystroke in
         * the editor, and a section appearing or disappearing rewrites the very
         * children whose `order` we set. Applying once on mount left the preview
         * showing the template's own arrangement again after the next edit.
         */
        const apply = (): void => {
            const nodes = Array.from(root.querySelectorAll<HTMLElement>('[data-pk-sec]'));
            if (nodes.length === 0) return;

            // Hiding is normally done by omitting the data, but a few sections
            // (the guestbook) always render a placeholder, so suppress them here.
            for (const el of nodes) {
                const key = el.dataset.pkSec ?? '';
                const off = !!hidden?.[key];
                if (el.style.display !== (off ? 'none' : '')) el.style.display = off ? 'none' : '';
            }

            const parent = nodes[0].parentElement;
            // Sections split across different parents cannot be permuted as one
            // list — leave the template's own arrangement alone rather than
            // half-apply it.
            if (!parent || nodes.some((n) => n.parentElement !== parent)) return;

            const byKey = new Map(nodes.map((n) => [n.dataset.pkSec ?? '', n]));
            const domOrder = nodes.map((n) => n.dataset.pkSec ?? '');
            const desired = wanted.filter((k) => byKey.has(k));

            // Default order: leave the template's own layout completely alone,
            // and undo anything a previous pass set.
            if (desired.join(',') === domOrder.join(',')) {
                if (parent.style.display === 'flex') {
                    parent.style.display = '';
                    parent.style.flexDirection = '';
                    Array.from(parent.children).forEach((c) => { (c as HTMLElement).style.order = ''; });
                }
                return;
            }

            // Reorder with CSS `order`, NOT by moving the nodes.
            //
            // Moving them is what broke the editor: these elements belong to
            // React, which holds references to them and inserts later updates
            // relative to their position. Reparenting behind its back left it
            // updating the wrong places, so edits stopped showing in the preview
            // at all. Writing `order` only touches a style React does not manage
            // on these nodes, so the two never collide.
            const children = Array.from(parent.children) as HTMLElement[];

            // Every child needs an explicit order: an untouched sibling defaults
            // to 0, which would drag the footer up in front of the sections.
            const slots: number[] = [];
            children.forEach((c, i) => {
                c.style.order = String(i * 10);
                if (c.hasAttribute('data-pk-sec')) slots.push(i * 10);
            });

            parent.style.display = 'flex';
            parent.style.flexDirection = 'column';

            // Permute only among the slots the sections already occupied, so
            // the cover, the couple block and the footer keep their places.
            desired.forEach((key, i) => {
                const el = byKey.get(key);
                if (el && slots[i] !== undefined) el.style.order = String(slots[i]);
            });
        };

        apply();

        // Re-apply after any structural change to the card. Guarded by a frame so
        // a burst of mutations costs one pass, and detached while we write so our
        // own style changes cannot retrigger it.
        let frame: number | null = null;
        const observer = new MutationObserver(() => {
            if (frame !== null) return;
            frame = requestAnimationFrame(() => {
                frame = null;
                observer.disconnect();
                apply();
                observer.observe(root, { childList: true, subtree: true });
            });
        });
        observer.observe(root, { childList: true, subtree: true });

        return () => {
            observer.disconnect();
            if (frame !== null) cancelAnimationFrame(frame);
        };
    }, [rootRef, orderKey, hiddenKey, wanted]);
}

/**
 * Wraps a rendered card and applies the host's section order to it.
 *
 * A component rather than a bare hook so it mounts only once the card data has
 * arrived — the effect then always runs against a populated subtree, with no
 * dependency gymnastics to re-fire it after the initial empty render.
 */
export function CardStage({
    order,
    hidden,
    fontId,
    bottomClear,
    children,
}: {
    order?: string[] | null;
    hidden?: Record<string, boolean>;
    /** Host's display font. Templates fall back to their own when unset. */
    fontId?: string | null;
    /**
     * Space to leave under the card. The live card has a fixed action bar
     * pinned to the bottom of the viewport, which otherwise sits on top of the
     * template's own footer.
     */
    bottomClear?: number;
    children: ReactNode;
}) {
    const ref = useRef<HTMLDivElement>(null);
    useSectionOrder(ref, order, hidden);

    // Load the webfont only when a card actually uses one.
    useEffect(() => { loadCardFont(fontId); }, [fontId]);

    const font = findCardFont(fontId);

    return (
        <div
            ref={ref}
            style={{
                ...(font ? ({ '--pk-name': font.stack } as CSSProperties) : null),
                ...(bottomClear ? { paddingBottom: bottomClear } : null),
            }}
        >
            {children}
        </div>
    );
}
