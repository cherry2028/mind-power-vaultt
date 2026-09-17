// Tradebook Autopsy — CSV reading, header detection, failure reasons.
import { parseCsv } from '../src/lib/tradebook/csv.js';
import { detect } from '../src/lib/tradebook/detect.js';
import { normalize } from '../src/lib/tradebook/normalize.js';
import { parseDate, resolveDayFirst, monthsElapsed, weekday } from '../src/lib/tradebook/time.js';
import { classify } from '../src/lib/tradebook/symbols.js';
import { analyze, sniffBinary } from '../src/lib/tradebook/report.js';

let pass = 0, fail = 0;
function eq(name, got, expected) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  if (ok) pass++; else fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  → ${JSON.stringify(got)}${ok ? '' : `  (expected ${JSON.stringify(expected)})`}`);
}

const ZEQ = 'symbol,isin,trade_date,exchange,segment,series,trade_type,auction,quantity,price,trade_id,order_id,order_execution_time';
const ZFO = ZEQ + ',expiry_date';

console.log('\n══ CSV ══');
eq('BOM + CRLF', parseCsv('﻿a,b\r\n1,2\r\n'), [['a', 'b'], ['1', '2']]);
eq('quoted comma + escaped quote', parseCsv('a,b\n"M&M, LTD","say ""hi"""\n'), [['a', 'b'], ['M&M, LTD', 'say "hi"']]);
eq('semicolon delimiter', parseCsv('a;b;c\n1;2;3'), [['a', 'b', 'c'], ['1', '2', '3']]);

console.log('\n══ Header detection ══');
{
  const d = detect(parseCsv(`${ZEQ}\nUPL,INE1,2021-01-28,NSE,EQ,EQ,sell,false,1,1,1,1,2021-01-28T09:54:15`));
  eq('Zerodha EQ → zerodha', [d.ok, d.broker], [true, 'zerodha']);
  eq('Zerodha mapping', d.mapped, { symbol: 'symbol', isin: 'isin', side: 'trade_type', qty: 'quantity', price: 'price', date: 'trade_date', datetime: 'order_execution_time', tradeId: 'trade_id', orderId: 'order_id', exchange: 'exchange', segment: 'segment', series: 'series' });
}
{
  const d = detect(parseCsv(`${ZFO}\nX,,2021-04-13,NSE,FO,,buy,false,25,646,1,1,2021-04-13T10:36:22,2021-04-22`));
  eq('Zerodha F&O (extra expiry_date) → zerodha + expiry mapped', [d.broker, d.mapped.expiry], ['zerodha', 'expiry_date']);
}
{
  const csv = 'Client ID,XY1234\nName,Someone\nReport,Trade Book\n\nTrade Date,Trade Time,Scrip Name,Buy/Sell,Qty,Trade Price,Exchange\n05/03/2024,09:16:02,RELIANCE,B,10,2900.5,NSE\n';
  const d = detect(parseCsv(csv));
  eq('preamble rows skipped; generic mapper finds header at row 5', [d.ok, d.broker, d.headerRow], [true, 'generic', 4]);
  const n = normalize(parseCsv(csv), d, 0);
  eq('…DD/MM date + separate time column', [n.fills[0].date, n.fills[0].sec, n.fills[0].side], ['2024-03-05', 9 * 3600 + 16 * 60 + 2, 'buy']);
  eq('…05/03 alone is ambiguous → flagged', n.dayFirstAmbiguous, true);
}
{
  const d = detect(parseCsv('Symbol,ISIN,Quantity,Buy Value,Sell Value,Realized P&L\nX,I,1,1,2,1\n'));
  eq('P&L statement → wrong_report', [d.ok, d.reason, d.reportType], [false, 'wrong_report', 'pnl']);
}
{
  const d = detect(parseCsv('Symbol,Quantity,Price,Date\nX,1,1,2024-01-01\n'));
  eq('no buy/sell column → missing_columns lists it', [d.ok, d.reason, d.missing], [false, 'missing_columns', ['side']]);
  eq('…and shows the columns that were found', d.found, ['Symbol', 'Quantity', 'Price', 'Date']);
}
eq('garbage → no_header', detect(parseCsv('hello world\nfoo\n')).reason, 'no_header');

console.log('\n══ Binary sniff ══');
eq('xlsx (PK)', sniffBinary(new Uint8Array([0x50, 0x4b, 3, 4])), 'xlsx');
eq('pdf', sniffBinary(new Uint8Array([0x25, 0x50, 0x44, 0x46])), 'pdf');
eq('csv text → null', sniffBinary(new TextEncoder().encode('symbol,isin')), null);

console.log('\n══ Dates / symbols ══');
eq('ISO', parseDate('2021-01-28'), '2021-01-28');
eq('DD-Mon-YYYY', parseDate('28-Jan-2021'), '2021-01-28');
eq('MM/DD proven by a day > 12 in 2nd slot', resolveDayFirst(['01/28/2021', '02/03/2021']), { dayFirst: false, ambiguous: false });
eq('ISO column is never ambiguous', resolveDayFirst(['2021-01-01']).ambiguous, false);
eq('invalid 31 Feb → null', parseDate('2021-02-31'), null);
eq('28 Jan – 28 Jul = 6 months, not 7', monthsElapsed('2021-01-28', '2021-07-28'), 6);
eq('weekday zone-free: 2021-01-28 is Thursday (4)', weekday('2021-01-28'), 4);
eq('weekly option', classify({ symbol: 'BANKNIFTY2142231200PE', segment: 'FO' }), { underlying: 'BANKNIFTY', cls: 'OPT', optType: 'PE', strike: 31200, expiry: { date: '2021-04-22' } });
eq('weekly Oct/Nov/Dec letter', classify({ symbol: 'NIFTY21D0916500PE', segment: 'FO' }).expiry, { date: '2021-12-09' });
eq('monthly option', classify({ symbol: 'BANKNIFTY26JUN57100PE', segment: 'FO' }).underlying, 'BANKNIFTY');
eq('monthly future', classify({ symbol: 'TATASTEEL18DECFUT', segment: 'FO' }).cls, 'FUT');
eq('equity stays EQ', classify({ symbol: 'LIQUIDBEES', segment: 'EQ', exchange: 'BSE' }).cls, 'EQ');

console.log('\n══ analyze() failure paths ══');
eq('empty file', analyze([{ name: 'a.csv', text: '' }]).failure.reason, 'empty');
{
  const body = Array.from({ length: 10 }, (_, i) => `X,,2024-01-0${(i % 9) + 1},NSE,EQ,EQ,${i < 3 ? 'maybe' : 'buy'},false,1,1,${i},1,2024-01-01T10:00:00`).join('\n');
  const r = analyze([{ name: 'b.csv', text: `${ZEQ}\n${body}` }]);
  eq('>20% unreadable rows → bad_rows with row numbers', [r.ok, r.failure.reason, r.failure.sampleRows.map((x) => x.row)], [false, 'bad_rows', [2, 3, 4]]);
}
{
  const r = analyze([{ name: 'c.csv', text: `${ZEQ}\nUPL,INE1,2021-01-28,NSE,EQ,EQ,sell,false,100,561,1,1,2021-01-28T09:54:15\nUPL,INE1,2021-01-28,NSE,EQ,EQ,buy,false,100,565,2,2,2021-01-28T13:31:06` }]);
  eq('tiny valid file → report with belowMin, no findings', [r.ok, r.model.N, r.model.belowMin, r.model.findings.length, r.model.realizedPaise], [true, 1, true, 0, -40000]);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
