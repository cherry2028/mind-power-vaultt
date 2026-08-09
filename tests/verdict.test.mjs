// Feature 2 — Strategy-vs-Psychology verdict engine.
// Mirrors computeVerdict() inlined in src/journal-content.html; keep in sync.
// The differentiator, so it is tested hard: the day-level rule-break join, the
// two-stage 12/20 gate, and the sign logic of all four verdict types.

function eodBrokeMap(EOD) {
  const m = {};
  for (const e of EOD) if (e.brokenRules && e.brokenRules.length) m[e.date] = true;
  return m;
}
function computeVerdict(TR, EOD) {
  const broke = eodBrokeMap(EOD);
  let totN = 0, discN = 0, discP = 0, discW = 0, brkN = 0, brkP = 0;
  for (const t of TR) {
    if (t.status !== 'closed') continue;
    totN++; const v = Number(t.pnl || 0);
    const disciplined = (t.pln === true) && !broke[t.date];
    if (disciplined) { discN++; discP += v; if (v > 0) discW++; }
    else { brkN++; brkP += v; }
  }
  let stage = null;
  if (totN >= 20 && discN >= 8) stage = 'confirmed';
  else if (totN >= 12 && discN >= 5) stage = 'early';
  if (!stage) return { stage: null, totN, discN };
  const discWin = discN ? Math.round(discW / discN * 100) : 0;
  let type;
  if (discP > 0) { type = (brkP < 0 && brkN >= 5) ? 'psychology' : 'ontrack'; }
  else { type = (brkP > 0) ? 'luck' : 'strategy'; }
  return { stage, type, totN, discN, discP, discWin, brkN, brkP };
}

let pass = 0, fail = 0;
const eq = (name, got, exp) => {
  const ok = got === exp; ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  → ${got}${ok ? '' : `  expected ${exp}`}`);
};

// Helpers to fabricate trade sets
const T = (pnl, pln, date, status = 'closed') => ({ pnl, pln, date, status });
const many = (n, pnl, pln, dateBase) => Array.from({ length: n }, (_, i) => T(pnl, pln, `${dateBase}${String(i + 1).padStart(2, '0')}`));

console.log('\n══ Gate: not enough data ══');
eq('6 trades → no verdict', computeVerdict(many(6, 500, true, '2026-08-'), []).stage, null);
eq('12 trades but only 4 disciplined → no verdict',
  computeVerdict([...many(4, 500, true, '2026-08-'), ...many(8, -100, false, '2026-09-')], []).stage, null);

console.log('\n══ Two-stage gate ══');
eq('12 closed / 5 disciplined → early',
  computeVerdict([...many(5, 500, true, '2026-08-'), ...many(7, -100, false, '2026-09-')], []).stage, 'early');
eq('20 closed / 8 disciplined → confirmed',
  computeVerdict([...many(8, 500, true, '2026-08-'), ...many(12, -100, false, '2026-09-')], []).stage, 'confirmed');

console.log('\n══ PSYCHOLOGY (discipline profits, breaks bleed, ≥5 broken) ══');
{
  const TR = [...many(8, 1000, true, '2026-08-'), ...many(6, -1500, false, '2026-09-')];
  const v = computeVerdict(TR, []);
  eq('type = psychology', v.type, 'psychology');
  eq('disc P&L positive', v.discP > 0, true);
  eq('broken P&L negative', v.brkP < 0, true);
}

console.log('\n══ STRATEGY (disciplined side itself loses) ══');
{
  const TR = [...many(8, -800, true, '2026-08-'), ...many(12, -200, false, '2026-09-')];
  const v = computeVerdict(TR, []);
  eq('type = strategy', v.type, 'strategy');
  eq('disc P&L negative', v.discP < 0, true);
}

console.log('\n══ LUCK WARNING (rules lose, impulse "wins") ══');
{
  const TR = [...many(8, -500, true, '2026-08-'), ...many(12, 400, false, '2026-09-')];
  const v = computeVerdict(TR, []);
  eq('type = luck', v.type, 'luck');
}

console.log('\n══ ON TRACK (both sides positive) ══');
{
  const TR = [...many(8, 1000, true, '2026-08-'), ...many(12, 300, false, '2026-09-')];
  const v = computeVerdict(TR, []);
  eq('type = ontrack', v.type, 'ontrack');
}

console.log('\n══ THE DAY-LEVEL JOIN (the subtle one) ══');
{
  // A PLANNED trade on a day a rule was ticked broken must count as BROKEN.
  const TR = [
    T(1000, true, '2026-08-01'),  // planned, but 08-01 had a rule break
    ...many(8, 1000, true, '2026-08-1'), // 8 clean planned days (10-17)
    ...many(6, -1500, false, '2026-09-'),
  ];
  const EOD = [{ date: '2026-08-01', brokenRules: [{ id: 1, text: 'SL rule' }] }];
  const v = computeVerdict(TR, EOD);
  // The 08-01 planned trade is pulled into the broken bucket by the EOD tick.
  eq('planned trade on a rule-break day → counted broken', v.brkN, 7);
  eq('disciplined count excludes it', v.discN, 8);
}

console.log('\n══ Open trades never counted ══');
eq('open trades excluded from totals',
  computeVerdict([...many(8, 500, true, '2026-08-'), ...many(12, 100, false, '2026-09-'), T(9999, true, '2026-10-01', 'open')], []).totN, 20);

console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
