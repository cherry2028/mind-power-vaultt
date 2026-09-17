// IST wall-clock parsing with NO Date/timezone conversion. Broker files carry
// Indian local time as text; turning that into a Date on a device set to any
// other zone would shift every trade. We keep the text's own clock.
//
// A parsed moment is { date: 'YYYY-MM-DD', sec: seconds-from-midnight | null }.

const MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const pad = (n) => String(n).padStart(2, '0');

function validYmd(y, m, d) {
  if (!(y >= 1990 && y <= 2100 && m >= 1 && m <= 12 && d >= 1)) return false;
  const dim = new Date(Date.UTC(y, m, 0)).getUTCDate(); // UTC maths only
  return d <= dim;
}
const ymd = (y, m, d) => (validYmd(y, m, d) ? `${y}-${pad(m)}-${pad(d)}` : null);

// Split a cell into its date part and optional time part.
function splitDateTime(s) {
  const m = String(s || '').trim().match(/^(\S+?)(?:[T\s]+(\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?\s*(?:[AaPp][Mm])?))?$/);
  return m ? { d: m[1], t: m[2] || null } : { d: String(s || '').trim(), t: null };
}

export function parseTime(s) {
  const m = String(s || '').trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?\s*([AaPp][Mm])?$/);
  if (!m) return null;
  let h = +m[1];
  const mi = +m[2], se = m[3] ? +m[3] : 0, ap = m[4] && m[4].toLowerCase();
  if (ap === 'pm' && h < 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  if (h > 23 || mi > 59 || se > 59) return null;
  return h * 3600 + mi * 60 + se;
}

// Decide DD/MM vs MM/DD for a whole column of non-ISO dates.
// Indian brokers write day first; only a column that proves otherwise flips.
export function resolveDayFirst(values) {
  let dayFirstProof = false, monthFirstProof = false, numericDmy = 0;
  for (const v of values) {
    const m = splitDateTime(v).d.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
    if (!m) continue;
    numericDmy++;
    if (+m[1] > 12) dayFirstProof = true;
    if (+m[2] > 12) monthFirstProof = true;
  }
  if (monthFirstProof && !dayFirstProof) return { dayFirst: false, ambiguous: false };
  // ISO (YYYY-MM-DD) and month-name dates are never ambiguous.
  return { dayFirst: true, ambiguous: numericDmy > 0 && !dayFirstProof };
}

export function parseDate(s, dayFirst = true) {
  const d = splitDateTime(s).d;
  let m;
  if ((m = d.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/))) return ymd(+m[1], +m[2], +m[3]);
  if ((m = d.match(/^(\d{1,2})[-/.\s]([A-Za-z]{3})[A-Za-z]*[-/.\s](\d{2,4})$/))) {
    const mon = MON[m[2].toLowerCase()];
    const y = +m[3] < 100 ? 2000 + +m[3] : +m[3];
    return mon ? ymd(y, mon, +m[1]) : null;
  }
  if ((m = d.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/))) {
    const y = +m[3] < 100 ? 2000 + +m[3] : +m[3];
    return dayFirst ? ymd(y, +m[2], +m[1]) : ymd(y, +m[1], +m[2]);
  }
  return null;
}

// Parse a combined date-time cell ("2021-01-28T09:54:15", "28-01-2021 09:54").
export function parseDateTime(s, dayFirst = true) {
  const { t } = splitDateTime(s);
  return { date: parseDate(s, dayFirst), sec: t ? parseTime(t) : null };
}

// Days since epoch for a 'YYYY-MM-DD' string — UTC maths, no zone involved.
export function dayNumber(date) {
  const [y, m, d] = date.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

// Weekday 0=Sun..6=Sat, zone-free.
export function weekday(date) {
  return (dayNumber(date) + 4) % 7; // 1970-01-01 was a Thursday
}

// Elapsed months in a date range (30.44-day months, at least 1). Calendar
// months touched would call 28 Jan – 28 Jul "7 months".
export function monthsElapsed(from, to) {
  return Math.max(1, Math.round((dayNumber(to) - dayNumber(from) + 1) / 30.44));
}

export function fmtClock(sec) {
  return `${pad(Math.floor(sec / 3600))}:${pad(Math.floor(sec / 60) % 60)}`;
}
