// Direction capture — the bug behind a +₹69,600 options BUY saved as −₹69,600.
//
// computePnl was right for what was stored: dir:'short' on a CE whose premium
// went 230 → 346 IS a loss for a writer. The stored DIRECTION was wrong. Every
// "Sold" options trade in production had its stop-loss on the buyer's side.
// These tests pin the invariant the journal lacked: a stop-loss can only sit
// on one side of the entry for a given direction, and a trade must not save
// while they contradict.
//
// The same functions are inlined in src/journal-content.html. The sync block at
// the bottom runs the INLINE copies too, so the two can never drift silently
// (the P1 pnlCalc tests only ever exercised the module copy).
import fs from 'node:fs';
import * as P from '../src/utils/pnlCalc.js';
const { computePnl, directionConflict } = P;

let pass = 0, fail = 0;
function eq(name, got, expected) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  if (ok) pass++; else fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  → ${JSON.stringify(got)}${ok ? '' : `  (expected ${JSON.stringify(expected)})`}`);
}
const conflict = (t) => (typeof directionConflict === 'function' ? directionConflict(t) !== null : 'directionConflict missing');

console.log('\n══ The production record (17 Sep, SENSEX 74400 CE, exactly as stored) ══');
const stored = { seg: 'options', dir: 'short', optType: 'CE', en: '230', ex: '346', qty: '30', lotSize: '20', sl: '177', rv: '2' };
eq('computePnl on the stored record (arithmetic is correct for a WRITER)', computePnl(stored), -69600);
eq('same record as the trade actually taken (BUYER)', computePnl({ ...stored, dir: 'long' }), 69600);
eq('SL 177 below entry 230 with dir "short" is flagged as a contradiction', conflict(stored), true);

console.log('\n══ Invariant: SL side must match direction ══');
eq('buyer, SL below entry → ok', conflict({ seg: 'options', dir: 'long', en: 230, sl: 177 }), false);
eq('writer, SL above entry → ok', conflict({ seg: 'options', dir: 'short', en: 230, sl: 300 }), false);
eq('buyer, SL above entry → conflict', conflict({ seg: 'options', dir: 'long', en: 230, sl: 260 }), true);
eq('futures short, SL below → conflict', conflict({ seg: 'futures', dir: 'short', en: 24500, sl: 24400 }), true);
eq('crypto long, SL above → conflict', conflict({ seg: 'crypto', dir: 'long', en: 60000, sl: 61000 }), true);
eq('cash never checked (direction not used in cash P&L)', conflict({ seg: 'cash', dir: 'short', en: 100, sl: 90 }), false);
eq('no SL → cannot check → no conflict', conflict({ seg: 'options', dir: 'short', en: 230, sl: '' }), false);
eq('SL equal to entry → no conflict', conflict({ seg: 'options', dir: 'short', en: 230, sl: 230 }), false);
eq('direction missing → no conflict here (caught by required-direction rule)', conflict({ seg: 'options', dir: '', en: 230, sl: 177 }), false);

console.log('\n══ Journal HTML: capture UI ══');
const html = fs.readFileSync(new URL('../src/journal-content.html', import.meta.url), 'utf8');
const fnSrc = (name) => {
  const i = html.indexOf(`function ${name}(`);
  if (i < 0) return null;
  let depth = 0, j = html.indexOf('{', i);
  for (let k = j; k < html.length; k++) { if (html[k] === '{') depth++; else if (html[k] === '}') { depth--; if (depth === 0) return html.slice(i, k + 1); } }
  return null;
};
eq('inline directionConflict exists in the journal', fnSrc('directionConflict') !== null, true);
eq('close sheet no longer renders Bought/Sold chips for a trade that already has a direction',
  /TS2_TRADE\s*&&\s*TS2_TRADE\.dir/.test(fnSrc('segChipsHtmlInline') || ''), true);
eq('saveOpenTrade path validates direction conflict', /directionConflict\(/.test(fnSrc('validateTrade') || ''), true);
eq('closeTradeFinish refuses to save a contradictory trade', /directionConflict\(/.test(fnSrc('closeTradeFinish') || ''), true);
eq('options chip labels say who went first (no bare "Sold")', !/\['Bought','Sold'\]/.test(fnSrc('dirLabels') || ''), true);

eq('an untouched auto-filled amount is re-computed when direction/prices change (no frozen LOSS sign)',
  /untouchedAuto/.test(fnSrc('recalcAuto') || '') && /TS2_AUTO=/.test(fnSrc('applyAutoPnl') || ''), true);

console.log('\n══ Sync: inline journal copies behave exactly like the module ══');
{
  const inline = fnSrc('directionConflict'), inlinePnl = fnSrc('computePnl'), inlineNum = fnSrc('num');
  if (!inline || !inlinePnl || !inlineNum) { eq('inline functions present for sync check', false, true); }
  else {
    const mk = new Function(`${inlineNum}\n${inlinePnl}\n${inline}\nreturn { computePnl, directionConflict };`)();
    let drift = 0;
    for (const seg of ['options', 'futures', 'crypto', 'cash']) for (const dir of ['long', 'short', '']) for (const sl of ['', 90, 100, 110]) for (const ex of [80, 120]) {
      const t = { seg, dir, en: 100, ex, sl, qty: 2, lotSize: 25 };
      if ((mk.directionConflict(t) === null) !== (directionConflict(t) === null) || mk.computePnl(t) !== computePnl(t)) drift++;
    }
    eq('96 input combinations: inline === module', drift, 0);
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
