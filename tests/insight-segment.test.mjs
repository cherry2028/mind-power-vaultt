// Insight engine — segment loss-clustering. Mirrors the logic added to
// buildInsight() in src/journal-content.html: which segment (and specifically
// weekly-expiry options) is bleeding the account.

function segmentInsights(T) {
  const out = [];
  const segLoss = {}; let segTot = 0, optWk = 0, optMo = 0, optWkN = 0;
  for (const t of T) {
    const pn = Number(t.pnl || 0);
    if (pn >= 0 || !t.seg) continue;
    const L = -pn;
    segLoss[t.seg] = (segLoss[t.seg] || 0) + L; segTot += L;
    if (t.seg === 'options' && t.expiry && t.date) {
      const dd = (new Date(t.expiry) - new Date(t.date)) / 86400000;
      if (isFinite(dd)) { if (dd <= 8) { optWk += L; optWkN++; } else optMo += L; }
    }
  }
  if (optWkN >= 3 && optWk > optMo * 1.5 && optWk > 0) out.push({ id: 'options-weekly-expiry', optWk });
  if (segTot > 0) {
    let mxSeg = '', mxV = 0;
    for (const s in segLoss) if (segLoss[s] > mxV) { mxV = segLoss[s]; mxSeg = s; }
    if (mxSeg && mxV / segTot >= 0.6 && mxV > 0) out.push({ id: 'seg-loss-cluster', seg: mxSeg, pct: Math.round(mxV / segTot * 100) });
  }
  return out;
}

let pass = 0, fail = 0;
const has = (list, id) => list.some((x) => x.id === id);
const eq = (name, got, exp) => { const ok = got === exp; ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  → ${got}${ok ? '' : `  expected ${exp}`}`); };

// weekly-expiry option losses (expiry within a few days of entry)
const wk = (pnl, d, exp) => ({ pnl, seg: 'options', optType: 'CE', date: d, expiry: exp, status: 'closed' });

console.log('\n══ Weekly-expiry options clustering ══');
{
  const T = [
    wk(-1000, '2026-08-03', '2026-08-06'),   // 3 days → weekly
    wk(-1200, '2026-08-10', '2026-08-13'),   // weekly
    wk(-800, '2026-08-17', '2026-08-20'),    // weekly
    wk(500, '2026-08-24', '2026-08-27'),     // a win, ignored
    wk(-300, '2026-08-01', '2026-08-27'),    // 26 days → monthly
  ];
  const ins = segmentInsights(T);
  eq('fires weekly-expiry insight', has(ins, 'options-weekly-expiry'), true);
  eq('sums only the weekly losses (3000)', ins.find((x) => x.id === 'options-weekly-expiry').optWk, 3000);
}

console.log('\n══ Monthly-heavy options do NOT trigger the weekly flag ══');
{
  const T = [
    wk(-1000, '2026-08-01', '2026-08-28'),
    wk(-1000, '2026-08-02', '2026-08-28'),
    wk(-1000, '2026-08-03', '2026-08-28'),
  ];
  eq('no weekly-expiry flag when expiries are far', has(segmentInsights(T), 'options-weekly-expiry'), false);
}

console.log('\n══ General segment clustering ══');
{
  const T = [
    { pnl: -2000, seg: 'crypto', date: '2026-08-01', status: 'closed' },
    { pnl: -1500, seg: 'crypto', date: '2026-08-02', status: 'closed' },
    { pnl: -500, seg: 'cash', date: '2026-08-03', status: 'closed' },
    { pnl: 3000, seg: 'crypto', date: '2026-08-04', status: 'closed' }, // win ignored
  ];
  const ins = segmentInsights(T);
  const c = ins.find((x) => x.id === 'seg-loss-cluster');
  eq('flags the dominant losing segment', c && c.seg, 'crypto');
  eq('87% of losses from crypto (3500/4000)', c && c.pct, 88);
}

console.log('\n══ No segment data → no segment insight (graceful) ══');
eq('legacy trades without seg produce nothing',
  segmentInsights([{ pnl: -1000, date: '2026-08-01', status: 'closed' }]).length, 0);

console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
