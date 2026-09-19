// One Foundation setting decides where a student's day ends — and nothing else.
//
//   Indian (the default, and what every existing journal gets): the device's
//   calendar date. Byte-for-byte the behaviour this journal has always had.
//   24x7: rolls over at 05:30 IST = 00:00 UTC, i.e. the UTC date.
//
// The point of this file is the first claim: a journal that never answers the
// question must not move by a single day.
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../src/journal-content.html', import.meta.url), 'utf8');

let pass = 0, fail = 0;
function eq(name, got, expected) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  if (ok) pass++; else fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  → ${JSON.stringify(got)}${ok ? '' : `  (expected ${JSON.stringify(expected)})`}`);
}
const fnSrc = (name) => {
  const i = html.indexOf(`function ${name}(`);
  if (i < 0) return null;
  let depth = 0;
  for (let k = html.indexOf('{', i); k < html.length; k++) {
    if (html[k] === '{') depth++;
    else if (html[k] === '}') { depth--; if (depth === 0) return html.slice(i, k + 1); }
  }
  return null;
};

// A Date whose "local" parts are UTC shifted by a chosen device offset, so one
// test can be a phone in IST, in UTC, or on a clock set to Los Angeles.
function fakeDate(epoch, offsetMin) {
  const off = offsetMin * 60000;
  // Everything else (Date.UTC, setUTCDate, getUTC*) is the real Date, so the
  // journal's own arithmetic runs unchanged.
  return class F extends Date {
    constructor(...a) { if (a.length === 0) super(epoch); else super(...a); }
    getFullYear() { return new Date(this.getTime() + off).getUTCFullYear(); }
    getMonth() { return new Date(this.getTime() + off).getUTCMonth(); }
    getDate() { return new Date(this.getTime() + off).getUTCDate(); }
  };
}
// The real journal functions, run against that clock.
function day(epoch, offsetMin, mkt) {
  const src = `${fnSrc('mktMode')} ${fnSrc('tdLocal')} ${fnSrc('td24')} ${fnSrc('td')}
    var DB = { f: ${mkt === undefined ? '{}' : JSON.stringify({ mkt })} };
    return td();`;
  return new Function('Date', src)(fakeDate(epoch, offsetMin));
}
const IST = (y, mo, d, h, mi) => Date.UTC(y, mo - 1, d, h, mi) - 330 * 60000; // IST wall clock → epoch
const IST_OFF = 330, UTC_OFF = 0, LA_OFF = -420;

console.log('\n══ A journal that never answers the question does not move ══');
{
  const moments = [
    ['midday', IST(2026, 9, 19, 12, 0)],
    ['one minute past midnight IST', IST(2026, 9, 19, 0, 1)],
    ['one minute to midnight IST', IST(2026, 9, 19, 23, 59)],
    ['05:29 IST', IST(2026, 9, 19, 5, 29)],
    ['05:31 IST', IST(2026, 9, 19, 5, 31)],
    ['new year IST', IST(2027, 1, 1, 0, 30)],
  ];
  const old = (epoch, off) => {
    const d = new Date(epoch + off * 60000);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  };
  let same = true, firstBad = null;
  for (const [, epoch] of moments) {
    for (const off of [IST_OFF, UTC_OFF, LA_OFF]) {
      for (const mkt of [undefined, 'in', '', 'nonsense']) {
        const got = day(epoch, off, mkt);
        if (got !== old(epoch, off)) { same = false; firstBad = firstBad || [got, old(epoch, off), off, mkt]; }
      }
    }
  }
  eq(`${moments.length} moments × 3 device timezones × 4 unset/Indian values → identical to the old td()`, [same, firstBad], [true, null]);
}
eq('an unanswered setting is Indian, not empty', day(IST(2026, 9, 19, 12, 0), IST_OFF, undefined), '2026-09-19');

console.log('\n══ 24x7: the day ends at 05:30 IST (= 00:00 UTC) ══');
eq('05:29 IST belongs to the previous day', day(IST(2026, 9, 19, 5, 29), IST_OFF, '24x7'), '2026-09-18');
eq('05:30 IST starts the new day', day(IST(2026, 9, 19, 5, 30), IST_OFF, '24x7'), '2026-09-19');
eq('05:31 IST is the new day', day(IST(2026, 9, 19, 5, 31), IST_OFF, '24x7'), '2026-09-19');
eq('02:00 IST — the middle of a crypto session — is still the day before', day(IST(2026, 9, 19, 2, 0), IST_OFF, '24x7'), '2026-09-18');
eq('23:00 IST is the same day the trader thinks it is', day(IST(2026, 9, 19, 23, 0), IST_OFF, '24x7'), '2026-09-19');
eq('Indian at that same 02:00 IST has already started a new day', day(IST(2026, 9, 19, 2, 0), IST_OFF, 'in'), '2026-09-19');

console.log('\n══ 24x7 does not depend on how the device clock is set ══');
{
  const t = IST(2026, 9, 19, 2, 0);
  eq('phone on IST, on UTC and on Los Angeles all agree',
    [day(t, IST_OFF, '24x7'), day(t, UTC_OFF, '24x7'), day(t, LA_OFF, '24x7')],
    ['2026-09-18', '2026-09-18', '2026-09-18']);
  eq('…while Indian follows the device, as it always has (unchanged, not fixed here)',
    [day(t, IST_OFF, 'in'), day(t, LA_OFF, 'in')], ['2026-09-19', '2026-09-18']);
}

console.log('\n══ The blast radius ══');
{
  eq('tdLocal is the old td(), character for character',
    fnSrc('tdLocal').replace('tdLocal', 'td'),
    `function td(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}`);
  // Every "last N days" window has to end on the day td() says it is, or a
  // 24x7 student gets the kill switch on one day and the 7-day window on
  // another. The only date still built from the raw device clock is the F&O
  // expiry helper, which computes a CONTRACT date, not "today".
  eq('the 7-day window, the monthly view and the month picker all start from td()',
    [/dayMinus\(6\)/.test(html), /mStart=new Date\(td\(\)\.slice\(0,7\)/.test(html), /mn\.value=td\(\)\.slice\(0,7\)/.test(html)],
    [true, true, true]);
  eq('daysAgoStr (streaks, rollups) is anchored on td(), not on new Date()',
    fnSrc('daysAgoStr'), 'function daysAgoStr(n){return dayMinus(n);}');
  {
    // dayMinus must land on exactly the dates the old arithmetic did for an
    // Indian student — including across a month end and a leap day.
    const src = `${fnSrc('mktMode')} ${fnSrc('tdLocal')} ${fnSrc('td24')} ${fnSrc('td')} ${fnSrc('dayMinus')}
      var DB = { f: {} };
      return dayMinus;`;
    const dm = (iso, n) => {
      const [y, m, d] = iso.split('-').map(Number);
      const epoch = Date.UTC(y, m - 1, d, 6, 0); // midday-ish IST, well inside the day
      return new Function('Date', src)(fakeDate(epoch, IST_OFF))(n);
    };
    eq('dayMinus across a month end, a leap day and a year end',
      [dm('2026-03-01', 1), dm('2024-03-01', 1), dm('2026-01-03', 6)],
      ['2026-02-28', '2024-02-29', '2025-12-28']);
  }
  const readers = [...html.matchAll(/DB\.f\.mkt/g)].length;
  eq('exactly two places touch the setting: mktMode() reads it, saveF() writes it', readers, 2);
  eq('mktMode defaults to Indian for any value that is not 24x7', /==='24x7'\)\?'24x7':'in'/.test(fnSrc('mktMode')), true);
  eq('autoDay (the 3-screen day flow) is untouched by this change',
    fnSrc('autoDay'), `function autoDay(){var m=istMinutes();if(m<9*60+15)return 'morning';if(m<=15*60+30)return 'trade';return 'evening';}`);
}

console.log('\n══ Saved, synced, and shown ══');
{
  eq('saveF stores only in or 24x7', /DB\.f\.mkt=\(ge\('f-mkt'\)&&ge\('f-mkt'\)\.value==='24x7'\)\?'24x7':'in';/.test(fnSrc('saveF')), true);
  eq('loadF paints the saved choice', /showMkt\(mktMode\(\)\)/.test(fnSrc('loadF')), true);
  const sync = fs.readFileSync(new URL('../src/utils/journalSync.js', import.meta.url), 'utf8');
  eq('it rides mpvf, which already syncs — no new synced key', sync.slice(sync.indexOf('JOURNAL_KEYS'), sync.indexOf('STAMP_KEY')).includes("'mpvf'"), true);
  const card = html.slice(html.indexOf('నా Market'), html.indexOf('Foundation Save చేయి'));
  eq('the question is asked in Telugu with both answers', /Indian/.test(card) && /24x7/.test(card), true);
  eq('…and the screen says what changes and what does not', /Trades ఏవీ మారవు/.test(fnSrc('showMkt')), true);
  eq('…naming the 05:30 boundary and why', /5:30/.test(fnSrc('showMkt')) && /00:00 UTC/.test(fnSrc('showMkt')), true);
}

console.log('\n══ The journal still parses ══');
{
  const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  let ok = true, err = '';
  for (const code of blocks) { try { new Function(code); } catch (e) { ok = false; err = e.message; } }
  eq(`${blocks.length} inline script block(s) parse`, [ok, err], [true, '']);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
