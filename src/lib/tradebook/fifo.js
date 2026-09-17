// ★ THE lot matcher. The only FIFO implementation in this codebase — broker
// sync and anything else that pairs fills must import this, not re-derive it.
// Pure, dependency-free, no DOM: runs in the browser, in node tests, in Deno.
//
// Fill[] (from normalize.js) → matched lots, closed position episodes, open
// positions, and closes that had nothing to close.
//
// Rules (TRADEBOOK-AUTOPSY-ARCHITECTURE.md §3.2):
//  1. Position key = ISIN when present, else segment-class + symbol. The ISIN is
//     the security itself: LIQUIDBEES bought on NSE (series EQ) and sold on BSE
//     (group F) is one holding in one demat, so it is one position.
//  2. Fills are processed in time order; ties keep file row order.
//  3. A fill in the position's direction (or from flat) opens a lot.
//     An opposite fill consumes lots oldest-first; every consumption is one
//     matched lot. Partial fills fall out of this naturally.
//  4. Flip: an opposite fill larger than the open lots closes the episode and
//     opens a new one in the other direction with the remainder.
//  5. Long/short is inferred from the fill that takes the key off flat.
//  6. Equity shorts are intraday only. An EQ short still open when a later
//     date arrives (or the file ends) was a sale of shares bought before the
//     file started — those quantities become unmatchedCloses, not a short.
//  7. Money in integer paise. P&L gross, before charges.

const EPS = 1e-9;

export function positionKey(f) {
  if (f.isin) return `ISIN:${f.isin}`;
  const venue = f.cls === 'EQ' ? 'EQ' : (f.exchange || f.cls);
  return `${venue}|${f.symbol}`;
}

export function sortFills(fills) {
  return fills
    .map((f, i) => ({ f, i }))
    .sort((a, b) => a.f.ord - b.f.ord || a.f.fileIndex - b.f.fileIndex || a.f.rowNo - b.f.rowNo || a.i - b.i)
    .map((x) => x.f);
}

const dirOf = (side) => (side === 'buy' ? 'long' : 'short');

