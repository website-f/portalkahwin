// ============================================================
//  Section anchors — the one seam that lets the host reorder and
//  hide card sections without every template having to know about it.
//
//  Each optional block in a template is wrapped in <PkSec name="…">, which
//  renders a plain block-level div. That div is transparent to normal flow
//  (the <Section> inside keeps its own full-bleed background and padding),
//  but it gives `useSectionOrder` a stable handle on each block.
// ============================================================

import { useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react';

/** Sections a host may move. Mirrors Invitation::MOVABLE_SECTIONS on the server. */
export const MOVABLE_SECTIONS = ['program', 'location', 'gallery', 'rsvp', 'wishes', 'wishlist', 'contacts', 'gift'] as const;
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

    useLayoutEffect(() => {
        const root = rootRef.current;
        if (!root) return;

        const nodes = Array.from(root.querySelectorAll<HTMLElement>('[data-pk-sec]'));
        if (nodes.length === 0) return;

        // Hiding is normally done by omitting the data, but a few sections
        // (the guestbook) always render a placeholder, so suppress them here.
        for (const el of nodes) {
            const key = el.dataset.pkSec ?? '';
            el.style.display = hidden?.[key] ? 'none' : '';
        }

        const wanted = resolveSectionOrder(order);
        // A card left in the template's own order is rendered untouched — no
        // flex container, no `order` properties. Only a host who actually moved
        // something opts their card into the permuted layout.
        if (wanted.every((k, i) => k === MOVABLE_SECTIONS[i])) return;

        const parent = nodes[0].parentElement;
        // Sections split across different parents can't be permuted with `order`
        // — leave the template's own arrangement alone rather than half-apply.
        if (!parent || nodes.some((n) => n.parentElement !== parent)) return;

        const children = Array.from(parent.children) as HTMLElement[];
        const slots: number[] = [];
        children.forEach((c, i) => { if (c.hasAttribute('data-pk-sec')) slots.push(i); });

        // Sections present in the DOM, in the host's order.
        const present = wanted.filter((k) => nodes.some((n) => n.dataset.pkSec === k));

        parent.style.display = 'flex';
        parent.style.flexDirection = 'column';
        children.forEach((c, i) => { c.style.order = String(i * 10); });
        present.forEach((key, i) => {
            const el = nodes.find((n) => n.dataset.pkSec === key);
            if (el && slots[i] !== undefined) el.style.order = String(slots[i] * 10);
        });

        return () => {
            parent.style.display = '';
            parent.style.flexDirection = '';
            children.forEach((c) => { c.style.order = ''; });
        };
    }, [rootRef, orderKey, hiddenKey]);
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
    children,
}: {
    order?: string[] | null;
    hidden?: Record<string, boolean>;
    children: ReactNode;
}) {
    const ref = useRef<HTMLDivElement>(null);
    useSectionOrder(ref, order, hidden);
    return <div ref={ref}>{children}</div>;
}
