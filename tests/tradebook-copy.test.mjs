// Tradebook Autopsy — writing rules. RUNS INSIDE `npm run build` (package.json):
// a failure here fails the Vercel build. It does not warn.
//
//  1. Banned vocabulary appears nowhere in the Autopsy source — copy, UI,
//     comments, identifiers — and nowhere in any rendered sentence.
//  2. Finding sentences carry no advice and no imperative.
//  3. Every finding sentence and the leak line contain a number.
//  4. No adjectives doing the work.
//  5. Findings are never summed into one figure.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as copy from '../src/lib/tradebook/copy.te.js';
import { buildModel } from '../src/lib/tradebook/report.js';
import { BROKERS } from '../src/lib/tradebook/brokers.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCAN_DIRS = ['src/lib/tradebook', 'src/pages/autopsy'];

// English stems match at a word start; Telugu matches anywhere.
export const BANNED = [
  /\bdisciplin/i, /\bpsycholog/i, /\bemotion/i, /\brevenge/i,
  /\bfear/i, /\bgreed/i, /\bfomo\b/i, /\bimpuls/i, /\btilt(ed)?\b/i,
  /క్రమశిక్షణ/, /మనస్తత్వ/, /మానసిక/, /భావోద్వేగ/, /ప్రతీకార/, /కసి/, /భయం/, /అత్యాశ/,
  /డిసిప్లిన్/, /సైకాలజ/, /ఎమోషన్/, /రివెంజ్/,
];
const ADVICE = [
  /\bshould\b/i, /\bavoid/i, /\bstop\b/i, /\bdon'?t\b/i, /\bmust\b/i, /\btry\b/i, /\brecommend/i, /\bconsider\b/i, /\bbetter\b/i,
  /చేయాలి/, /చేయకండి/, /మానేయ/, /ఆపండి/, /ఆపేయ/, /తప్పించ/, /ప్రయత్నించ/, /మంచిది/, /వద్దు/,
];
const IMPERATIVE_TE = /[ఀ-౿]ండి(?![ఀ-౿])/; // "…ండి" verb ending
const ADJECTIVES = [/\bhuge\b/i, /\bterrible\b/i, /\bbad\b/i, /\bbig\b/i, /\bdangerous\b/i, /\bshocking\b/i, /\bmassive\b/i, /భారీ/, /దారుణ/, /భయంకర/, /చాలా/, /ఘోర/];

let pass = 0, fail = 0;
function check(name, ok, detail = '') {
  if (ok) pass++; else fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  ← ${detail}`}`);
}
const hits = (text, list) => list.filter((re) => re.test(text)).map(String);

// ── 1. static scan of every source file ──
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? walk(p) : /\.(js|jsx|mjs|css|json)$/.test(d.name) ? [p] : [];
  });
}
console.log('\n══ Banned vocabulary in source ══');
for (const dir of SCAN_DIRS) {
  for (const file of walk(path.join(root, dir))) {
    const text = fs.readFileSync(file, 'utf8');
    const bad = [];
    text.split('\n').forEach((line, i) => { const h = hits(line, BANNED); if (h.length) bad.push(`line ${i + 1}: ${h.join(' ')}`); });
    check(path.relative(root, file), bad.length === 0, bad.join('; '));
  }
}

// ── rendered copy across representative models ──
const T = (pnl, o = {}) => ({ pnlPaise: Math.round(pnl * 100), instrument: o.instrument || 'RELIANCE (intraday)', productClass: o.productClass || 'EQ-intraday', entrySec: o.entrySec ?? 11 * 3600, sizePaise: (o.size || 10000) * 100, dir: 'long' });
const rep = (n, fn) => Array.from({ length: n }, (_, i) => fn(i));
const model = (episodes, extra = {}) => buildModel({
  perFile: [{ broker: 'zerodha' }],
  unique: [{ date: '2024-01-01', sec: 1 }, { date: '2024-06-30', sec: extra.noTime ? null : 1 }],
  dupes: extra.dupes || 0,
  paired: { episodes, matchedLots: [], openPositions: extra.open || [], unmatchedCloses: extra.unmatched || [], realizedPaise: episodes.reduce((s, t) => s + t.pnlPaise, 0) },
  rowErrors: extra.rowErrors || [], dayFirstAmbiguous: Boolean(extra.amb), fractionalQty: 0,
});

const models = {
  everyFinding: model([
    ...rep(12, (i) => T(-2500, { instrument: 'BANKNIFTY options (buy)', productClass: 'OPT-long', entrySec: 9 * 3600 + 20 * 60, size: 90000 + i })),
    ...rep(20, (i) => T(-400, { instrument: 'NIFTY options (buy)', productClass: 'OPT-long', entrySec: 10 * 3600, size: 80000 + i })),
    ...rep(4, () => T(8000, { instrument: 'NIFTY options (buy)', productClass: 'OPT-long', entrySec: 13 * 3600, size: 1000 })),
    ...rep(20, () => T(150, { instrument: 'NIFTY options (buy)', productClass: 'OPT-long', entrySec: 14 * 3600, size: 1000 })),
  ], { open: [{ cls: 'OPT', dir: 'long', expiryDate: '2024-06-01', partialRealizedPaise: 4800, costPaise: 90000 }], unmatched: [{}], dupes: 3, rowErrors: [{ row: 7 }], amb: true }),
  profitableNoLeak: model(rep(45, (i) => T(i % 3 ? 500 : -200))),
  noTime: model(rep(30, () => T(-100)), { noTime: true }),
  small: model(rep(7, () => T(-100))),
  empty: model([]),
};

