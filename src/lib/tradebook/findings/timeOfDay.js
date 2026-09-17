// F3 — P&L by the IST clock time the position was opened.
import { sumPnl, whyNot } from './gates.js';

export const MIN_N = 10;
export const MIN_TIME_COVERAGE = 0.9;

const H = (h, m) => h * 3600 + m * 60;
// Fixed edges. Never searched for the worst window.
export const BUCKETS = [
  { id: 'pre',   label: '09:15 ముందు',  from: 0,          to: H(9, 15) },
  { id: 'open',  label: '09:15–09:30', from: H(9, 15),   to: H(9, 30) },
  { id: 'early', label: '09:30–10:30', from: H(9, 30),   to: H(10, 30) },
  { id: 'mid',   label: '10:30–12:00', from: H(10, 30),  to: H(12, 0) },
  { id: 'noon',  label: '12:00–13:30', from: H(12, 0),   to: H(13, 30) },
  { id: 'late',  label: '13:30–15:30', from: H(13, 30),  to: H(15, 30) + 1 },
  { id: 'eve',   label: '15:30 తర్వాత', from: H(15, 30) + 1, to: 86400 },
];

export const bucketOf = (sec) => BUCKETS.find((b) => sec >= b.from && sec < b.to);

export function timeOfDay(trades, totalLossPaise, timeCoverage) {
  if (timeCoverage < MIN_TIME_COVERAGE) return { skipped: { id: 'F3', reason: 'no_time' } };

  const rows = BUCKETS.map((b) => {
    const ts = trades.filter((t) => t.entrySec !== null && bucketOf(t.entrySec) === b);
    return { id: b.id, label: b.label, trades: ts, n: ts.length, netPaise: sumPnl(ts) };
  }).filter((r) => r.n > 0);

  const eligible = rows.filter((r) => r.n >= MIN_N);
  if (!eligible.length) {
    return { skipped: { id: 'F3', reason: 'min_n', n: Math.max(0, ...rows.map((r) => r.n)), min: MIN_N } };
  }
  const leaks = eligible.filter((r) => whyNot(r.trades, MIN_N, totalLossPaise) === null)
    .sort((a, b) => a.netPaise - b.netPaise || b.n - a.n);
  const strip = (r) => ({ id: r.id, label: r.label, n: r.n, netPaise: r.netPaise });

  if (!leaks.length) {
    const reasons = eligible.map((r) => whyNot(r.trades, MIN_N, totalLossPaise));
    const reason = reasons.includes('one_trade') ? 'one_trade' : reasons.includes('too_small') ? 'too_small' : 'no_pattern';
    return { skipped: { id: 'F3', reason, n: eligible.length } };
  }
  const top = leaks[0];
  const rest = trades.filter((t) => !top.trades.includes(t));
  return {
    finding: {
      id: 'F3', kind: 'timeOfDay', leakEligible: true,
      impactPaise: -top.netPaise, n: top.n,
      subject: { label: top.label, n: top.n, netPaise: top.netPaise },
      data: {
        restN: rest.length, restPaise: sumPnl(rest),
        // the open bucket first, then clock order; only buckets with enough trades
        rows: eligible.map(strip).sort((a, b) => (a.id === 'open' ? -1 : b.id === 'open' ? 1 : 0)),
      },
    },
  };
}
