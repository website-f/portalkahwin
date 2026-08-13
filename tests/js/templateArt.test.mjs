/**
 * Art direction is data, so it can drift silently — a palette edited for looks
 * can quietly stop being readable, two designs can converge on the same accent,
 * or a motion file can be renamed out from under the table.
 *
 * `node tests/js/templateArt.test.mjs`
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createJiti } from 'jiti';
import { readdirSync, statSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const jiti = createJiti(require.resolve('./templateArt.test.mjs'));

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const { TEMPLATE_ART } = jiti('../../resources/js/templates/templateArt.ts');
const { contrastRatio, AA_TEXT, AA_LARGE } = jiti('../../resources/js/lib/contrast.ts');
// ornaments.tsx is JSX, which jiti will not compile here — read the catalogue
// keys straight out of the source instead.
const ornamentSrc = readFileSync(join(root, 'resources/js/templates/ornaments.tsx'), 'utf8');
const catalogue = ornamentSrc.slice(ornamentSrc.indexOf('export const ORNAMENTS'));
const ORNAMENT_KEYS = new Set([...catalogue.matchAll(/^\s{4}(\w+):/gm)].map((m) => m[1]));

const lottieDir = join(root, 'public', 'lottie');

let passed = 0;
const check = (name, fn) => {
    try { fn(); passed++; console.log(`  ok   ${name}`); }
    catch (e) { console.error(`  FAIL ${name}\n       ${e.message}`); process.exitCode = 1; }
};

console.log('template art direction');

check('every palette is readable in its own contract', () => {
    for (const [key, art] of Object.entries(TEMPLATE_ART)) {
        const p = art.palette;
        // Body copy always sits on `bg`, whichever contract the design uses.
        assert.ok(contrastRatio(p.text, p.bg) >= AA_TEXT, `${key}: text on bg`);

        if (art.groundIsPrimary) {
            // Songket and Batik paint the page with `primary` and put gold on it.
            // Checking gold against `bg` here is what inverted them in the first
            // place, so check it against the ground it actually sits on.
            assert.ok(contrastRatio(p.accent, p.primary) >= AA_LARGE, `${key}: accent on ground`);
        } else {
            assert.ok(contrastRatio(p.primary, p.bg) >= AA_LARGE, `${key}: primary`);
            assert.ok(contrastRatio(p.secondary, p.bg) >= AA_TEXT, `${key}: secondary`);
            assert.ok(contrastRatio(p.accent, p.bg) >= AA_LARGE, `${key}: accent`);
        }
    }
});

check('an inverted design is authored in its own convention', () => {
    // The bug this guards: authoring Songket in the majority contract made its
    // ground pale and its gold text unreadable.
    for (const [key, art] of Object.entries(TEMPLATE_ART)) {
        if (!art.groundIsPrimary) continue;
        const p = art.palette;
        assert.ok(
            contrastRatio(p.primary, p.bg) >= 3,
            `${key}: ground and surface are too close to tell apart`,
        );
    }
});

check('no two designs share an accent — that was the sameness problem', () => {
    const seen = new Map();
    for (const [key, art] of Object.entries(TEMPLATE_ART)) {
        const a = art.palette.accent.toLowerCase();
        assert.ok(!seen.has(a), `${key} and ${seen.get(a)} both use ${a}`);
        seen.set(a, key);
    }
});

check('backgrounds are varied too, not all cream and near-black', () => {
    const bgs = new Set(Object.values(TEMPLATE_ART).map((a) => a.palette.bg.toLowerCase()));
    assert.equal(bgs.size, Object.keys(TEMPLATE_ART).length, 'two designs share a background');
});

check('every ornament named actually exists', () => {
    for (const [key, art] of Object.entries(TEMPLATE_ART)) {
        if (art.ornament) assert.ok(ORNAMENT_KEYS.has(art.ornament), `${key}: unknown ornament ${art.ornament}`);
        if (art.ornamentAlt) assert.ok(ORNAMENT_KEYS.has(art.ornamentAlt), `${key}: unknown ornamentAlt ${art.ornamentAlt}`);
    }
});

check('every motion file referenced is on disk', () => {
    if (!existsSync(lottieDir)) return;
    const files = new Set(readdirSync(lottieDir).filter((f) => f.endsWith('.json')));
    for (const [key, art] of Object.entries(TEMPLATE_ART)) {
        if (art.motion) assert.ok(files.has(art.motion), `${key}: missing ${art.motion}`);
    }
});

check('motion filenames are URL-safe and pass the API validation', () => {
    if (!existsSync(lottieDir)) return;
    const rule = /^[A-Za-z0-9._-]+\.json$/;
    for (const f of readdirSync(lottieDir).filter((x) => x.endsWith('.json'))) {
        assert.match(f, rule, `${f} would be rejected by the motion_file rule`);
    }
});

check('no animation is heavy enough to hurt a low-end phone', () => {
    if (!existsSync(lottieDir)) return;
    for (const f of readdirSync(lottieDir).filter((x) => x.endsWith('.json'))) {
        const kb = statSync(join(lottieDir, f)).size / 1024;
        assert.ok(kb <= 256, `${f} is ${Math.round(kb)} KB — too heavy for a card`);
    }
});

check('motion is used sparingly and slowly', () => {
    const animated = Object.values(TEMPLATE_ART).filter((a) => a.motion);
    // Every design carrying motion must drift, not perform.
    for (const a of animated) {
        assert.ok(a.motionSpeed <= 0.8, `speed ${a.motionSpeed} is too fast for a card`);
        assert.ok(a.motionOpacity <= 0.6, `opacity ${a.motionOpacity} will fight the text`);
    }
    // And a good share of the catalogue should be still, so motion means something.
    const stillShare = 1 - animated.length / Object.keys(TEMPLATE_ART).length;
    assert.ok(stillShare >= 0.3, `only ${Math.round(stillShare * 100)}% of designs are still`);
});

check('reveal personalities are actually spread across the catalogue', () => {
    const reveals = new Set(Object.values(TEMPLATE_ART).map((a) => a.reveal));
    assert.ok(reveals.size >= 5, `only ${reveals.size} distinct reveals — designs will feel alike`);
});

console.log(`\n${passed} passed${process.exitCode ? ', see failures above' : ''}`);
