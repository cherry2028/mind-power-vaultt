// F1 — how few trades produced the profit, and what the rest contributed.
import { sumPnl } from './gates.js';

export const MIN_N = 40;

export function concentration(trades) {
  const N = trades.length;
  if (N < MIN_N) return { skipped: { id: 'F1', reason: 'min_n', n: N, min: MIN_N } };
  const k = Math.max(3, Math.ceil(0.05 * N));
  const sorted = trades.slice().sort((a, b) => b.pnlPaise - a.pnlPaise);
  const A = sumPnl(sorted.slice(0, k));
  const B = sumPnl(sorted.slice(k));
  if (!(A > 0 && B < 0)) return { skipped: { id: 'F1', reason: 'no_pattern', n: N } };
  return {
    finding: {
      id: 'F1', kind: 'concentration', leakEligible: false,
      impactPaise: -B, n: N,
      data: { N, k, topPaise: A, restPaise: B },
    },
  };
}