const findingLines = [], otherLines = [];
for (const [name, m] of Object.entries(models)) {
  for (const f of m.findings) {
    findingLines.push(...copy.findingSentences(f).map((s) => [name, s]));
    otherLines.push([name, copy.FINDING_TITLE[f.id]], ...copy.findingTable(f).map((r) => [name, r.join(' ')]));
  }
  if (m.biggestLeak) findingLines.push([name, copy.leakLine(m.biggestLeak)]);
  otherLines.push(...m.skipped.map((s) => [name, copy.skippedLine(s)]));
  otherLines.push(...copy.coverageLines(m).map((l) => [name, l]));
  otherLines.push([name, copy.headerLine(m)], [name, copy.statsLine(m)], [name, copy.smallSampleLine(m)]);
}
for (const reason of ['min_n', 'no_time', 'one_trade', 'too_small', 'no_pattern']) {
  for (const id of ['F1', 'F2', 'F3', 'F5']) otherLines.push(['skip', copy.skippedLine({ id, reason, n: 5, min: 10 })]);
}
for (const reason of ['binary_xlsx', 'binary_pdf', 'wrong_report', 'empty', 'bad_rows', 'no_header', 'missing_columns', 'engine_error']) {
  const c = copy.failureCopy({ file: 'x.csv', reason, reportTe: 'P&L statement', dataRows: 10, badRows: 5, sampleRows: [{ row: 2 }] });
  otherLines.push(['failure', c.head], ['failure', c.body]);
}
const chrome = [
  ...Object.values(copy.PAGE).flat(), ...Object.values(copy.REPORT).filter((v) => typeof v === 'string'),
  ...Object.values(copy.FAILURE).filter((v) => typeof v === 'string'), ...Object.values(copy.FAILURE.requiredLabels),
  ...Object.keys(BROKERS).concat('other').flatMap((b) => copy.brokerSteps(b).steps),
].map((s) => ['chrome', s]);
otherLines.push(...chrome);

console.log('\n══ Coverage of the fixtures ══');
check('fixture produces all four phase-1 findings', ['F1', 'F2', 'F3', 'F5'].every((id) => models.everyFinding.findings.some((f) => f.id === id)), JSON.stringify(models.everyFinding.findings.map((f) => f.id)));
check('fixture produces the "without X" counterfactual line', findingLines.some(([, s]) => s.includes('లేకుండా')), 'missing');

console.log('\n══ Rendered: banned vocabulary ══');
{
  const bad = [...findingLines, ...otherLines].filter(([, s]) => hits(s, BANNED).length);
  check(`${findingLines.length + otherLines.length} rendered lines, none banned`, bad.length === 0, bad.map(([m, s]) => `[${m}] ${s}`).join(' | '));
}

console.log('\n══ Finding sentences: no advice, no imperative, a number each ══');
{
  const advice = findingLines.filter(([, s]) => hits(s, ADVICE).length || IMPERATIVE_TE.test(s));
  check(`${findingLines.length} finding sentences free of advice/imperatives`, advice.length === 0, advice.map(([m, s]) => `[${m}] ${s}`).join(' | '));
  const noNumber = findingLines.filter(([, s]) => !/\d/.test(s));
  check('every finding sentence contains a number', noNumber.length === 0, noNumber.map(([m, s]) => `[${m}] ${s}`).join(' | '));
  const skipAdvice = otherLines.filter(([m, s]) => m !== 'chrome' && m !== 'failure' && hits(s, ADVICE).length);
  check('skipped / coverage / header lines free of advice words', skipAdvice.length === 0, skipAdvice.map(([m, s]) => `[${m}] ${s}`).join(' | '));
}

console.log('\n══ No adjectives doing the work ══');
{
  const adj = [...findingLines, ...otherLines].filter(([, s]) => hits(s, ADJECTIVES).length);
  check('no blacklisted adjectives', adj.length === 0, adj.map(([m, s]) => `[${m}] ${s}`).join(' | '));
}

console.log('\n══ Findings never summed ══');
{
  const m = models.everyFinding;
  const total = m.findings.reduce((s, f) => s + f.impactPaise, 0);
  const shown = copy.rs(-total), shownAbs = copy.rs(total, { sign: false });
  const summed = [...findingLines, ...otherLines].filter(([, s]) => s.includes(shown) || s.includes(shownAbs));
  check('sum of all finding impacts appears nowhere', summed.length === 0, summed.map(([, s]) => s).join(' | '));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
