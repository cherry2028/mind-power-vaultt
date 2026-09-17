// Every word the Autopsy page and report say. The ONLY file with report copy,
// so tests/tradebook-copy.test.mjs can hold all of it to the writing rules:
//   · none of the vocabulary banned in tests/tradebook-copy.test.mjs
//   · no advice, no "you should", nothing about what to trade next
//   · every finding sentence carries a number from the trader's own file
//   · no adjectives doing the work — the rupees do it

import { FIELD_LABEL_TE, BROKERS, GENERIC_STEPS } from './brokers.js';

const MINUS = '−';
const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const inr2 = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ₹ with Indian grouping. sign: '+'/'−' always shown.
export function rs(paise, { sign = true, exact = false } = {}) {
  const v = paise / 100;
  const body = (exact ? inr2 : inr).format(Math.abs(exact ? v : Math.round(v)));
  const s = !sign ? '' : v < 0 && (exact || Math.round(v) !== 0) ? MINUS : v > 0 ? '+' : '';
  // U+2060 WORD JOINER keeps a sign from wrapping away from its ₹ on narrow phones
  return `${s}${s ? '⁠' : ''}₹${body}`;
}
const n = (x) => inr.format(x);
const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);

const MONTH_TE = ['జనవరి', 'ఫిబ్రవరి', 'మార్చి', 'ఏప్రిల్', 'మే', 'జూన్', 'జూలై', 'ఆగస్టు', 'సెప్టెంబర్', 'అక్టోబర్', 'నవంబర్', 'డిసెంబర్'];
export function dateTe(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTH_TE[m - 1]} ${y}`;
}

// ───────────────────────── page chrome ─────────────────────────

export const PAGE = {
  seoTitle: 'Tradebook Autopsy — మీ trades లో డబ్బు ఎక్కడికి వెళ్ళింది | Mind Power Vaultt',
  seoDescription: 'మీ broker tradebook CSV ఇవ్వండి. Login లేదు, file మీ phone దాటి వెళ్ళదు. గత నెలల trades లో డబ్బు ఎక్కడ పోయిందో rupees లో.',
  title: 'Tradebook Autopsy',
  sub: 'గత నెలల trades లో డబ్బు ఎక్కడికి వెళ్ళిందో — rupees లో.',
  privacyHead: 'మీ file ఈ phone / computer దాటి బయటకు వెళ్ళదు.',
  privacyLines: [
    'లెక్కలన్నీ మీ browser లోనే జరుగుతాయి. ఏ server కీ పంపము.',
    'Login లేదు. Email అడగము. ఏదీ save చేయము.',
    'Page close చేస్తే report కూడా పోతుంది.',
  ],
  privacyProof: 'నమ్మకం కోసం: ఈ page open అయ్యాక internet off చేసి file ఇవ్వండి. Report అలాగే వస్తుంది.',
  choose: 'Tradebook file ఎంచుకోండి',
  chooseHint: 'CSV file. ఒకటి కంటే ఎక్కువ files ఒకేసారి ఎంచుకోవచ్చు (Equity + F&O, వేర్వేరు సంవత్సరాలు).',
  brokersLine: 'Zerodha · Angel One · Upstox · Dhan · Fyers · ఇతర CSV',
  howTo: 'Tradebook file ఎలా download చేయాలి?',
  reading: 'File చదువుతున్నాం… ఇది మీ phone లోనే జరుగుతోంది.',
  again: 'మరో file ఎంచుకోండి',
  exactLabel: 'Exact figure',
};

export function brokerSteps(id) {
  const b = BROKERS[id];
  return {
    name: b ? b.name : 'ఇతర broker',
    verified: Boolean(b && b.verified),
    steps: b && b.steps ? b.steps : GENERIC_STEPS,
  };
}

// ───────────────────────── failures ─────────────────────────

export function failureCopy(f) {
  const file = f.file ? `"${f.file}"` : 'ఈ file';
  switch (f.reason) {
    case 'binary_xlsx':
    case 'binary_xls':
      return { head: `${file} Excel file.`, body: 'ఈ page CSV మాత్రమే చదువుతుంది. Broker site లో tradebook ని CSV format లో download చేయండి.' };
    case 'binary_pdf':
      return { head: `${file} PDF file.`, body: 'PDF (contract note / statement) నుండి trades చదవలేము. Broker site లో tradebook ని CSV format లో download చేయండి.' };
    case 'wrong_report':
      return { head: `${file} ${f.reportTe} — tradebook కాదు.`, body: 'Autopsy కి ప్రతి buy, sell విడిగా ఉన్న tradebook కావాలి. అదే broker site లో Tradebook report ఉంటుంది.' };
    case 'empty':
      return { head: `${file} ఖాళీగా ఉంది.`, body: 'Download సమయంలో date range లో trades ఉన్నాయో చూడండి.' };
    case 'bad_rows':
      return {
        head: `${file} లో ${n(f.dataRows)} rows లో ${n(f.badRows)} rows చదవలేకపోయాం.`,
        body: `ఉదా: row ${f.sampleRows.map((r) => r.row).join(', ')}. File ని Excel లో open చేసి save చేస్తే format మారుతుంది — broker site నుండి మళ్ళీ download చేసిన file నేరుగా ఇవ్వండి.`,
      };
    case 'engine_error':
      return { head: `${file} చదువుతుండగా ఈ page లోనే లోపం వచ్చింది.`, body: 'ఇది మీ file తప్పు కాకపోవచ్చు. కింద ఉన్న diagnostic (column పేర్లు మాత్రమే) copy చేసి మాకు పంపితే సరిచేస్తాం.' };
    case 'no_header':
    case 'missing_columns':
    default:
      return {
        head: `${file} లో trades చదవడానికి కావలసిన columns అన్నీ దొరకలేదు.`,
        body: 'కింద ఈ file లో ఉన్న columns, ఇంకా కావలసినవి ఉన్నాయి.',
      };
  }
}

export const FAILURE = {
  foundHead: 'ఈ file లో దొరికిన columns',
  missingHead: 'కావలసినవి (దొరకనివి ఎరుపులో)',
  requiredLabels: FIELD_LABEL_TE,
  pickBroker: 'మీ broker ఏది?',
  unverified: 'ఈ broker file format ఇంకా మేము నేరుగా check చేయలేదు. సాధారణ steps:',
  diagnostic: 'Diagnostic copy చేయండి',
  diagnosticNote: 'Copy అయ్యేది column పేర్లు, row count మాత్రమే — మీ trades, prices కాదు.',
  copied: 'Copy అయింది',
};

// ───────────────────────── report ─────────────────────────

export function headerLine(m) {
  return `${dateTe(m.from)} – ${dateTe(m.to)} · ${n(m.N)} trades · ${n(m.months)} నెలలు · charges ముందు (gross)`;
}

export const REPORT = {
  netLabel: 'Realised P&L (FIFO)',
  leakLabel: 'అతిపెద్ద leak',
  basis: (k) => `ఆధారం: ${n(k)} trades`,
  skippedHead: 'ఈ file తో చూపలేని లెక్కలు',
  coverageHead: 'ఈ లెక్కలో ఏం ఉంది, ఏం లేదు',
  noLeak: 'ఈ file లో, ఒక్క trade వల్ల కాని, ₹1,000 దాటిన నష్టపు pattern కనిపించలేదు.',
  handoff: 'ఈ file డబ్బు ఎక్కడికి వెళ్ళిందో చెప్పింది. అదే trade ఎందుకు మళ్ళీ వస్తుందో చెప్పలేదు — దానికి రేపటి data కావాలి, నిన్నటిది కాదు.',
  handoffLink: 'Journal →',
  disclaimer: 'ఇది మీ file లోని గత trades యొక్క లెక్క మాత్రమే. ఏ instrument trade చేయాలో, ఎప్పుడు చేయాలో ఇది చెప్పదు. SEBI registered investment advice కాదు. Figures brokerage, taxes ముందు (gross). Mind Power Vaultt (ALR Services, GST: 37DLNPM0984C1ZU) — educational.',
  tableGroup: 'Group',
  tableTrades: 'Trades',
  tableNet: 'Net',
};

export function smallSampleLine(m) {
  if (m.N === 0) return 'ఈ file లో buy, sell రెండూ ఉన్న పూర్తి trade ఒక్కటీ లేదు. Positions ఇంకా open గా ఉన్నా, file లో ఒక వైపు మాత్రమే ఉన్నా ఇలా వస్తుంది.';
  return `${n(m.N)} పూర్తి trades మాత్రమే. Pattern లెక్కలకు కనీసం ${n(m.minTrades)} కావాలి — అందుకే ఇక్కడ మొత్తాలు మాత్రమే. ఎక్కువ నెలల files ఒకేసారి ఎంచుకోవచ్చు.`;
}

export function statsLine(m) {
  return `${n(m.N)} trades · ${n(m.wins)} profit · ${n(m.losses)} loss${m.shorts ? ` · ${n(m.shorts)} short` : ''}`;
}

export function leakLine(leak) {
  return `${leak.label} — ${n(leak.n)} trades, ${rs(leak.netPaise)}.`;
}

export const FINDING_TITLE = {
  F1: 'Profit ఏ trades నుండి వచ్చింది',
  F2: 'Instrument వారీగా',
  F3: 'Trade మొదలైన సమయం వారీగా (IST)',
  F5: 'Position size వారీగా',
};

// Fact sentences for one finding. Each must contain a number.
export function findingSentences(f) {
  const d = f.data;
  switch (f.id) {
    case 'F1':
      return [`${n(d.N)} trades లో ${n(d.k)} trades కలిపి ${rs(d.topPaise)}. మిగిలిన ${n(d.N - d.k)} trades కలిపి ${rs(d.restPaise)}.`];
    case 'F2': {
      const out = [`${f.subject.label}: ${n(f.subject.n)} trades, ${rs(f.subject.netPaise)}.`];
      if (d.withoutPaise !== null) out.push(`${f.subject.label} లేకుండా మిగతా trades మొత్తం: ${rs(d.withoutPaise)}.`);
      return out;
    }
    case 'F3':
      return [`${f.subject.label} మధ్య మొదలైన trades: ${n(f.subject.n)}, ${rs(f.subject.netPaise)}. మిగతా సమయాల్లో: ${n(d.restN)} trades, ${rs(d.restPaise)}.`];
    case 'F5': {
      const out = [`${d.label} లో median position size ${rs(d.medianPaise, { sign: false })}. దాని కంటే పెద్ద positions: ${n(d.above.n)} trades, ${rs(d.above.netPaise)}. Median లేదా తక్కువ: ${n(d.atOrBelow.n)} trades, ${rs(d.atOrBelow.netPaise)}.`];
      if (d.above.avgLossPaise !== null && d.atOrBelow.avgLossPaise !== null) {
        out.push(`ఒక్కో loss trade సగటు: పెద్ద positions ${rs(d.above.avgLossPaise)}, median లేదా తక్కువ ${rs(d.atOrBelow.avgLossPaise)}.`);
      }
      return out;
    }
    default:
      return [];
  }
}

// Table rows for one finding: [label, trades, net]
export function findingTable(f) {
  const d = f.data;
  switch (f.id) {
    case 'F2': return d.rows.map((r) => [r.label, n(r.n), rs(r.netPaise)]);
    case 'F3': return d.rows.map((r) => [r.label, n(r.n), rs(r.netPaise)]);
    case 'F5': return [
      [`Median (${rs(d.medianPaise, { sign: false })}) కంటే పెద్దవి`, n(d.above.n), rs(d.above.netPaise)],
      ['Median లేదా తక్కువ', n(d.atOrBelow.n), rs(d.atOrBelow.netPaise)],
    ];
    default: return [];
  }
}

const SKIP_NAME = { F1: 'Profit concentration', F2: 'Instrument వారీగా', F3: 'సమయం వారీగా', F5: 'Position size వారీగా' };

export function skippedLine(s) {
  const name = SKIP_NAME[s.id] || s.id;
  switch (s.reason) {
    case 'min_n': return `${name}: ఒక group లో గరిష్ఠంగా ${n(s.n)} trades. కనీసం ${n(s.min)} కావాలి — చూపడం లేదు.`;
    case 'no_time': return `${name}: ఈ file లో trade time column లేదు — చూపడం లేదు.`;
    case 'one_trade': return `${name}: నష్టం ఒక్క trade వల్లే — ఆ ఒక్కటి తీసేస్తే నష్టం లేదు. Pattern గా చూపడం లేదు.`;
    case 'too_small': return `${name}: నష్టం ₹1,000 లేదా మొత్తం losses లో 5% కంటే తక్కువ — చూపడం లేదు.`;
    case 'no_pattern':
    default: return `${name}: ${n(s.n || 0)} groups చూశాం. Pattern గా చూపదగిన నష్టం ఏ group లోనూ లేదు.`;
  }
}

export function coverageLines(m) {
  const out = [];
  out.push(`${n(m.fills)} fills (buy / sell rows) → FIFO pairing → ${n(m.N)} పూర్తి trades.`);
  if (m.dupes) out.push(`${n(m.dupes)} duplicate rows (రెండు files లో ఒకే trade) ఒక్కసారే లెక్కించాం.`);
  if (m.open.count) {
    out.push(`${n(m.open.count)} positions file చివరికి ఇంకా open. వాటి P&L లెక్కలో లేదు${m.open.partialRealizedPaise ? ` — కానీ వాటిలో ఇప్పటికే exit అయిన భాగం ${rs(m.open.partialRealizedPaise, { exact: true })} Realised P&L లో ఉంది` : ''}.`);
  }
  if (m.open.expiredOptions) {
    out.push(`${n(m.open.expiredOptions)} options positions కి expiry వరకు file లో exit లేదు${m.open.expiredOptionsCostPaise ? ` (కొన్న premium ${rs(m.open.expiredOptionsCostPaise, { sign: false })})` : ''}. వాటి ఫలితం file లో లేదు, లెక్కలో లేదు.`);
  }
  if (m.unmatchedCloses) out.push(`${n(m.unmatchedCloses)} sell fills కి ముందు buy ఈ file లో లేదు (file మొదలవక ముందే కొన్న shares). లెక్కలో లేవు.`);
  if (m.rowErrors.length) out.push(`${n(m.rowErrors.length)} rows చదవలేకపోయాం (row ${m.rowErrors.slice(0, 5).map((e) => e.row).join(', ')}). మిగతా rows తో లెక్క.`);
  if (m.dayFirstAmbiguous) out.push(`Dates ని రోజు/నెల/సంవత్సరం గా చదివాం. పైన ఉన్న date range సరిగ్గా ఉందో చూడండి.`);
  if (m.timeCoverage < 0.9) out.push(`${pct(Math.round(m.timeCoverage * m.fills), m.fills)}% rows కి మాత్రమే trade time ఉంది — సమయం లెక్కలు లేవు.`);
  out.push('Brokerage, STT, GST, stamp duty ఈ tradebook లో ఉండవు. అన్నీ gross figures.');
  return out;
}

