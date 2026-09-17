// Contract symbol → what it is. Unknown formats degrade to the raw symbol and
// never throw: a symbol we can't parse still pairs and still counts.

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const WEEKLY_MONTH = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, O: 10, N: 11, D: 12 };
const pad = (n) => String(n).padStart(2, '0');

// cls: EQ | FUT | OPT | COMM | CDS
export function classify({ symbol, exchange, segment }) {
  const sym = String(symbol || '').toUpperCase().replace(/\s+/g, '');
  const ex = String(exchange || '').toUpperCase();
  const seg = String(segment || '').toUpperCase();

  // NSE/BSE derivative formats (Zerodha / exchange trading symbols)
  //   monthly: BANKNIFTY26JUN57100PE · NIFTY24SEPFUT
  //   weekly:  BANKNIFTY2142231200PE (YY M DD) · NIFTY21D0916500PE
  let m, underlying = sym, kind = null, optType = null, strike = null, expiry = null;
  if ((m = sym.match(/^([A-Z&-]+?)(\d{2})(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)(?:(\d+(?:\.\d+)?)(CE|PE)|(FUT))$/))) {
    underlying = m[1];
    kind = m[6] ? 'FUT' : 'OPT';
    if (kind === 'OPT') { optType = m[5]; strike = +m[4]; }
    expiry = { month: `20${m[2]}-${pad(MONTHS.indexOf(m[3]) + 1)}` }; // day not in symbol
  } else if ((m = sym.match(/^([A-Z&-]+?)(\d{2})([1-9OND])(\d{2})(\d+(?:\.\d+)?)(CE|PE)$/))) {
    underlying = m[1]; kind = 'OPT'; optType = m[6]; strike = +m[5];
    expiry = { date: `20${m[2]}-${pad(WEEKLY_MONTH[m[3]])}-${m[4]}` };
  }

  let cls;
  if (ex === 'MCX' || seg === 'COM' || seg === 'MCX') cls = 'COMM';
  else if (ex === 'CDS' || seg === 'CDS' || seg === 'CUR') cls = 'CDS';
  else if (kind) cls = kind;
  else if (/^(FO|NFO|BFO|F&O|FNO|DERIVATIVES)$/.test(seg)) cls = /FUT$/.test(sym) ? 'FUT' : (/(CE|PE)$/.test(sym) ? 'OPT' : 'FUT');
  else cls = 'EQ';

  return { underlying, cls, optType, strike, expiry };
}
