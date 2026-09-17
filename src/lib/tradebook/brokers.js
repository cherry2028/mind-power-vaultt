// DATA ONLY — header vocabulary, broker fingerprints, wrong-report fingerprints
// and export steps. A broker is only "detected" once its fingerprint has been
// checked against a real export; until then its files go through the generic
// mapper (see TRADEBOOK-AUTOPSY-ARCHITECTURE.md §0.2).

// Header cells are normalised with normHeader() before lookup.
export function normHeader(h) {
  return String(h == null ? '' : h).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export const REQUIRED = ['symbol', 'side', 'qty', 'price', 'date'];

// canonical field → accepted normalised header texts
export const SYNONYMS = {
  symbol:   ['symbol', 'tradingsymbol', 'trading symbol', 'scrip', 'scrip name', 'scrip code name', 'instrument', 'instrument name', 'stock', 'security', 'security name', 'contract', 'name'],
  isin:     ['isin', 'isin code'],
  side:     ['trade type', 'buy sell', 'side', 'transaction type', 'txn type', 'b s', 'action', 'buy or sell', 'type'],
  qty:      ['quantity', 'qty', 'traded qty', 'trade qty', 'filled qty', 'executed qty', 'quantity lot'],
  price:    ['price', 'trade price', 'traded price', 'rate', 'executed price', 'avg price', 'average price'],
  date:     ['trade date', 'date', 'order date', 'execution date'],
  datetime: ['order execution time', 'execution time', 'trade time stamp', 'timestamp', 'date time', 'trade date time'],
  time:     ['trade time', 'time', 'order time', 'exec time'],
  tradeId:  ['trade id', 'trade no', 'trade number', 'trade ref', 'exchange trade id'],
  orderId:  ['order id', 'order no', 'order number'],
  exchange: ['exchange', 'exch'],
  segment:  ['segment'],
  series:   ['series'],
  expiry:   ['expiry date', 'expiry'],
};

// Plain-language names for the "found / missing" table.
export const FIELD_LABEL_TE = {
  symbol: 'Symbol (stock / contract పేరు)',
  side: 'Buy / Sell',
  qty: 'Quantity',
  price: 'Price',
  date: 'Trade date',
};

export const BROKERS = {
  zerodha: {
    name: 'Zerodha',
    verified: true, // checked against a real Console export, 2026-09-17
    // every one of these headers must be present
    fingerprint: ['symbol', 'isin', 'trade date', 'exchange', 'segment', 'series', 'trade type', 'auction', 'quantity', 'price', 'trade id', 'order id', 'order execution time'],
    steps: [
      'console.zerodha.com లో login అవ్వండి',
      'Reports → Tradebook',
      'Segment: Equity (తర్వాత F&O కూడా విడిగా)',
      'Date range ఎంచుకుని View → Download CSV',
      'ఎక్కువ సంవత్సరాలు ఉంటే, ఒక్కో range కి ఒక file — అన్నీ ఇక్కడ ఒకేసారి ఎంచుకోవచ్చు',
    ],
  },
  angel:  { name: 'Angel One', verified: false, fingerprint: null, steps: null },
  upstox: { name: 'Upstox',    verified: false, fingerprint: null, steps: null },
  dhan:   { name: 'Dhan',      verified: false, fingerprint: null, steps: null },
  fyers:  { name: 'Fyers',     verified: false, fingerprint: null, steps: null },
};

// Shown for brokers whose export has not been verified yet. Deliberately
// generic: a wrong menu path is worse than none.
export const GENERIC_STEPS = [
  'Broker website / app లో Reports లేదా Statements కి వెళ్ళండి',
  '"Tradebook" లేదా "Trade history" ఎంచుకోండి (P&L statement కాదు)',
  'Date range ఎంచుకుని CSV format లో download చేయండి',
];

// Files that are clearly SOME broker report, just not a tradebook.
// Each entry: all `has` headers present → that report type.
export const WRONG_REPORTS = [
  { type: 'pnl',      te: 'P&L statement',  has: ['realized p l'] },
  { type: 'pnl',      te: 'P&L statement',  has: ['realised p l'] },
  { type: 'pnl',      te: 'P&L statement',  has: ['realized pnl'] },
  { type: 'pnl',      te: 'P&L statement',  has: ['buy value', 'sell value', 'realized p l'] },
  { type: 'ledger',   te: 'Ledger',          has: ['debit', 'credit'] },
  { type: 'holdings', te: 'Holdings report', has: ['quantity available'] },
  { type: 'holdings', te: 'Holdings report', has: ['average price', 'previous closing price'] },
];
