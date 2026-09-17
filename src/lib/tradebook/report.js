// Files in → ReportModel out. Pure data; copy.te.js turns it into words.
import { parseCsv } from './csv.js';
import { detect } from './detect.js';
import { normalize, dedupe } from './normalize.js';
import { pairFills } from './fifo.js';
import { monthsElapsed } from './time.js';
import { MIN_TRADES_FOR_FINDINGS, sumPnl, totalLosses } from './findings/gates.js';
import { concentration } from './findings/concentration.js';
import { instrument } from './findings/instrument.js';
import { timeOfDay } from './findings/timeOfDay.js';
import { size } from './findings/size.js';

export const MAX_BAD_ROW_SHARE = 0.2;

// First bytes → a file type we can name instead of failing to parse.
export function sniffBinary(bytes) {
  if (!bytes || bytes.length < 4) return null;
  const b = bytes;
  if (b[0] === 0x50 && b[1] === 0x4b) return 'xlsx';                                   // PK zip
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return 'pdf';  // %PDF
  if (b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0) return 'xls';  // OLE
  return null;
}

/**
 * @param files [{ name, text }]  (binary files are rejected by the page before this)
 * @returns { ok: true, model } | { ok: false, failure }
 */
export function analyze(files) {
  const fills = [], perFile = [];
  let rowErrors = [], dayFirstAmbiguous = false, fractionalQty = 0;

  for (let i = 0; i < files.length; i++) {
    const { name, text } = files[i];
    const rows = parseCsv(text);
    if (!rows.length || rows.every((r) => r.every((c) => c === ''))) {
      return { ok: false, failure: { file: name, reason: 'empty', found: [], missing: [] } };
    }
    const det = detect(rows);
    if (!det.ok) return { ok: false, failure: { file: name, ...det } };

    const n = normalize(rows, det, i);
    if (n.dataRows && n.rowErrors.length / n.dataRows > MAX_BAD_ROW_SHARE) {
      return {
        ok: false,
        failure: { file: name, reason: 'bad_rows', found: det.found, missing: [], badRows: n.rowErrors.length, dataRows: n.dataRows, sampleRows: n.rowErrors.slice(0, 5) },
      };
    }
    fills.push(...n.fills);
    rowErrors = rowErrors.concat(n.rowErrors.map((e) => ({ ...e, file: name })));
    dayFirstAmbiguous = dayFirstAmbiguous || n.dayFirstAmbiguous;
    fractionalQty += n.fractionalQty;
    perFile.push({ name, broker: det.broker, mapped: det.mapped, dataRows: n.dataRows, fills: n.fills.length });
  }

  const { fills: unique, dupes } = dedupe(fills);
  const paired = pairFills(unique);
  return { ok: true, model: buildModel({ perFile, unique, dupes, paired, rowErrors, dayFirstAmbiguous, fractionalQty }) };
}

export function buildModel({ perFile, unique, dupes, paired, rowErrors, dayFirstAmbiguous, fractionalQty }) {
  const trades = paired.episodes;
  const dates = unique.map((f) => f.date).sort();
  const from = dates[0] || null, to = dates[dates.length - 1] || null;
  const timeCoverage = unique.length ? unique.filter((f) => f.sec !== null).length / unique.length : 0;
  const N = trades.length;
  const lossPaise = totalLosses(trades);

  const expiredOptions = paired.openPositions.filter((p) => p.cls === 'OPT' && p.expiryDate && to && p.expiryDate <= to);
  const brokers = [...new Set(perFile.map((f) => f.broker))];

  const model = {
    files: perFile,
    broker: brokers.length === 1 ? brokers[0] : 'mixed',
    fillsIn: unique.length + dupes,
    dupes,
    fills: unique.length,
    rowErrors,
    dayFirstAmbiguous,
    fractionalQty,
    from, to,
    months: from ? monthsElapsed(from, to) : 0,
    timeCoverage,
    matchedLots: paired.matchedLots.length,
    realizedPaise: paired.realizedPaise,          // every matched lot — what a broker calls realised P&L
    closedNetPaise: sumPnl(trades),                // closed round trips only — what the findings use
    N,
    wins: trades.filter((t) => t.pnlPaise > 0).length,
    losses: trades.filter((t) => t.pnlPaise < 0).length,
    shorts: trades.filter((t) => t.dir === 'short').length,
    open: {
      count: paired.openPositions.length,
      partialRealizedPaise: paired.openPositions.reduce((s, p) => s + p.partialRealizedPaise, 0),
      expiredOptions: expiredOptions.length,
      expiredOptionsCostPaise: expiredOptions.filter((p) => p.dir === 'long').reduce((s, p) => s + p.costPaise, 0),
    },
    unmatchedCloses: paired.unmatchedCloses.length,
    belowMin: N < MIN_TRADES_FOR_FINDINGS,
    minTrades: MIN_TRADES_FOR_FINDINGS,
    findings: [],
    skipped: [],
    biggestLeak: null,
  };

  if (model.belowMin) return model;

  const results = [
    concentration(trades),
    instrument(trades, lossPaise),
    timeOfDay(trades, lossPaise, timeCoverage),
    size(trades, lossPaise),
  ];
  for (const r of results) {
    if (r.finding) model.findings.push(r.finding);
    else model.skipped.push(r.skipped);
  }
  // Ranked by rupee impact; ties → the larger sample. Subsets overlap, so
  // findings are never added together anywhere.
  model.findings.sort((a, b) => b.impactPaise - a.impactPaise || b.n - a.n);
  const leak = model.findings.find((f) => f.leakEligible);
  model.biggestLeak = leak ? { id: leak.id, ...leak.subject, impactPaise: leak.impactPaise } : null;
  return model;
}
