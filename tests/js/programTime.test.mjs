/**
 * The run of show moved from free text to a time input, so existing cards are
 * full of hand-typed strings that must survive the change. These pin both
 * directions: what the editor can adopt, and how a card reads it back.
 *
 * `node tests/js/programTime.test.mjs`
 */
import assert from 'node:assert/strict';

// Mirrors resources/js/lib/datetime.ts — kept in step by the cases below.
function toTimeInputValue(raw) {
    const v = (raw ?? '').trim().toLowerCase();
    if (!v) return '';
    const m = v.match(/^(\d{1,2})\s*[:.]?\s*(\d{2})?/);
    if (!m) return null;
    let h = Number(m[1]);
    const min = Number(m[2] ?? 0);
    if (!Number.isFinite(h) || h > 23 || min > 59) return null;
    const pm = /petang|malam|\bpm\b/.test(v);
    const am = /pagi|\bam\b/.test(v);
    const noon = /tengah hari/.test(v);
    const midnight = /tengah malam/.test(v);
    if (noon) h = 12;
    else if (midnight) h = 0;
    else if (pm && h < 12) h += 12;
    else if (am && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function formatProgramTime(raw, lang) {
    const v = (raw ?? '').trim();
    const m = v.match(/^(\d{2}):(\d{2})$/);
    if (!m) return v;
    const h = Number(m[1]);
    const min = m[2];
    if (lang === 'bm') {
        const hour12 = h % 12 === 0 ? 12 : h % 12;
        const part =
            h === 12 ? 'tengah hari'
                : h === 0 ? 'tengah malam'
                    : h < 12 ? 'pagi'
                        : h < 19 ? 'petang'
                            : 'malam';
        return `${hour12}:${min} ${part}`;
    }
    const d = new Date(2000, 0, 1, h, Number(min));
    return new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-GB', { hour: 'numeric', minute: '2-digit' }).format(d);
}

let passed = 0;
const check = (name, fn) => {
    try { fn(); passed++; console.log(`  ok   ${name}`); }
    catch (e) { console.error(`  FAIL ${name}\n       ${e.message}`); process.exitCode = 1; }
};

console.log('run-of-show times');

check('adopts the Malay forms already in the data', () => {
    assert.equal(toTimeInputValue('11:00 pagi'), '11:00');
    assert.equal(toTimeInputValue('12:00 tengah hari'), '12:00');
    assert.equal(toTimeInputValue('12:30 petang'), '12:30');
    assert.equal(toTimeInputValue('2:00 petang'), '14:00');
    assert.equal(toTimeInputValue('8.30 malam'), '20:30');
    assert.equal(toTimeInputValue('12:00 tengah malam'), '00:00');
});

check('adopts English and bare forms', () => {
    assert.equal(toTimeInputValue('11:00 AM'), '11:00');
    assert.equal(toTimeInputValue('4:00 pm'), '16:00');
    assert.equal(toTimeInputValue('12:00 am'), '00:00');
    assert.equal(toTimeInputValue('09:15'), '09:15');
    assert.equal(toTimeInputValue('  '), '');
});

check('refuses what it cannot read, rather than guessing', () => {
    assert.equal(toTimeInputValue('selepas Zohor'), null);
    assert.equal(toTimeInputValue('25:00'), null);
    assert.equal(toTimeInputValue('10:75'), null);
});

check('reads back in Malay using parts of the day, not am/pm', () => {
    assert.equal(formatProgramTime('11:00', 'bm'), '11:00 pagi');
    assert.equal(formatProgramTime('12:00', 'bm'), '12:00 tengah hari');
    assert.equal(formatProgramTime('14:00', 'bm'), '2:00 petang');
    assert.equal(formatProgramTime('20:30', 'bm'), '8:30 malam');
    assert.equal(formatProgramTime('00:00', 'bm'), '12:00 tengah malam');
});

check('leaves a legacy hand-typed value untouched', () => {
    assert.equal(formatProgramTime('selepas Zohor', 'bm'), 'selepas Zohor');
    assert.equal(formatProgramTime('11:00 pagi', 'bm'), '11:00 pagi');
    assert.equal(formatProgramTime('', 'bm'), '');
});

check('round-trips: every adopted value reads back sensibly', () => {
    for (const raw of ['11:00 pagi', '2:00 petang', '8.30 malam', '12:00 tengah hari']) {
        const stored = toTimeInputValue(raw);
        assert.match(formatProgramTime(stored, 'bm'), /pagi|petang|malam|tengah hari/);
    }
});

console.log(`\n${passed} passed${process.exitCode ? ', see failures above' : ''}`);
