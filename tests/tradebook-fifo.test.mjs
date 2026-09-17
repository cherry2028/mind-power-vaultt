// Tradebook Autopsy — FIFO engine (src/lib/tradebook/fifo.js), the only lot
// matcher in the codebase. Fixture is synthetic but reproduces the exact edge
// cases of a real Zerodha equity tradebook (sell-first intraday short, one ISIN
// traded on NSE and BSE under different series, six-decimal float prices).
import fs from 'node:fs';
import { parseCsv } from '../src/lib/tradebook/csv.js';
import { detect } from '../src/lib/tradebook/detect.js';
import { normalize, dedupe, toPaise, snapQty } from '../src/lib/tradebook/normalize.js';
import { pairFills } from '../src/lib/tradebook/fifo.js';

let pass = 0, fail = 0;
function eq(name, got, expected) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  if (ok) pass++; else fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  → ${JSON.stringify(got)}${ok ? '' : `  (expected ${JSON.stringify(expected)})`}`);
}

// Build a fill directly (engine-level cases).
let seq = 0;
function F(symbol, side, qty, price, date, clock = '10:00:00', extra = {}) {
  const [h, m, s] = clock.split(':').map(Number);
  const [y, mo, d] = date.split('-').map(Number);
  const sec = h * 3600 + m * 60 + s;
  return {
    symbol, isin: extra.isin || '', exchange: extra.exchange || 'NSE', segment: extra.segment || 'EQ',
    side, qty, pricePaise: toPaise(price), date, sec,
    ord: Math.floor(Date.UTC(y, mo - 1, d) / 86400000) * 86400 + sec,
    tradeId: String(++seq), orderId: '', cls: extra.cls || 'EQ', underlying: symbol, optType: null, expiryDate: extra.expiryDate || null,
    fileIndex: 0, rowNo: seq,
  };
}

console.log('\n══ Real-file edge cases (synthetic Zerodha EQ fixture) ══');
const text = fs.readFileSync(new URL('./fixtures/tradebook/zerodha-eq-synthetic.csv', import.meta.url), 'utf8');
const rows = parseCsv(text);
const det = detect(rows);
eq('detected as zerodha', det.broker, 'zerodha');
const norm = normalize(rows, det, 0);
eq('11 fills, 0 row errors', [norm.fills.length, norm.rowErrors.length], [11, 0]);
const r = pairFills(norm.fills);

const alpha = r.episodes.find((e) => e.symbol === 'ALPHACO');
eq('first trade (sell 561 → buy 565) is a SHORT', alpha.dir, 'short');
eq('…and a LOSS of ₹400, not a profit', alpha.pnlPaise, -40000);
eq('…intraday', alpha.productClass, 'EQ-intraday');

const liquid = r.episodes.filter((e) => e.symbol === 'LIQUIDETF');
eq('same ISIN on NSE (EQ) + BSE (F) pairs as ONE position', liquid.length, 1);
eq('…49 × (1000.00 − 1000.01) = −₹0.49 (six-decimal price snapped to paise)', liquid[0].pnlPaise, -49);
eq('…no unmatched LIQUIDETF sells left behind', r.unmatchedCloses.filter((u) => u.symbol === 'LIQUIDETF').length, 0);

const beta = r.episodes.find((e) => e.symbol === 'BETAIND');
eq('43.700001 / 43.849998 → 500 × ₹0.15 = ₹75 exactly', beta.pnlPaise, 7500);

const gamma = r.openPositions.find((p) => p.symbol === 'GAMMALTD');
eq('partial exit: 19 shares still open', gamma.qty, 19);
eq('…81 × ₹6 already realised', gamma.partialRealizedPaise, 48600);

eq('DELTAHLD sell with no buy in file → unmatched close, not a trade, not open', [r.unmatchedCloses.map((u) => u.symbol), r.episodes.some((e) => e.symbol === 'DELTAHLD'), r.openPositions.some((p) => p.symbol === 'DELTAHLD')], [['DELTAHLD'], false, false]);

eq('realised = closed trades + partial exits', r.realizedPaise, -40000 - 49 + 7500 + 48600);

console.log('\n══ Precision ══');
eq('toPaise(1000.010010)', toPaise(1000.01001), 100001);
eq('toPaise(43.700001)', toPaise(43.700001), 4370);
eq('snapQty(100.000000)', snapQty(100.000000), 100);
eq('snapQty(0.5) keeps fractions', snapQty(0.5), 0.5);

console.log('\n══ Engine rules ══');
{
  const x = pairFills([F('X', 'buy', 100, 10, '2024-01-01', '09:20:00'), F('X', 'sell', 30, 11, '2024-01-01', '09:30:00'), F('X', 'sell', 70, 12, '2024-01-01', '09:40:00')]);
  eq('scale-out: 2 closing fills → ONE trade', x.episodes.length, 1);
  eq('…P&L 30×1 + 70×2 = ₹170', x.episodes[0].pnlPaise, 17000);
  eq('…qty-weighted hold (30×10m + 70×20m)/100 = 17 min', x.episodes[0].holdSec / 60, 17);
}
{
  const x = pairFills([F('X', 'buy', 10, 100, '2024-01-01', '09:20:00'), F('X', 'buy', 10, 110, '2024-01-01', '09:21:00'), F('X', 'sell', 15, 120, '2024-01-01', '09:30:00'), F('X', 'sell', 5, 90, '2024-01-01', '09:31:00')]);
  eq('FIFO order: 10×(120−100) + 5×(120−110) + 5×(90−110) = 200+50−100', x.episodes[0].pnlPaise, 15000);
}
{
  const x = pairFills([F('NIFTYFUT', 'buy', 50, 100, '2024-01-01', '09:20:00', { cls: 'FUT', segment: 'FO' }), F('NIFTYFUT', 'sell', 75, 110, '2024-01-01', '10:00:00', { cls: 'FUT', segment: 'FO' }), F('NIFTYFUT', 'buy', 25, 105, '2024-01-01', '11:00:00', { cls: 'FUT', segment: 'FO' })]);
  eq('flip long 50 → sell 75 → two trades', x.episodes.map((e) => e.dir), ['long', 'short']);
  eq('…long 50×10 = ₹500, short 25×(110−105) = ₹125', x.episodes.map((e) => e.pnlPaise), [50000, 12500]);
}
{
  const x = pairFills([F('HOLD', 'sell', 40, 210, '2024-01-01', '10:00:00'), F('OTHER', 'buy', 1, 1, '2024-01-02', '10:00:00')]);
  eq('EQ sell never covered → unmatched close, no trade', [x.episodes.length, x.unmatchedCloses.length, x.openPositions.length], [0, 1, 1]);
}
{
  const x = pairFills([F('HOLD', 'sell', 40, 210, '2024-01-01', '10:00:00'), F('HOLD', 'buy', 40, 200, '2024-01-03', '10:00:00')]);
  eq('EQ sell, buy two days later → carry-in sale + new long (not a 2-day short)', [x.episodes.length, x.unmatchedCloses.length, x.openPositions[0].dir, x.openPositions[0].qty], [0, 1, 'long', 40]);
}
{
  const x = pairFills([F('BNFUT', 'sell', 25, 500, '2024-01-01', '10:00:00', { cls: 'FUT', segment: 'FO' }), F('BNFUT', 'buy', 25, 480, '2024-01-03', '10:00:00', { cls: 'FUT', segment: 'FO' })]);
  eq('F&O overnight short is a real short (+₹500)', [x.episodes[0].dir, x.episodes[0].pnlPaise], ['short', 50000]);
}
{
  const x = pairFills([F('OPT', 'buy', 50, 9, '2021-12-07', '09:39:01', { cls: 'OPT', segment: 'FO', expiryDate: '2021-12-09' })]);
  eq('option bought, never sold → open position with expiry, no P&L invented', [x.episodes.length, x.openPositions[0].expiryDate, x.realizedPaise], [0, '2021-12-09', 0]);
}

console.log('\n══ Dedupe ══');
{
  const a = F('D', 'buy', 1, 1, '2024-01-01'); const b = { ...a, fileIndex: 1 };
  eq('same trade_id in two files → counted once', dedupe([a, b]).dupes, 1);
  const c = { ...a, tradeId: '' }, d = { ...a, tradeId: '', rowNo: a.rowNo + 1 };
  eq('two identical rows WITHOUT id in one file → both kept', dedupe([c, d]).dupes, 0);
  eq('…same pair repeated in a second file → dropped', dedupe([c, d, { ...c, fileIndex: 1 }, { ...d, fileIndex: 1 }]).dupes, 2);
}

console.log('\n══ Invariant: flat keys realise Σsell − Σbuy, for 300 random books ══');
{
  let bad = 0;
  for (let t = 0; t < 300; t++) {
    const fills = [];
    let pos = 0, clock = 9 * 3600 + 900;
    const n = 2 + Math.floor(Math.random() * 20);
    for (let i = 0; i < n; i++) {
      const q = 1 + Math.floor(Math.random() * 50);
      const side = Math.random() < 0.5 ? 'buy' : 'sell';
      pos += side === 'buy' ? q : -q;
      clock += 30;
      const hh = String(Math.floor(clock / 3600)).padStart(2, '0'), mm = String(Math.floor(clock / 60) % 60).padStart(2, '0'), ss = String(clock % 60).padStart(2, '0');
      fills.push(F('R', side, q, 100 + Math.round(Math.random() * 1000) / 100, '2024-01-01', `${hh}:${mm}:${ss}`, { cls: 'FUT', segment: 'FO' }));
    }
    if (pos !== 0) { const side = pos > 0 ? 'sell' : 'buy'; fills.push(F('R', side, Math.abs(pos), 105, '2024-01-01', '15:00:00', { cls: 'FUT', segment: 'FO' })); }
    const cash = fills.reduce((s, f) => s + (f.side === 'sell' ? 1 : -1) * f.qty * f.pricePaise, 0);
    const res = pairFills(fills);
    if (res.realizedPaise !== cash || res.openPositions.length) bad++;
  }
  eq('random books: FIFO total === cash flow, nothing left open', bad, 0);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
