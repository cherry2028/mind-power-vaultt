// F5 — P&L when the position was larger than the trader's own median size,
// within one product class (option premium and futures notional don't compare).
import { sumPnl, median, whyNot } from './gates.js';

export const MIN_CLASS_N = 30;
export const MIN_SIDE_N = 15;

export const CLASS_LABEL_TE = {
  'EQ-intraday': 'Intraday equity',
  'EQ-delivery': 'Delivery equity',
  'OPT-long': 'Options buying',
  'OPT-short': 'Options selling',
  FUT: 'Futures',
  COMM: 'MCX',
  CDS: 'Currency',
};

const avgLoss = (ts) => {
  const l = ts.filter((t) => t.pnlPaise < 0);
  return l.length ? sumPnl(l) / l.length : null;
};

export function size(trades, totalLossPaise) {
  const classes = new Map();
  for (const t of trades) {
    if (!classes.has(t.productClass)) classes.set(t.productClass, []);
    classes.get(t.productClass).push(t);
  }

  const candidates = [];
  let best = 0, lastReason = 'min_n';
  for (const [cls, ts] of classes) {
    best = Math.max(best, ts.length);
    if (ts.length < MIN_CLASS_N) continue;
    const med = median(ts.map((t) => t.sizePaise));
    const above = ts.filter((t) => t.sizePaise > med);
    const atOrBelow = ts.filter((t) => t.sizePaise <= med);
    if (above.length < MIN_SIDE_N || atOrBelow.length < MIN_SIDE_N) { lastReason = 'min_n'; continue; }
    const why = whyNot(above, MIN_SIDE_N, totalLossPaise);
    if (why) { lastReason = why === 'no_loss' ? 'no_pattern' : why; continue; }
    candidates.push({
      cls, label: CLASS_LABEL_TE[cls] || cls, medianPaise: med,
      above: { n: above.length, netPaise: sumPnl(above), avgLossPaise: avgLoss(above) },
      atOrBelow: { n: atOrBelow.length, netPaise: sumPnl(atOrBelow), avgLossPaise: avgLoss(atOrBelow) },
    });
  }

  if (!candidates.length) {
    return { skipped: { id: 'F5', reason: lastReason, n: best, min: MIN_CLASS_N } };
  }
  candidates.sort((a, b) => a.above.netPaise - b.above.netPaise);
  const top = candidates[0];
  return {
    finding: {
      id: 'F5', kind: 'size', leakEligible: true,
      impactPaise: -top.above.netPaise, n: top.above.n,
      subject: { label: `${top.label}, median size కంటే పెద్ద positions`, n: top.above.n, netPaise: top.above.netPaise },
      data: top,
    },
  };
}
