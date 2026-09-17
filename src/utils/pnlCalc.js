// Auto-calculate a trade's P&L from its price details — correct across all four
// segments. Returns a rounded rupee/USDT number, or null when it CANNOT compute
// (no segment chosen, or a required price/qty missing) — in which case the
// caller keeps the manual LOSS−/PROFIT+ entry, so the fast quick-log path is
// untouched.
//
// Sign logic (the part that must be right):
//   • options / futures / crypto:  P&L = dirSign · (exit − entry) · qty
//       dirSign = −1 for a SHORT position (sold/wrote option, short future,
//       short perp), +1 for LONG. For OPTIONS, entry/exit are PREMIUMS and
//       CE/PE is informational only: a BUYER (long) profits when the premium
//       rises whether it is a call OR a put — only long-vs-short flips the sign.
//   • cash equity:  P&L = (sell − buy) · qty  — correct for both long and short
//       (the two legs are a buy and a sell), so direction is NOT applied.
//   • qty:  options/futures use lots × lotSize; cash uses shares; crypto uses
//       coins. Leverage changes margin, not notional P&L, so it is NOT used.
export function computePnl(t) {
  if (!t) return null;
  const seg = t.seg || '';
  if (!seg) return null; // no segment → quick-entry / legacy trade → manual P&L

  const en = parseFloat(t.en);
  const ex = parseFloat(t.ex);
  if (!isFinite(en) || !isFinite(ex)) return null;

  let qty;
  if (seg === 'options' || seg === 'futures') {
    const lots = parseFloat(t.qty);       // qty holds the lot COUNT here
    const lotSize = parseFloat(t.lotSize);
    if (!isFinite(lots) || !isFinite(lotSize)) return null;
    qty = lots * lotSize;
  } else {
    qty = parseFloat(t.qty);              // cash: shares · crypto: coins
  }
  if (!isFinite(qty) || qty <= 0) return null;

  // Cash's buy/sell already encode the P&L direction; every other segment
  // applies the long/short sign.
  const dirSign = seg === 'cash' ? 1 : (t.dir === 'short' ? -1 : 1);
  return Math.round(dirSign * (ex - en) * qty);
}

// A stop-loss sits below the entry for a long / options buyer and above it for a
// short / options writer. On the wrong side, the DIRECTION is what was mistyped:
// on 2026-09-17 an options buy (230 → 346, SL 177) was saved as "Sold" and the
// correct arithmetic for a writer showed −₹69,600 instead of +₹69,600.
// Returns null when consistent or uncheckable (cash, no SL, no direction),
// otherwise a short reason code. Inlined in src/journal-content.html (with
// Telugu messages); tests/direction.test.mjs runs both copies.
export function directionConflict(t) {
  if (!t || !t.seg || t.seg === 'cash') return null;
  if (t.dir !== 'long' && t.dir !== 'short') return null;
  const n = (v) => (v === null || v === undefined || v === '' ? null : (isFinite(Number(v)) ? Number(v) : null));
  const en = n(t.en), sl = n(t.sl);
  if (en === null || sl === null || sl === en) return null;
  if (t.dir === 'long' && sl > en) return 'long_sl_above_entry';
  if (t.dir === 'short' && sl < en) return 'short_sl_below_entry';
  return null;
}
