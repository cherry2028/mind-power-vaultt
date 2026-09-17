// Durable leads — api/notify.js stores the lead BEFORE any email or Telegram,
// fails loudly if it cannot, and never loses a stored lead to a Telegram
// failure. Database and network are fakes; no real call leaves this process.
import fs from 'node:fs';
import { validateLead, handleNotify } from '../api/notify.js';

let pass = 0, fail = 0;
function eq(name, got, expected) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  if (ok) pass++; else fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  → ${JSON.stringify(got)}${ok ? '' : `  (expected ${JSON.stringify(expected)})`}`);
}

// ── fakes ───────────────────────────────────────────────────────────────
function fakeRes() {
  const r = { statusCode: 0, body: null, headers: {} };
  r.setHeader = (k, v) => { r.headers[k] = v; };
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  r.end = () => r;
  return r;
}
function fakeDb({ insertError = null, insertThrows = false, updateError = null } = {}) {
  const calls = { inserts: [], updates: [] };
  const db = {
    calls,
    from(table) {
      return {
        insert(row) {
          calls.inserts.push({ table, row });
          return { select: () => ({ single: async () => {
            if (insertThrows) throw new Error('network down');
            return insertError ? { data: null, error: { message: insertError } } : { data: { id: '0f1e2d3c-aaaa-bbbb-cccc-000000000001' }, error: null };
          } }) };
        },
        update(patch) {
          return { eq: async (col, val) => { calls.updates.push({ table, patch, col, val }); return { error: updateError ? { message: updateError } : null }; } };
        },
      };
    },
  };
  return db;
}
function fakeFetch({ telegram = 'ok', resend = 'ok' } = {}) {
  const calls = [];
  const f = async (url, init) => {
    calls.push({ url: String(url), body: init && init.body });
    if (String(url).includes('api.telegram.org')) {
      if (telegram === 'throw') throw new Error('ETIMEDOUT');
      return { json: async () => (telegram === 'ok' ? { ok: true } : { ok: false, description: 'Unauthorized' }) };
    }
    if (String(url).includes('api.resend.com')) return { json: async () => (resend === 'ok' ? { id: 'em_1' } : { name: 'validation_error' }) };
    throw new Error('unexpected url ' + url);
  };
  f.calls = calls;
  return f;
}
let ipSeq = 0;
const req = (body) => ({ method: 'POST', headers: { 'x-forwarded-for': `10.9.0.${++ipSeq}` }, body });
const ENV = { TELEGRAM_BOT_TOKEN: 'x', TELEGRAM_CHAT_ID: '1', RESEND_API_KEY: 'r' };
const GOOD = { name: 'Ravi', phone: '98480 22338', email: 'ravi@example.com', level: 'struggling', lang: 'te', report: { primaryPattern: 'FOMO' } };

// capture logs to prove no phone/email ever reaches them
const logged = [];
const origLog = console.log, origErr = console.error;
console.error = (...a) => logged.push(a.map(String).join(' '));
const quietLog = (...a) => logged.push(a.map(String).join(' '));

async function run(body, { db = fakeDb(), fetch = fakeFetch(), env = ENV } = {}) {
  const res = fakeRes();
  console.log = quietLog;
  try { await handleNotify(req(body), res, { db, fetch, env }); } finally { console.log = origLog; }
  return { res, db, fetch };
}

origLog('\n══ validateLead ══');
eq('good lead → phone digits only, trimmed', validateLead(GOOD).lead, { source: 'quiz', name: 'Ravi', phone: '9848022338', email: 'ravi@example.com', level: 'struggling', lang: 'te', report: { primaryPattern: 'FOMO' } });
eq('missing name', validateLead({ ...GOOD, name: '  ' }).error, 'invalid_name');
eq('9-digit phone', validateLead({ ...GOOD, phone: '984802233' }).error, 'invalid_phone');
eq('+91 prefix kept as digits (12)', validateLead({ ...GOOD, phone: '+91 98480 22338' }).lead.phone, '919848022338');
eq('bad email refused', validateLead({ ...GOOD, email: 'ravi@' }).error, 'invalid_email');
eq('email optional', validateLead({ ...GOOD, email: '' }).lead.email, null);
eq('unknown lang → null', validateLead({ ...GOOD, lang: 'hi' }).lead.lang, null);
eq('oversized report dropped, lead kept', validateLead({ ...GOOD, report: { x: 'y'.repeat(30000) } }).lead.report, null);
eq('array report dropped', validateLead({ ...GOOD, report: [1, 2] }).lead.report, null);

origLog('\n══ Store first ══');
{
  const { res, db, fetch } = await run(GOOD);
  eq('happy path → 200 stored', [res.statusCode, res.body.stored, res.body.telegramSent, res.body.emailSent], [200, true, true, true]);
  eq('exactly one insert into leads, with the validated row', [db.calls.inserts.length, db.calls.inserts[0].table, db.calls.inserts[0].row.phone], [1, 'leads', '9848022338']);
  eq('outcome recorded on that row', db.calls.updates[0] && [db.calls.updates[0].patch.telegram_ok, db.calls.updates[0].patch.email_sent, db.calls.updates[0].patch.telegram_error, db.calls.updates[0].val], [true, true, null, '0f1e2d3c-aaaa-bbbb-cccc-000000000001']);
  eq('Telegram message carries the lead id', fetch.calls.some((c) => c.url.includes('telegram') && c.body.includes('Lead 0f1e2d3c')), true);
}
{
  const { res, db, fetch } = await run(GOOD, { db: fakeDb({ insertError: 'relation "leads" does not exist' }) });
  eq('insert fails → 500 lead_store_failed', [res.statusCode, res.body.error], [500, 'lead_store_failed']);
  eq('…and NO email, NO Telegram (nothing claims a lead we did not keep)', [fetch.calls.length, db.calls.updates.length], [0, 0]);
}
{
  const { res, fetch } = await run(GOOD, { db: fakeDb({ insertThrows: true }) });
  eq('insert throws → 500, no outbound calls', [res.statusCode, fetch.calls.length], [500, 0]);
}
{
  const { res, fetch } = await run(GOOD, { db: null });
  eq('store not configured → 500 lead_store_unconfigured, no outbound calls', [res.statusCode, res.body.error, fetch.calls.length], [500, 'lead_store_unconfigured', 0]);
}
{
  const { res, db } = await run({ ...GOOD, phone: '123' });
  eq('invalid body → 400 before any insert', [res.statusCode, db.calls.inserts.length], [400, 0]);
}

origLog('\n══ Telegram failure never loses the lead ══');
{
  const { res, db } = await run(GOOD, { fetch: fakeFetch({ telegram: 'fail' }) });
  eq('Telegram rejects → still 200 (lead is stored)', [res.statusCode, res.body.stored, res.body.telegramSent], [200, true, false]);
  eq('…row marked telegram_ok false with the reason', [db.calls.updates[0].patch.telegram_ok, db.calls.updates[0].patch.telegram_error], [false, 'Unauthorized']);
}
{
  const { res, db } = await run(GOOD, { fetch: fakeFetch({ telegram: 'throw' }) });
  eq('Telegram network error → 200, row marked', [res.statusCode, db.calls.updates[0].patch.telegram_ok, db.calls.updates[0].patch.telegram_error], [200, false, 'ETIMEDOUT']);
}
{
  const { res, db } = await run(GOOD, { env: { RESEND_API_KEY: 'r' } });
  eq('Telegram not configured (e.g. revoked token gap) → 200, row says not_configured', [res.statusCode, db.calls.updates[0].patch.telegram_ok, db.calls.updates[0].patch.telegram_error], [200, false, 'not_configured']);
}
{
  const { res } = await run(GOOD, { db: fakeDb({ updateError: 'timeout' }) });
  eq('outcome update fails → still 200 (only the status is lost, not the lead)', res.statusCode, 200);
}
{
  const { db } = await run({ ...GOOD, email: '' });
  eq('no email given → email_sent false, Telegram still sent', [db.calls.updates[0].patch.email_sent, db.calls.updates[0].patch.telegram_ok], [false, true]);
}

origLog('\n══ No phone numbers or emails in function logs ══');
{
  const leaks = logged.filter((l) => /9848022338|98480 22338|ravi@example\.com/.test(l));
  eq(`${logged.length} log lines captured, none contain the phone or email`, leaks, []);
}

origLog('\n══ Form + endpoint wiring ══');
{
  const app = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
  const i = app.indexOf('const submit=async()=>{');
  const submit = app.slice(i, app.indexOf('const is=(f)=>', i));
  eq('form checks the response before claiming success', /\.ok\b/.test(submit), true);
  eq('generate_lead fires only after a confirmed store (not in the failure path)', submit.includes('if(!ok)') && submit.indexOf('track("generate_lead"') > submit.indexOf('if(!ok)'), true);
  eq('failure shows an error with a WhatsApp fallback', /setLeadFail\(true\)/.test(submit) && /wa\.me\/919059181616/.test(app), true);
  eq('double tap cannot create two leads (synchronous ref guard, not just render state)', /leadInFlight\.current\)return;/.test(submit) && /leadInFlight\.current=true;/.test(submit) && /const leadInFlight = useRef\(false\)/.test(app), true);
  eq('dead api/save-lead.js removed (frees a Hobby function slot)', fs.existsSync(new URL('../api/save-lead.js', import.meta.url)), false);
}

console.error = origErr;
console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
