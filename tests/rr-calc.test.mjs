// R:R (risk-reward) calculator. Mirrors computeRR() inlined in
// src/journal-content.html. Uses the entry/SL/target already captured; risk =
// |entry-SL|, reward = |target-entry| (direction-agnostic). Poor R:R = ratio < 1.5.

function computeRR(t) {
  if (!t) return null;
  const en = parseFloat(t.en), sl = parseFloat(t.sl), tg = parseFloat(t.tgt);
  if (!isFinite(en) || !isFinite(sl) || !isFinite(tg)) return null;
  const risk = Math.abs(en - sl), reward = Math.abs(tg - en);
  if (risk <= 0) return null;
  return reward / risk;
}
const POOR = 1.5;

let pass = 0, fail = 0;
const near = (a, b) => (a === null ? b === null : (b !== null && Math.abs(a - b) < 0.02));
const eq = (name, got, exp) => {
  const ok = near(got, exp); ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  → ${got === null ? 'null' : got.toFixed(2)}`);
};

console.log('\n══ Ratio math (long, short, futures) ══');
eq('LONG 1:2 (en100 sl95 tg110)', computeRR({ en: 100, sl: 95, tgt: 110 }), 2);
eq('SHORT 1:2 (en100 sl105 tg90)', computeRR({ en: 100, sl: 105, tgt: 90 }), 2);
eq('LONG 1:1 (en100 sl90 tg110)', computeRR({ en: 100, sl: 90, tgt: 110 }), 1);
eq('Futures 1:3 (en24500 sl24450 tg24650)', computeRR({ en: 24500, sl: 24450, tgt: 24650 }), 3);

console.log('\n══ Poor-R:R flag (< 1:1.5) ══');
const poor = (t) => { const r = computeRR(t); return r !== null && r < POOR; };
eq('1:1.2 value', computeRR({ en: 100, sl: 90, tgt: 112 }), 1.2);
console.log(`${poor({ en: 100, sl: 90, tgt: 112 }) ? 'PASS' : 'FAIL'}  1:1.2 → flagged poor`); poor({ en: 100, sl: 90, tgt: 112 }) ? pass++ : fail++;
console.log(`${!poor({ en: 100, sl: 95, tgt: 110 }) ? 'PASS' : 'FAIL'}  1:2 → NOT flagged`); !poor({ en: 100, sl: 95, tgt: 110 }) ? pass++ : fail++;
console.log(`${!poor({ en: 100, sl: 90, tgt: 115 }) ? 'PASS' : 'FAIL'}  1:1.5 exactly → NOT flagged (boundary)`); !poor({ en: 100, sl: 90, tgt: 115 }) ? pass++ : fail++;

console.log('\n══ Silent when data is missing (never guesses) ══');
eq('Options (SL, no target) → null', computeRR({ en: 100, sl: 95 }), null);
eq('Crypto (no SL/target) → null', computeRR({ en: 60000, ex: 62000 }), null);
eq('Legacy trade (no fields) → null', computeRR({ en: '', sl: '', tgt: '' }), null);
eq('Zero risk (SL == entry) → null', computeRR({ en: 100, sl: 100, tgt: 110 }), null);

console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
