// Legacy-safety + display tests for the segment-aware trade details.
// The critical guarantee: trades logged BEFORE this feature (no seg/strike/sl…)
// must still render exactly as before, and never produce "undefined" anywhere.
import { buildReportHtml } from '../src/utils/weeklyPdf.js';

let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) pass++; else { fail++; }
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond || !detail ? '' : '\n        ' + detail}`);
}

// A legacy trade (pre-feature) alongside each new segment type.
const trades = [
  { date: '2026-08-01', inst: 'NIFTY 24500 CE', dir: 'long', pln: true, emo: 'calm', pnl: 3750, status: 'closed' }, // LEGACY: no seg
  { date: '2026-08-01', inst: 'NIFTY 24500 CE', seg: 'options', optType: 'CE', dir: 'long', expiry: '2026-08-06',
    strike: '24500', en: '100', ex: '150', qty: '1', lotSize: '75', sl: '80', pln: true, emo: 'calm', pnl: 3750, status: 'closed' },
  { date: '2026-08-02', inst: 'BTC', seg: 'crypto', pair: 'BTC/USDT', mkt: 'perp', lev: '10', dir: 'short',
    en: '60000', ex: '58000', qty: '0.5', pln: true, emo: 'calm', pnl: 1000, status: 'closed' },
  { date: '2026-08-03', inst: 'RELIANCE', seg: 'cash', dir: 'long', en: '100', ex: '110', qty: '50',
    sl: '95', tgt: '115', pln: false, emo: 'fomo', pnl: 500, status: 'closed' },
  { date: '2026-08-04', inst: 'NIFTY FUT', seg: 'futures', dir: 'short', en: '24500', ex: '24400', qty: '1',
    lotSize: '75', sl: '24550', tgt: '24300', pln: true, emo: 'calm', pnl: 7500, status: 'open' },
];

const html = buildReportHtml({
  studentName: 'Test Student', weekStart: '2026-08-01', weekEnd: '2026-08-07',
  identity: 'Disciplined', streak: 5, discipline: 80,
  stats: { totalTrades: 5, pnl: 16500, winRate: 100, disciplinePct: 80, mistakeCost: 0, disciplineEarned: 16500, plannedCount: 4 },
  trades, eods: [], mistakes: {}, rules: [],
});

console.log('\n══ Legacy safety ══');
check('no "undefined" leaks into the report', !/undefined/.test(html),
  (html.match(/.{40}undefined.{40}/) || [])[0]);
check('no "null" leaks into the report', !/>\s*null\s*</.test(html));
check('legacy trade (no seg) still renders its instrument', html.includes('NIFTY 24500 CE'));
check('legacy trade shows an em-dash detail, not blank/undefined', html.includes('>—<'));

console.log('\n══ New detail rendering ══');
check('options: strike + CE shown', html.includes('24500 CE'));
check('options: expiry shown', html.includes('exp 2026-08-06'));
check('options: premium move + lots(lotSize)', html.includes('100→150 ×1(75)'));
check('options: SL shown', html.includes('SL 80'));
check('crypto: pair + perp + leverage', html.includes('BTC/USDT perp 10×'));
check('cash: SL and target shown', html.includes('SL 95') && html.includes('T 115'));
check('futures: segment tag shown', html.includes('FUT'));

console.log('\n══ Direction labels (options = BOUGHT/SOLD, others = LONG/SHORT) ══');
check('options long renders BOUGHT', html.includes('BOUGHT'));
check('crypto short renders SHORT', html.includes('SHORT'));
check('legacy trade keeps plain LONG', html.includes('LONG'));

console.log('\n══ Existing columns intact ══');
check('Details column header added', html.includes('>Details<'));
check('P&L still rendered', html.includes('+₹3,750'));
check('open trade still shows OPEN', html.includes('OPEN'));

console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
