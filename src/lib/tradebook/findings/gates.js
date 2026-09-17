// Shared evidence gates. Every finding goes through the same three, so no
// finding can be "supported" by a looser standard than another.
// Constants are fixed before any data is seen — never tuned per file.

export const MIN_TRADES_FOR_FINDINGS = 20;
export const SHARE_FLOOR_PAISE = 100000;   // ₹1,000
export const SHARE_OF_LOSSES = 0.05;       // 5% of all losing trades' losses

export const sumPnl = (trades) => trades.reduce((s, t) => s + t.pnlPaise, 0);

export function median(nums) {
  if (!nums.length) return null;
  const a = nums.slice().sort((x, y) => x - y);
  const mid = a.length >> 1;
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}

// Loss, and still a loss with its single worst trade removed: one disaster
// trade cannot make a pattern on its own.
export function leakTest(trades) {
  if (trades.length < 2) return false;
  const net = sumPnl(trades);
  if (net >= 0) return false;
  const worst = Math.min(...trades.map((t) => t.pnlPaise));
  return net - worst < 0;
}

// Big enough to be worth a line: at least ₹1,000 and 5% of all losses.
export function shareGate(netPaise, totalLossPaise) {
  return Math.abs(netPaise) >= Math.max(SHARE_FLOOR_PAISE, SHARE_OF_LOSSES * totalLossPaise);
}

export const totalLosses = (trades) => trades.reduce((s, t) => s + (t.pnlPaise < 0 ? -t.pnlPaise : 0), 0);

// Group → { n, netPaise, wins } with a stable key order.
export function groupBy(trades, keyFn) {
  const m = new Map();
  for (const t of trades) {
    const k = keyFn(t);
    if (k === null || k === undefined) continue;
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(t);
  }
  return m;
}

// Why a candidate subset did not become a finding — in gate order.
export function whyNot(trades, minN, totalLossPaise) {
  if (trades.length < minN) return 'min_n';
  if (sumPnl(trades) >= 0) return 'no_loss';
  if (!leakTest(trades)) return 'one_trade';
  if (!shareGate(sumPnl(trades), totalLossPaise)) return 'too_small';
  return null;
}
