// Tradebook Autopsy — findings and their evidence gates.
import { leakTest, shareGate, median, whyNot } from '../src/lib/tradebook/findings/gates.js';
import { concentration } from '../src/lib/tradebook/findings/concentration.js';
import { instrument } from '../src/lib/tradebook/findings/instrument.js';
import { timeOfDay, bucketOf, sessionShare } from '../src/lib/tradebook/findings/timeOfDay.js';
import { size } from '../src/lib/tradebook/findings/size.js';
import { buildModel } from '../src/lib/tradebook/report.js';

let pass = 0, fail = 0;
function eq(name, got, expected) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  if (ok) pass++; else fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  → ${JSON.stringify(got)}${ok ? '' : `  (expected ${JSON.stringify(expected)})`}`);
}

// Minimal closed trade. pnl in rupees.
const T = (pnl, o = {}) => ({
  pnlPaise: Math.round(pnl * 100), instrument: o.instrument || 'X (intraday)', productClass: o.productClass || 'EQ-intraday',
  entrySec: o.entrySec === undefined ? 11 * 3600 : o.entrySec, sizePaise: (o.size || 10000) * 100, dir: 'long',
});
const rep = (n, fn) => Array.from({ length: n }, (_, i) => fn(i));

console.log('\n══ Gates ══');
eq('leakTest: one −₹5,000 trade among +₹100s is NOT a pattern', leakTest([T(-5000), T(100), T(100), T(100)]), false);
eq('leakTest: still negative without worst trade → pattern', leakTest([T(-5000), T(-300), T(-300), T(100)]), true);
eq('leakTest: a single trade never passes', leakTest([T(-5000)]), false);
eq('shareGate floor ₹1,000', [shareGate(-99900, 0), shareGate(-100000, 0)], [false, true]);
eq('shareGate 5% of all losses', [shareGate(-400000, 10000000), shareGate(-500000, 10000000)], [false, true]);
eq('median even/odd', [median([1, 3, 2]), median([1, 2, 3, 4])], [2, 2.5]);
eq('whyNot order: min_n first', whyNot([T(-5000)], 10, 0), 'min_n');

console.log('\n══ F1 concentration ══');
eq('N < 40 → skipped min_n', concentration(rep(39, () => T(10))).skipped.reason, 'min_n');
{
  const ts = [...rep(3, () => T(10000)), ...rep(37, () => T(-500))];
  const r = concentration(ts);
  eq('top 3 of 40 = +₹30,000, rest −₹18,500', [r.finding.data.k, r.finding.data.topPaise, r.finding.data.restPaise], [3, 3000000, -1850000]);
  eq('F1 is never the biggest-leak line', r.finding.leakEligible, false);
}

console.log('\n══ F2 instrument ══');
{
  const ts = [...rep(12, () => T(-800, { instrument: 'BANKNIFTY options (buy)' })), ...rep(30, () => T(400, { instrument: 'NIFTY options (buy)' }))];
  const r = instrument(ts, 12 * 80000);
  eq('leaking instrument found', [r.finding.subject.label, r.finding.subject.n, r.finding.subject.netPaise], ['BANKNIFTY options (buy)', 12, -960000]);
  eq('net is positive → no "without" line', r.finding.data.withoutPaise, null);
}
{
  const ts = [...rep(12, () => T(-2000, { instrument: 'A' })), ...rep(20, () => T(500, { instrument: 'B' }))];
  const r = instrument(ts, 12 * 200000);
  eq('net −₹14,000; without A = +₹10,000 → counterfactual shown', r.finding.data.withoutPaise, 1000000);
}
eq('9 trades per instrument → skipped min_n', instrument(rep(9, () => T(-2000, { instrument: 'A' })), 0).skipped.reason, 'min_n');

console.log('\n══ F3 time of day ══');
eq('bucket edges: 09:15:00 open, 09:29:59 open, 09:30:00 early, 15:30:00 late', [bucketOf(33300).id, bucketOf(34199).id, bucketOf(34200).id, bucketOf(55800).id], ['open', 'open', 'early', 'late']);
eq('no time column → skipped no_time', timeOfDay(rep(50, () => T(-1)), 0, 0.5).skipped.reason, 'no_time');

// The buckets are Indian equity session edges. A file from another market must
// never be printed under them — "09:15–09:30" over a venue with no 09:15 open.
eq('sessionShare: 09:00 and 15:40 are inside, 08:59 and 15:41 are not',
  [sessionShare([T(-1, { entrySec: 9 * 3600 })]), sessionShare([T(-1, { entrySec: 15 * 3600 + 40 * 60 })]),
   sessionShare([T(-1, { entrySec: 9 * 3600 - 1 })]), sessionShare([T(-1, { entrySec: 15 * 3600 + 40 * 60 + 1 })])],
  [1, 1, 0, 0]);
eq('sessionShare ignores trades with no time', sessionShare([T(-1, { entrySec: 11 * 3600 }), T(-1, { entrySec: null })]), 1);
{
  // MCX-shaped file: an evening commodity session, a real loss, enough trades.
  const mcx = [...rep(15, () => T(-700, { entrySec: 21 * 3600 })), ...rep(30, () => T(300, { entrySec: 19 * 3600 }))];
  const r = timeOfDay(mcx, 15 * 70000, 1);
  eq('non-session file → skipped, not bucketed', [r.finding, r.skipped.reason, Math.round(r.skipped.share * 100)], [undefined, 'not_indian_session', 0]);
}
{
  // 89% inside the session is still not enough; 90% is.
  const mk = (inside) => [...rep(inside, () => T(-700, { entrySec: 10 * 3600 })), ...rep(100 - inside, () => T(-700, { entrySec: 21 * 3600 }))];
  eq('89% inside → skipped, 90% inside → bucketed',
    [timeOfDay(mk(89), 100 * 70000, 1).skipped.reason, timeOfDay(mk(90), 100 * 70000, 1).finding.id],
    ['not_indian_session', 'F3']);
}
eq('an all-Indian-session file is unaffected by the guard',
  sessionShare([...rep(15, () => T(-700, { entrySec: 9 * 3600 + 20 * 60 })), ...rep(30, () => T(300, { entrySec: 13 * 3600 }))]), 1);
{
  const ts = [...rep(15, () => T(-700, { entrySec: 9 * 3600 + 20 * 60 })), ...rep(30, () => T(300, { entrySec: 13 * 3600 }))];
  const r = timeOfDay(ts, 15 * 70000, 1);
  eq('09:15–09:30 leak: 15 trades −₹10,500; rest 30 trades +₹9,000', [r.finding.subject.label, r.finding.subject.netPaise, r.finding.data.restN, r.finding.data.restPaise], ['09:15–09:30', -1050000, 30, 900000]);
}

console.log('\n══ F5 size ══');
{
  const ts = [...rep(20, (i) => T(-900, { size: 50000 + i })), ...rep(20, (i) => T(200, { size: 10000 + i }))];
  const r = size(ts, 20 * 90000);
  eq('above-median positions leak', [r.finding.data.above.n, r.finding.data.above.netPaise, r.finding.data.atOrBelow.n], [20, -1800000, 20]);
}
eq('class under 30 → skipped', size(rep(29, () => T(-100)), 0).skipped.reason, 'min_n');

console.log('\n══ Report model ══');
{
  const episodes = [...rep(15, () => T(-700, { entrySec: 9 * 3600 + 20 * 60, instrument: 'BN', size: 90000 })), ...rep(30, () => T(300, { entrySec: 13 * 3600, instrument: 'N', size: 1000 }))];
  const m = buildModel({ perFile: [{ broker: 'zerodha' }], unique: [{ date: '2024-01-01', sec: 1 }, { date: '2024-06-30', sec: 1 }], dupes: 0,
    paired: { episodes, matchedLots: [], openPositions: [], unmatchedCloses: [], realizedPaise: -150000 }, rowErrors: [], dayFirstAmbiguous: false, fractionalQty: 0 });
  eq('findings ranked by impact, descending', m.findings.map((f) => f.impactPaise), m.findings.map((f) => f.impactPaise).slice().sort((a, b) => b - a));
  eq('biggest leak is the largest leak-eligible finding', m.biggestLeak.impactPaise, Math.max(...m.findings.filter((f) => f.leakEligible).map((f) => f.impactPaise)));
}
{
  const m = buildModel({ perFile: [{ broker: 'zerodha' }], unique: [{ date: '2024-01-01', sec: 1 }], dupes: 0,
    paired: { episodes: rep(19, () => T(-900)), matchedLots: [], openPositions: [], unmatchedCloses: [], realizedPaise: 0 }, rowErrors: [], dayFirstAmbiguous: false, fractionalQty: 0 });
  eq('N = 19 → totals only, no findings, no leak line', [m.belowMin, m.findings.length, m.biggestLeak], [true, 0, null]);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
