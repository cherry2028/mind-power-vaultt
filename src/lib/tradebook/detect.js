// rows[][] → where the header is, what each column means, which broker wrote
// it, and — when it can't be read — exactly what was found and what is missing.

import { normHeader, SYNONYMS, REQUIRED, BROKERS, WRONG_REPORTS } from './brokers.js';

const SCAN_ROWS = 40; // brokers put name / client-ID preamble above the header

// Map one header row to canonical fields. Exact synonym match only — a loose
// "contains" match would read "Buy Value" as a price.
export function mapHeader(cells) {
  const norm = cells.map(normHeader);
  const mapping = {};
  for (const [field, syns] of Object.entries(SYNONYMS)) {
    // first synonym in priority order wins; each column is used once
    for (const syn of syns) {
      const idx = norm.findIndex((h, i) => h === syn && !Object.values(mapping).includes(i));
      if (idx !== -1) { mapping[field] = idx; break; }
    }
  }
  // A combined date-time column also satisfies the date requirement.
  if (mapping.date === undefined && mapping.datetime !== undefined) mapping.date = mapping.datetime;
  return { mapping, norm };
}

function requiredHits(mapping) {
  return REQUIRED.filter((f) => mapping[f] !== undefined).length;
}

export function detect(rows) {
  let best = null;
  const limit = Math.min(rows.length, SCAN_ROWS);
  for (let r = 0; r < limit; r++) {
    const cells = rows[r];
    if (!cells || cells.filter((c) => c !== '').length < 2) continue;
    const { mapping, norm } = mapHeader(cells);

    for (const w of WRONG_REPORTS) {
      if (w.has.every((h) => norm.includes(h)) && mapping.side === undefined) {
        return { ok: false, reason: 'wrong_report', reportType: w.type, reportTe: w.te, found: cells.filter(Boolean), missing: [] };
      }
    }

    const hits = requiredHits(mapping);
    if (!best || hits > best.hits) best = { r, cells, norm, mapping, hits };
    if (hits === REQUIRED.length) break;
  }

  if (!best || best.hits < 3) {
    // Show the row that looked most like a header, so the trader sees their own columns.
    return {
      ok: false, reason: 'no_header',
      found: best ? best.cells.filter(Boolean) : (rows[0] || []).filter(Boolean),
      missing: best ? REQUIRED.filter((f) => best.mapping[f] === undefined) : REQUIRED.slice(),
    };
  }
  const missing = REQUIRED.filter((f) => best.mapping[f] === undefined);
  if (missing.length) {
    return { ok: false, reason: 'missing_columns', found: best.cells.filter(Boolean), missing };
  }

  let broker = 'generic';
  for (const [id, b] of Object.entries(BROKERS)) {
    if (b.verified && b.fingerprint && b.fingerprint.every((h) => best.norm.includes(h))) { broker = id; break; }
  }
  return {
    ok: true, broker, headerRow: best.r, mapping: best.mapping,
    found: best.cells.filter(Boolean),
    // human-readable "column → field" list, for the verification report
    mapped: Object.fromEntries(Object.entries(best.mapping).map(([f, i]) => [f, best.cells[i]])),
  };
}