export function pairFills(inputFills) {
  const fills = sortFills(inputFills);
  const state = new Map();
  const episodes = [], matchedLots = [], unmatchedCloses = [];
  let episodeSeq = 0, eqShortsReclassified = 0;

  function newEpisode(key, f, dir) {
    return {
      id: ++episodeSeq, key, dir,
      symbol: f.symbol, underlying: f.underlying, cls: f.cls, optType: f.optType, expiryDate: f.expiryDate,
      entryDate: f.date, entrySec: f.sec, entryOrd: f.ord,
      exitDate: null, exitSec: null, exitOrd: null,
      openQty: 0, sizePaise: 0, pnlPaise: 0, fills: 1,
      matched: [], carryInQty: 0,
    };
  }

  function closeEpisode(st, f) {
    const e = st.episode;
    if (f) { e.exitDate = f.date; e.exitSec = f.sec; e.exitOrd = f.ord; }
    episodes.push(finalizeEpisode(e));
    st.episode = null; st.dir = null;
  }

  // Rule 6. `beforeDate` = the date of the fill about to be processed, or null at file end.
  function settleEquityShorts(st, beforeDate) {
    if (st.dir !== 'short' || !st.episode || st.episode.cls !== 'EQ') return;
    const stale = st.lots.filter((l) => beforeDate === null || l.date < beforeDate);
    if (!stale.length) return;
    st.lots = st.lots.filter((l) => !stale.includes(l));
    for (const l of stale) {
      unmatchedCloses.push({ key: st.episode.key, symbol: st.episode.symbol, qty: l.qty, date: l.date, reason: 'eq_sell_without_buy' });
      st.episode.carryInQty += l.qty;
      st.episode.openQty -= l.qty;
      st.episode.sizePaise -= l.qty * l.pricePaise;
      eqShortsReclassified++;
    }
    if (st.lots.length) return;
    const e = st.episode;
    if (e.matched.length) {
      // the covered part was a real intraday short; the rest was a holding sale
      const last = e.matched[e.matched.length - 1];
      st.episode.exitDate = last.closeDate; st.episode.exitSec = last.closeSec; st.episode.exitOrd = last.closeOrd;
      closeEpisode(st, null);
    } else {
      st.episode = null; st.dir = null;
    }
  }

  for (const f of fills) {
    const key = positionKey(f);
    let st = state.get(key);
    if (!st) { st = { lots: [], dir: null, episode: null }; state.set(key, st); }

    settleEquityShorts(st, f.date);

    const fdir = dirOf(f.side);
    let remaining = f.qty;

    if (st.lots.length && st.dir !== fdir) {
      st.episode.fills++;
      while (remaining > EPS && st.lots.length) {
        const lot = st.lots[0];
        const q = Math.min(lot.qty, remaining);
        const sign = st.dir === 'long' ? 1 : -1;
        const m = {
          key, episodeId: st.episode.id, dir: st.dir, qty: q,
          openPaise: lot.pricePaise, closePaise: f.pricePaise,
          openDate: lot.date, openSec: lot.sec, openOrd: lot.ord,
          closeDate: f.date, closeSec: f.sec, closeOrd: f.ord,
          pnlPaise: (f.pricePaise - lot.pricePaise) * q * sign,
        };
        matchedLots.push(m);
        st.episode.matched.push(m);
        lot.qty -= q; remaining -= q;
        if (lot.qty <= EPS) st.lots.shift();
      }
      if (!st.lots.length) closeEpisode(st, f);
    }

    if (remaining > EPS) {
      if (!st.episode) { st.episode = newEpisode(key, f, fdir); st.dir = fdir; }
      else st.episode.fills++;
      st.lots.push({ qty: remaining, pricePaise: f.pricePaise, date: f.date, sec: f.sec, ord: f.ord });
      st.episode.openQty += remaining;
      st.episode.sizePaise += remaining * f.pricePaise;
    }
  }

  const openPositions = [];
  for (const st of state.values()) {
    settleEquityShorts(st, null);
    if (!st.episode) continue;
    const e = st.episode;
    const qty = st.lots.reduce((s, l) => s + l.qty, 0);
    openPositions.push({
      key: e.key, symbol: e.symbol, underlying: e.underlying, cls: e.cls, dir: e.dir, expiryDate: e.expiryDate,
      qty, costPaise: st.lots.reduce((s, l) => s + l.qty * l.pricePaise, 0),
      partialRealizedPaise: e.matched.reduce((s, m) => s + m.pnlPaise, 0),
      entryDate: e.entryDate,
    });
  }

  const realizedPaise = matchedLots.reduce((s, m) => s + m.pnlPaise, 0);
  return { episodes, matchedLots, openPositions, unmatchedCloses, realizedPaise, eqShortsReclassified, fillsProcessed: fills.length };
}

function finalizeEpisode(e) {
  const pnlPaise = e.matched.reduce((s, m) => s + m.pnlPaise, 0);
  let holdSec = null;
  if (e.matched.length && e.matched.every((m) => m.openSec !== null && m.closeSec !== null)) {
    const q = e.matched.reduce((s, m) => s + m.qty, 0);
    holdSec = e.matched.reduce((s, m) => s + m.qty * (m.closeOrd - m.openOrd), 0) / q;
  }
  const intraday = e.entryDate === e.exitDate;
  let productClass;
  if (e.cls === 'EQ') productClass = intraday ? 'EQ-intraday' : 'EQ-delivery';
  else if (e.cls === 'OPT') productClass = e.dir === 'long' ? 'OPT-long' : 'OPT-short';
  else productClass = e.cls;
  const { matched, ...rest } = e;
  return {
    ...rest,
    closedQty: matched.reduce((s, m) => s + m.qty, 0),
    pnlPaise, holdSec, intraday, productClass,
    instrument: instrumentLabel(e.underlying || e.symbol, productClass),
    lots: matched.length,
  };
}

export function instrumentLabel(underlying, productClass) {
  switch (productClass) {
    case 'EQ-intraday': return `${underlying} (intraday)`;
    case 'EQ-delivery': return `${underlying} (delivery)`;
    case 'OPT-long': return `${underlying} options (buy)`;
    case 'OPT-short': return `${underlying} options (sell)`;
    case 'FUT': return `${underlying} futures`;
    case 'COMM': return `${underlying} (MCX)`;
    case 'CDS': return `${underlying} (currency)`;
    default: return underlying;
  }
}
