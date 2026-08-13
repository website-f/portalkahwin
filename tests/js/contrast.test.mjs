/**
 * The palette corrector runs on every card, so it has to be right about two
 * things: it must actually clear the WCAG bar, and it must not repaint a
 * palette that was already fine.
 *
 * `node tests/js/contrast.test.mjs`
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createJiti } from 'jiti';

// jiti compiles the real TypeScript, so the test exercises the shipped source
// rather than a hand-maintained copy of it that could drift.
const jiti = createJiti(createRequire(import.meta.url).resolve('./contrast.test.mjs'));
const { contrastRatio, ensureReadable, readablePalette, AA_TEXT, AA_LARGE } =
    jiti('../../resources/js/lib/contrast.ts');

let passed = 0;
const check = (name, fn) => {
    try { fn(); passed++; console.log(`  ok   ${name}`); }
    catch (e) { console.error(`  FAIL ${name}\n       ${e.message}`); process.exitCode = 1; }
};

console.log('palette contrast');

check('computes the reference ratios', () => {
    assert.equal(Math.round(contrastRatio('#000000', '#ffffff')), 21);
    assert.equal(Math.round(contrastRatio('#ffffff', '#ffffff')), 1);
    // The failure that started this: gold on cream.
    assert.ok(contrastRatio('#c9a24b', '#f6efe6') < 2.5);
});

check('leaves a palette that already passes untouched', () => {
    const good = { primary: '#f4e9c8', secondary: '#caa24a', accent: '#d4af37', bg: '#140f0a', text: '#efe6d0' };
    assert.deepEqual(readablePalette(good), good);
});

check('lifts every failing colour over its bar', () => {
    const bad = { primary: '#5b3a2e', secondary: '#8a6d5f', accent: '#c9a24b', bg: '#f6efe6', text: '#4a3b33' };
    const fixed = readablePalette(bad);
    assert.ok(contrastRatio(fixed.secondary, bad.bg) >= AA_TEXT, `secondary ${contrastRatio(fixed.secondary, bad.bg)}`);
    assert.ok(contrastRatio(fixed.text, bad.bg) >= AA_TEXT);
    assert.ok(contrastRatio(fixed.accent, bad.bg) >= AA_LARGE);
    assert.ok(contrastRatio(fixed.primary, bad.bg) >= AA_LARGE);
});

check('keeps gold recognisably gold rather than turning it grey', () => {
    const fixed = ensureReadable('#c9a24b', '#f6efe6', AA_LARGE);
    const hex = fixed.replace('#', '');
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
    assert.ok(r > b && g > b, `expected a warm colour, got ${fixed}`);
});

check('lightens on a dark background instead of darkening', () => {
    const fixed = ensureReadable('#3a2f10', '#140f0a', AA_TEXT);
    assert.ok(contrastRatio(fixed, '#140f0a') >= AA_TEXT);
});

check('survives palettes it cannot parse', () => {
    assert.equal(ensureReadable('var(--x)', '#fff'), 'var(--x)');
    assert.equal(readablePalette(null), null);
    assert.deepEqual(readablePalette({ primary: '#fff' }), { primary: '#fff' });
});

check('every shipped palette passes after correction', () => {
    // The 13 failures found by the audit, as stored in the seeder.
    const shipped = [
        ['floral', { primary: '#5b3a2e', secondary: '#8a6d5f', accent: '#c9a24b', bg: '#f6efe6', text: '#4a3b33' }],
        ['pastel', { primary: '#7c6a86', secondary: '#a794b4', accent: '#d8b7c8', bg: '#fbf6f8', text: '#5f5468' }],
        ['boho', { primary: '#8a6a4f', secondary: '#b39377', accent: '#c8a887', bg: '#faf3ea', text: '#5c4838' }],
        ['peranakan', { primary: '#9c4a6e', secondary: '#c47b98', accent: '#3f8f8a', bg: '#fdf4f6', text: '#5e3348' }],
    ];
    for (const [name, pal] of shipped) {
        const fixed = readablePalette(pal);
        assert.ok(contrastRatio(fixed.secondary, pal.bg) >= AA_TEXT, `${name}: secondary`);
        assert.ok(contrastRatio(fixed.text, pal.bg) >= AA_TEXT, `${name}: text`);
        assert.ok(contrastRatio(fixed.accent, pal.bg) >= AA_LARGE, `${name}: accent`);
    }
});

console.log(`\n${passed} passed${process.exitCode ? ', see failures above' : ''}`);
