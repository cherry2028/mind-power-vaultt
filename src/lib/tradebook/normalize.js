// Mapped rows → Fill[]. Money is held in integer PAISE and quantities are
// snapped to whole units, so FIFO sums never pick up float drift from exports
// like "43.700001" or "1000.010010".

import { parseDate, parseDateTime, parseTime, resolveDayFirst, dayNumber } from './time.js';
import { classify } from './symbols.js';

const cell = (row, idx) => (idx === undefined ? '' : String(row[idx] == null ? '' : row[idx]).trim());

function num(s) {
  const t = String(s).replace(/[,₹\s]/g, '');
  if (!/^[-+]?\d*\.?\d+(e[-+]?\d+)?$/i.test(t)) return null;
  const n = Number(t);
  return isFinite(n) ? n : null;
}

function side(s) {
  const t = String(s).trim().toLowerCase();
  if (/^(b|buy|bought|purchase)$/.test(t)) return 'buy';
  if (/^(s|sell|sold|sale)$/.test(t)) return 'sell';
  return null;
}

// Tick sizes are whole paise; anything past 2 decimals is export float noise.
export const toPaise = (price) => Math.round(price * 100);

// Snap to a whole unit when within 1e-6; otherwise keep 6 decimals.
export function snapQty(q) {
  const r = Math.round(q);
  return Math.abs(q - r) < 1e-6 ? r : Math.round(q * 1e6) / 1e6;
}

/**
 * @param rows      all rows of one file
 * @param det       result of detect() for that file
 * @param fileIndex position of the file in the selection (for stable ordering)
 */
export function normalize(rows, det, fileIndex = 0) {
  const map = det.mapping;
  const body = rows.slice(det.headerRow + 1);
  const dateCol = map.date;
  const { dayFirst, ambiguous } = resolveDayFirst(body.map((r) => cell(r, dateCol)));

  const fills = [], rowErrors = [];
  let fractionalQty = 0;

  body.forEach((row, i) => {
    const rowNo = det.headerRow + 2 + i; // 1-based line number as the trader sees it in Excel
    if (!row || row.every((c) => c === '')) return;

    const symbol = cell(row, map.symbol).toUpperCase();
    const s = side(cell(row, map.side));
    const q = num(cell(row, map.qty));
    const p = num(cell(row, map.price));
    const date = parseDate(cell(row, dateCol), dayFirst);

    let sec = null;
    if (map.datetime !== undefined) {
      const dt = parseDateTime(cell(row, map.datetime), dayFirst);
      if (dt.date === date || !date) sec = dt.sec;
    }
    if (sec === null && map.time !== undefined) sec = parseTime(cell(row, map.time));

    const reason = !symbol ? 'symbol' : !s ? 'side' : (q === null || q <= 0) ? 'qty' : (p === null || p < 0) ? 'price' : !date ? 'date' : null;
    if (reason) { rowErrors.push({ row: rowNo, reason }); return; }

    const qty = snapQty(q);
    if (!Number.isInteger(qty)) fractionalQty++;

    const exchange = cell(row, map.exchange).toUpperCase();
    const segment = cell(row, map.segment).toUpperCase();
    const isin = cell(row, map.isin).toUpperCase();
    const info = classify({ symbol, exchange, segment });

    let expiryDate = null;
    const expCell = cell(row, map.expiry);
    if (expCell) expiryDate = parseDate(expCell, dayFirst);
    if (!expiryDate && info.expiry && info.expiry.date) expiryDate = info.expiry.date;

    fills.push({
      symbol, isin, exchange, segment, series: cell(row, map.series),
      side: s, qty, pricePaise: toPaise(p),
      date, sec, // sec null when the file has no time
      ord: dayNumber(date) * 86400 + (sec === null ? 0 : sec),
      tradeId: cell(row, map.tradeId), orderId: cell(row, map.orderId),
      cls: info.cls, underlying: info.underlying, optType: info.optType, strike: info.strike, expiryDate,
      fileIndex, rowNo,
    });
  });

  return { fills, rowErrors, dayFirstAmbiguous: ambiguous && body.length > 0 && dateCol !== undefined, fractionalQty, dataRows: body.filter((r) => r && r.some((c) => c !== '')).length };
}

// Same fill exported twice (overlapping date ranges, the same file picked
// twice). Keyed on the exchange's own trade id when present. Without an id,
// two identical rows inside ONE file can be two real fills, so the key carries
// the occurrence number within its file: only a repeat across files is a dupe.
export function dedupe(fills) {
  const seen = new Set(), out = [], occurrences = new Map();
  let dupes = 0;
  for (const f of fills) {
    let k;
    if (f.tradeId) {
      k = `${f.exchange}|${f.tradeId}|${f.symbol}|${f.side}|${f.date}`;
    } else {
      const base = `${f.exchange}|${f.symbol}|${f.side}|${f.date}|${f.sec}|${f.qty}|${f.pricePaise}|${f.orderId}`;
      const occKey = `${f.fileIndex}|${base}`;
      const n = (occurrences.get(occKey) || 0) + 1;
      occurrences.set(occKey, n);
      k = `${base}#${n}`;
    }
    if (seen.has(k)) { dupes++; continue; }
    seen.add(k); out.push(f);
  }
  return { fills: out, dupes };
}
