// F2 — P&L per instrument (underlying + product class).
import { sumPnl, groupBy, whyNot } from './gates.js';

export const MIN_N = 10;
const MAX_ROWS = 5;

export function instrument(trades, totalLossPaise) {
  const groups = groupBy(trades, (t) => t.instrument);
  const eligible = [...groups.entries()].filter(([, ts]) => ts.length >= MIN_N);
  if (!eligible.length) {
    const biggest = Math.max(0, ...[...groups.values()].map((g) => g.length));
    return { skipped: { id: 'F2', reason: 'min_n', n: biggest, min: MIN_N } };
  }

  const leaks = eligible
    .filter(([, ts]) => whyNot(ts, MIN_N, totalLossPaise) === null)
    .map(([label, ts]) => ({ label, n: ts.length, netPaise: sumPnl(ts) }))
    .sort((a, b) => a.netPaise - b.netPaise || b.n - a.n);

  if (!leaks.length) {
    const reasons = eligible.map(([, ts]) => whyNot(ts, MIN_N, totalLossPaise));
    const reason = reasons.includes('one_trade') ? 'one_trade' : reasons.includes('too_small') ? 'too_small' : 'no_pattern';
    return { skipped: { id: 'F2', reason, n: eligible.length } };
  }

  const net = sumPnl(trades);
  const top = leaks[0];
  const without = net - top.netPaise;
  return {
    finding: {
      id: 'F2', kind: 'instrument', leakEligible: true,
      impactPaise: -top.netPaise, n: top.n,
      subject: { label: top.label, n: top.n, netPaise: top.netPaise },
      data: {
        rows: leaks.slice(0, MAX_ROWS),
        // counterfactual fact about the past — only when it flips the sign
        withoutPaise: net < 0 && without > 0 ? without : null,
        otherInstruments: groups.size - 1,
      },
    },
  };
}
