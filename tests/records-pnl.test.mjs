// Feature 1 — P&L in Records. Mirrors the pnlByDate / pnlTotals / running-total
// logic inlined in src/journal-content.html; keep both in sync.
// Guarantees: OPEN trades excluded, same-day trades summed, planned/impulse
// split correct, running total cumulative by date.

function pnlByDate(TR) {
  const m = {};
  for (const t of TR) {
    if (t.status !== 'closed') continue;
    const d = t.date || '';
    if (!d) continue;
    m[d] = (m[d] || 0) + Number(t.pnl || 0);
  }
  return m;
}
function pnlTotals(TR) {
  let tot = 0, pl = 0, im = 0;
  for (const t of TR) {
    if (t.status !== 'closed') continue;
    const v = Number(t.pnl || 0);
    tot += v; if (t.pln) pl += v; else im += v;
  }
  return { tot, planned: pl, impulse: im };
}
function runningTo(pbd, date) {
  let r = 0;
  for (const d in pbd) if (d <= date) r += pbd[d];
  return r;
}

let pass = 0, fail = 0;
const eq = (name, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  → ${JSON.stringify(got)}${ok ? '' : `  expected ${JSON.stringify(exp)}`}`);
};

const TR = [
  { date: '2026-08-01', pnl: 3750, pln: true, status: 'closed' },
  { date: '2026-08-01', pnl: -1200, pln: false, status: 'closed' }, // same day, impulse
  { date: '2026-08-02', pnl: 2000, pln: true, status: 'closed' },
  { date: '2026-08-03', pnl: -500, pln: false, status: 'closed' },
  { date: '2026-08-04', pnl: 9999, pln: true, status: 'open' },     // OPEN — excluded
];
const pbd = pnlByDate(TR), tot = pnlTotals(TR);

eq('Aug01 day P&L (3750-1200)', pbd['2026-08-01'], 2550);
eq('Aug02 day P&L', pbd['2026-08-02'], 2000);
eq('open trade excluded from any day', pbd['2026-08-04'], undefined);
eq('running @ Aug01', runningTo(pbd, '2026-08-01'), 2550);
eq('running @ Aug02', runningTo(pbd, '2026-08-02'), 4550);
eq('running @ Aug03 (final total)', runningTo(pbd, '2026-08-03'), 4050);
eq('total P&L (open excluded)', tot.tot, 4050);
eq('planned P&L (3750+2000)', tot.planned, 5750);
eq('impulse P&L (-1200-500)', tot.impulse, -1700);
eq('planned+impulse === total', tot.planned + tot.impulse, tot.tot);

console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
