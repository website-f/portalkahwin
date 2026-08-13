/**
 * Exercises the section-reordering DOM surgery against a real DOM.
 *
 * The permutation is the one piece of this feature that cannot be checked by
 * reading the code — it moves nodes around a live tree, and every previous
 * attempt at this bug failed because the mechanism was reasoned about rather
 * than run. `node tests/js/sectionOrder.test.mjs`
 */
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';

const MOVABLE_SECTIONS = ['program', 'location', 'rsvp', 'wishes', 'wishlist', 'contacts', 'gift', 'gallery'];

function resolveSectionOrder(stored) {
    const seen = [];
    for (const k of stored ?? []) {
        if (MOVABLE_SECTIONS.includes(k) && !seen.includes(k)) seen.push(k);
    }
    return [...seen, ...MOVABLE_SECTIONS.filter((k) => !seen.includes(k))];
}

/** The body of `apply()` from resources/js/templates/PkSec.tsx, verbatim in behaviour. */
function apply(root, order, hidden) {
    const wanted = resolveSectionOrder(order);
    const nodes = Array.from(root.querySelectorAll('[data-pk-sec]'));
    if (nodes.length === 0) return 'no-anchors';

    for (const el of nodes) {
        const key = el.getAttribute('data-pk-sec') ?? '';
        el.style.display = hidden?.[key] ? 'none' : '';
    }

    const parent = nodes[0].parentElement;
    if (!parent || nodes.some((n) => n.parentElement !== parent)) return 'split-parents';

    const byKey = new Map(nodes.map((n) => [n.getAttribute('data-pk-sec') ?? '', n]));
    const dom = nodes.map((n) => n.getAttribute('data-pk-sec') ?? '');
    const desired = wanted.filter((k) => byKey.has(k));

    if (desired.join(',') === dom.join(',')) {
        if (parent.style.display === 'flex') {
            parent.style.display = '';
            parent.style.flexDirection = '';
            Array.from(parent.children).forEach((c) => { c.style.order = ''; });
        }
        return 'already-ordered';
    }

    const children = Array.from(parent.children);
    const slots = [];
    children.forEach((c, i) => {
        c.style.order = String(i * 10);
        if (c.hasAttribute('data-pk-sec')) slots.push(i * 10);
    });
    parent.style.display = 'flex';
    parent.style.flexDirection = 'column';
    desired.forEach((key, i) => {
        const el = byKey.get(key);
        if (el && slots[i] !== undefined) el.style.order = String(slots[i]);
    });
    return 'reordered';
}

/**
 * What the guest actually sees: children sorted by CSS `order`, ties broken by
 * DOM position — which is exactly how a flex column lays out.
 */
function visualOrder(root) {
    return Array.from(root.children)
        .map((c, i) => ({ c, i, order: Number(c.style.order || 0) }))
        .sort((a, b) => a.order - b.order || a.i - b.i)
        .map(({ c }) => c.getAttribute('data-pk-sec') ?? c.id);
}

/** Only the movable sections, in the order they render. */
const domOrder = (root) => visualOrder(root).filter((k) => MOVABLE_SECTIONS.includes(k));

function build(sections = MOVABLE_SECTIONS) {
    // Mirrors a real template: a hero and a footer around the movable block.
    const { document } = parseHTML(`<!doctype html><html><body><div id="stage">
        <section id="hero">cover</section>
        <section id="couple">couple</section>
        ${sections.map((k) => `<div data-pk-sec="${k}"><section>${k}</section></div>`).join('\n        ')}
        <footer id="foot">footer</footer>
    </div></body></html>`);
    return { root: document.getElementById('stage'), document };
}

let passed = 0;
const check = (name, fn) => {
    try {
        fn();
        passed++;
        console.log(`  ok   ${name}`);
    } catch (e) {
        console.error(`  FAIL ${name}\n       ${e.message}`);
        process.exitCode = 1;
    }
};

console.log('section reordering');

check('default order is a no-op', () => {
    const { root } = build();
    assert.equal(apply(root, null), 'already-ordered');
    assert.deepEqual(domOrder(root), MOVABLE_SECTIONS);
});

check('moving gift to the front reorders the DOM', () => {
    const { root } = build();
    const order = ['gift', ...MOVABLE_SECTIONS.filter((k) => k !== 'gift')];
    assert.equal(apply(root, order), 'reordered');
    assert.deepEqual(domOrder(root), order);
});

check('a full reversal lands exactly reversed', () => {
    const { root } = build();
    const order = [...MOVABLE_SECTIONS].reverse();
    apply(root, order);
    assert.deepEqual(domOrder(root), order);
});

check('hero and footer keep their positions', () => {
    const { root } = build();
    apply(root, [...MOVABLE_SECTIONS].reverse());
    const ids = visualOrder(root);
    assert.equal(ids[0], 'hero');
    assert.equal(ids[1], 'couple');
    assert.equal(ids[ids.length - 1], 'foot');
});

check('never moves a node — React owns the tree', () => {
    const { root } = build();
    const before = Array.from(root.children);
    apply(root, [...MOVABLE_SECTIONS].reverse());
    const after = Array.from(root.children);
    assert.deepEqual(after, before, 'apply() reparented a node; that breaks React reconciliation');
});

check('returning to the default order clears the styles it set', () => {
    const { root } = build();
    apply(root, [...MOVABLE_SECTIONS].reverse());
    assert.equal(root.style.display, 'flex');
    apply(root, MOVABLE_SECTIONS);
    assert.equal(root.style.display, '');
    assert.deepEqual(domOrder(root), MOVABLE_SECTIONS);
});

check('reordering twice from different states converges', () => {
    const { root } = build();
    apply(root, ['gallery', 'gift', 'contacts', 'wishlist', 'wishes', 'rsvp', 'location', 'program']);
    const target = ['location', 'program', 'gallery', 'gift', 'contacts', 'wishlist', 'wishes', 'rsvp'];
    apply(root, target);
    assert.deepEqual(domOrder(root), target);
});

check('a missing section is skipped, the rest still order', () => {
    const present = MOVABLE_SECTIONS.filter((k) => k !== 'gallery');
    const { root } = build(present);
    const order = ['gift', ...MOVABLE_SECTIONS.filter((k) => k !== 'gift')];
    apply(root, order);
    assert.deepEqual(domOrder(root), order.filter((k) => present.includes(k)));
});

check('hidden sections are display:none but keep their slot', () => {
    const { root } = build();
    apply(root, null, { wishes: true });
    const wishes = root.querySelector('[data-pk-sec="wishes"]');
    assert.equal(wishes.style.display, 'none');
    assert.deepEqual(domOrder(root), MOVABLE_SECTIONS);
});

check('a stored order missing new sections still places them', () => {
    const { root } = build();
    // Saved before `gallery` existed as a movable section.
    const stored = ['gift', 'program', 'location', 'rsvp', 'wishes', 'wishlist', 'contacts'];
    apply(root, stored);
    assert.deepEqual(domOrder(root), [...stored, 'gallery']);
});

console.log(`\n${passed} passed${process.exitCode ? ', see failures above' : ''}`);
