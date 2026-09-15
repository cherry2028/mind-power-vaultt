// Step B — account binding. Imports the REAL modules, no mirrored copies:
//   src/utils/accountBinding.js, src/utils/journalSync.js, src/utils/deployTarget.js
//
// The contract being locked down:
//   1. Sync runs only on an allowed host/database pairing.
//   2. Sign-in as a different account clears exactly the person's keys — and is
//      refused while the previous account has unsynced changes.
//   3. A phone with journal data but no binding is bound only on proof, and a
//      refusal changes NOTHING on the phone and writes NOTHING to the cloud.
//   4. Nothing here ever deletes a cloud row.
import { readFileSync } from 'node:fs';

// ── stub the browser globals, before importing ───────────────────────────────
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};

const AB = await import('../src/utils/accountBinding.js');
const JS = await import('../src/utils/journalSync.js');
const DT = await import('../src/utils/deployTarget.js');

let pass = 0, fail = 0;
function eq(name, got, expected) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  if (ok) pass++; else fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) console.log(`      got      ${JSON.stringify(got)}\n      expected ${JSON.stringify(expected)}`);
}

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

// json values are JSON.stringify'd (as the journal's ls() does); raw values are stored as-is
function setLocal(json = {}, raw = {}) {
  store.clear();
  for (const [k, v] of Object.entries(json)) store.set(k, JSON.stringify(v));
  for (const [k, v] of Object.entries(raw)) store.set(k, v);
}
const snap = () => JSON.stringify([...store.entries()].sort());
const snapWithout = (key) => JSON.stringify([...store.entries()].filter(([k]) => k !== key).sort());

function fakeSupabase(row, error = null) {
  const calls = { reads: 0, upserts: 0, deletes: 0, eqs: [] };
  const api = {
    from() { return api; },
    select() { return api; },
    eq(col, val) { calls.eqs.push([col, val]); return api; },
    async maybeSingle() { calls.reads++; return error ? { data: null, error } : { data: row, error: null }; },
    async upsert(row) { calls.upserts++; calls.upserted = row; return { error: null }; },
    delete() { calls.deletes++; return api; },
  };
  return { client: api, calls };
}

const PROD_URL = 'https://juuvefsegqghspaybrtf.supabase.co';
const STAGING_URL = 'https://bzgzykncrpoarggsrrnf.supabase.co';
const PREVIEW_HOST = 'mind-power-vaultt-git-stepb-account-switch-cherry.vercel.app';
const STAMP = '2026-09-10T12:00:00.000Z';
const S = Date.parse(STAMP);
const OLD = (days) => S - 86400000 * days;  // created before this phone's last sync
const NEW = (mins) => S + 60000 * mins;     // created after it (unsynced work)
const T = (id) => ({ id, date: '2026-09-10', inst: 'NIFTY', pnl: 100 });
const rowOf = (data) => ({ data, updated_at: STAMP });
const USER_A = { id: 'uuid-a', email: 'alpha@example.com' };
const USER_B = { id: 'uuid-b', email: 'bravo@example.com' };
const USER_C = { id: 'uuid-c', email: 'charlie@example.com' };

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n══ deployTarget — host/database pairing ══');
{
  const c = DT.classifyTarget;
  eq('mindpowervaultt.com + production DB -> sync', c('mindpowervaultt.com', PROD_URL).syncAllowed, true);
  eq('mindpowervaultt.com + staging DB -> refuse', c('mindpowervaultt.com', STAGING_URL).syncAllowed, false);
  eq('preview host + staging DB -> sync (test data)', c(PREVIEW_HOST, STAGING_URL).syncAllowed, true);
  eq('preview host + production DB -> refuse', c(PREVIEW_HOST, PROD_URL).syncAllowed, false);
  eq('vercel.app production alias + production DB -> refuse', c('mind-power-vaultt.vercel.app', PROD_URL).syncAllowed, false);
  eq('www + production DB -> refuse', c('www.mindpowervaultt.com', PROD_URL).syncAllowed, false);
  eq('localhost + production DB -> refuse', c('localhost', PROD_URL).syncAllowed, false);
  const lookalike = c('mindpowervaultt.com', 'https://juuvefsegqghspaybrtf.supabase.co.evil.example');
  eq('look-alike database host -> unknown, refuse', [lookalike.db, lookalike.syncAllowed], ['unknown', false]);
  eq('missing database url -> refuse', c('mindpowervaultt.com', '').syncAllowed, false);
  eq('test tools: preview + staging + build flag', c(PREVIEW_HOST, STAGING_URL, true).testTools, true);
  eq('test tools: never without the build flag', c(PREVIEW_HOST, STAGING_URL, false).testTools, false);
  eq('test tools: never on the production host', c('mindpowervaultt.com', STAGING_URL, true).testTools, false);
  eq('test tools: never against the production DB', c(PREVIEW_HOST, PROD_URL, true).testTools, false);
  eq('no build flag outside Vite -> TEST_TOOLS_BUILD false', DT.TEST_TOOLS_BUILD, false);
}

console.log('\n══ which keys belong to the person ══');
{
  eq('JOURNAL_KEYS is still the 14 synced keys', JS.JOURNAL_KEYS.length, 14);
  eq('ACCOUNT_KEYS = 14 journal keys + mpvPin + mpvCloudUpdatedAt + mpvSyncDirty (17, no duplicates)',
    [AB.ACCOUNT_KEYS.length, new Set(AB.ACCOUNT_KEYS).size], [17, 17]);
  eq('mpvPin, mpvname, mpvCloudUpdatedAt, mpvSyncDirty all cleared',
    ['mpvPin', 'mpvname', 'mpvCloudUpdatedAt', 'mpvSyncDirty'].every((k) => AB.ACCOUNT_KEYS.includes(k)), true);
  eq('mpvOwner never syncs', JS.JOURNAL_KEYS.includes('mpvOwner'), false);
  eq('device id, form defaults, review and push flags are NOT cleared',
    ['mpv_device_id', 'mpvLotSize', 'mpvPairs', 'mpvSeg', 'mpvReviewed', 'mpvPushSubscribed', 'mpvPushDismissed', 'mpvJournalOpens']
      .filter((k) => AB.ACCOUNT_KEYS.includes(k)), []);
}

console.log('\n══ isBlankDevice ══');
{
  setLocal();
  eq('empty phone is blank', AB.isBlankDevice(), true);
  setLocal({ mpvOnboarded: '1', mpvf: { _firstDay: '2026-09-01', _build: 'x' }, mpvh: { g: {}, s: 0, b: 0 }, mpvstrat: {}, mpvtr: [], mpvinsight: {} });
  eq('bookkeeping only (onboarded, first-day, build stamp, zero streak) is blank', AB.isBlankDevice(), true);
  setLocal({ mpvf: { _firstDay: '2026-09-01', why: 'family' } });
  eq('foundation text is not blank', AB.isBlankDevice(), false);
  setLocal({ mpvtr: [T(OLD(1))] });
  eq('a trade is not blank', AB.isBlankDevice(), false);
  setLocal({ mpvname: 'Ravi' });
  eq('a name is not blank', AB.isBlankDevice(), false);
  setLocal({ mpvh: { g: { '2026-09-01': true }, s: 3, b: 3 } });
  eq('a streak is not blank', AB.isBlankDevice(), false);
}

console.log('\n══ proveOwnership — the first-open proof ══');
{
  const P = (local, row, stamp = STAMP, dirty = false) => AB.proveOwnership({ local, row, stamp, dirty });
  const PROVEN = { ok: true, reason: 'proven' };
  const NO = (reason) => ({ ok: false, reason });

  eq('BIND: every phone record is in this account\'s cloud',
    P({ mpvtr: [T(OLD(3))], mpveod: [T(OLD(2))] }, rowOf({ mpvtr: [T(OLD(3))], mpveod: [T(OLD(2))] })), PROVEN);
  eq('BIND: cloud holds more than the phone',
    P({ mpvtr: [T(OLD(3))] }, rowOf({ mpvtr: [T(OLD(9)), T(OLD(3))] })), PROVEN);
  eq('BIND: unsynced work created after the last sync',
    P({ mpvtr: [T(OLD(3)), T(NEW(5))] }, rowOf({ mpvtr: [T(OLD(3))] }), STAMP, true), PROVEN);
  eq('BIND: numeric and string ids compare equal',
    P({ mpvtr: [{ id: String(OLD(2)) }] }, rowOf({ mpvtr: [{ id: OLD(2) }] })), PROVEN);
  eq('BIND: same name on phone and cloud',
    P({ mpvtr: [T(OLD(1))], mpvname: 'Ravi' }, rowOf({ mpvtr: [T(OLD(1))], mpvname: 'Ravi' })), PROVEN);
  eq('BIND: cloud has no name',
    P({ mpvtr: [T(OLD(1))], mpvname: 'Ravi' }, rowOf({ mpvtr: [T(OLD(1))] })), PROVEN);
  eq('BIND: names differ but there are unsynced changes (a rename)',
    P({ mpvtr: [T(OLD(1))], mpvname: 'Ravi K' }, rowOf({ mpvtr: [T(OLD(1))], mpvname: 'Ravi' }), STAMP, true), PROVEN);

  eq('REFUSE: record older than the last sync and missing from the cloud',
    P({ mpvtr: [T(OLD(3)), T(OLD(9))] }, rowOf({ mpvtr: [T(OLD(3))] })), NO('foreign_records'));
  eq('REFUSE: this account has no cloud row',
    P({ mpvtr: [T(OLD(1))] }, null), NO('no_row'));
  eq('REFUSE: phone never synced (no stamp)',
    P({ mpvtr: [T(OLD(1))] }, rowOf({ mpvtr: [T(OLD(1))] }), null), NO('never_synced'));
  eq('REFUSE: corrupt stamp',
    P({ mpvtr: [T(OLD(1))] }, rowOf({ mpvtr: [T(OLD(1))] }), 'garbage'), NO('never_synced'));
  eq('REFUSE: emptied row {} with trades on the phone (the k*** case)',
    P({ mpvtr: [T(OLD(4))], mpveod: [T(OLD(4))] }, rowOf({})), NO('foreign_records'));
  eq('REFUSE: mixed phone — B\'s cloud records plus A\'s older ones (Path 2)',
    P({ mpvtr: [T(OLD(5)), T(OLD(4)), T(OLD(30))] }, rowOf({ mpvtr: [T(OLD(5)), T(OLD(4))] })), NO('foreign_records'));
  eq('REFUSE: same id in a DIFFERENT list does not count',
    P({ mpveod: [T(OLD(2))] }, rowOf({ mpvtr: [T(OLD(2))] })), NO('foreign_records'));
  eq('REFUSE: record with no id, not in the cloud',
    P({ mpvtr: [{ date: '2026-09-01' }] }, rowOf({ mpvtr: [] })), NO('foreign_records'));
  eq('REFUSE: every id list is judged, not just trades (mirror)',
    P({ mpvmir: [T(OLD(3))] }, rowOf({})), NO('foreign_records'));
  eq('REFUSE: names differ with nothing unsynced',
    P({ mpvtr: [T(OLD(1))], mpvname: 'Ravi' }, rowOf({ mpvtr: [T(OLD(1))], mpvname: 'Sita' })), NO('name_mismatch'));
}

console.log('\n══ verifyUnboundDevice — bind or refuse, never delete ══');
{
  setLocal({ mpvOnboarded: '1', mpvf: { _firstDay: '2026-09-01' } });
  const { client, calls } = fakeSupabase(null);
  const r = await AB.verifyUnboundDevice(client, USER_B);
  eq('blank phone -> bound_blank', [r.status, r.result], ['bound', 'bound_blank']);
  eq('blank phone -> no cloud read needed', calls.reads, 0);
  eq('blank phone -> binding written', AB.readOwner(), { id: USER_B.id, email: USER_B.email });
}
{
  setLocal({ mpvtr: [T(OLD(3)), T(NEW(1))], mpveod: [T(OLD(2))], mpvPin: '-1234' }, { mpvCloudUpdatedAt: STAMP, mpvSyncDirty: '1' });
  const before = snap();
  const { client, calls } = fakeSupabase(rowOf({ mpvtr: [T(OLD(3))], mpveod: [T(OLD(2))] }));
  const r = await AB.verifyUnboundDevice(client, USER_A);
  eq('proven -> bound_proven', [r.status, r.result], ['bound', 'bound_proven']);
  eq('proven -> read this account\'s row only', calls.eqs, [['user_id', USER_A.id]]);
  eq('proven -> binding written', AB.readOwner(), { id: USER_A.id, email: USER_A.email });
  eq('proven -> journal, PIN and sync markers untouched', snapWithout('mpvOwner'), before);
  eq('proven -> no cloud write, no delete', [calls.upserts, calls.deletes], [0, 0]);
}
{
  setLocal({ mpvtr: [T(OLD(30)), T(OLD(3))], mpvname: 'Ravi', mpvPin: '-1234' }, { mpvCloudUpdatedAt: STAMP, mpv_device_id: 'DEV-1' });
  const before = snap();
  const { client, calls } = fakeSupabase(rowOf({ mpvtr: [T(OLD(3))] }));
  const r = await AB.verifyUnboundDevice(client, USER_A);
  eq('foreign records -> refused', [r.status, r.reason, r.result], ['refused', 'foreign_records', 'refused_foreign_records']);
  eq('refused -> NO binding written', AB.readOwner(), null);
  eq('refused -> phone storage byte-identical (nothing wiped)', snap(), before);
  eq('refused -> no cloud write, no delete', [calls.upserts, calls.deletes], [0, 0]);
}
{
  setLocal({ mpvtr: [T(OLD(3))] }, { mpvCloudUpdatedAt: STAMP });
  const before = snap();
  const { client } = fakeSupabase(null);
  const r = await AB.verifyUnboundDevice(client, USER_B);
  eq('no cloud row -> refused_no_row', r.result, 'refused_no_row');
  eq('no cloud row -> phone storage byte-identical', snap(), before);
}
{
  setLocal({ mpvtr: [T(OLD(3))] }, { mpvCloudUpdatedAt: STAMP });
  const before = snap();
  const { client } = fakeSupabase(null, { message: 'TypeError: Failed to fetch' });
  const r = await AB.verifyUnboundDevice(client, USER_A);
  eq('cloud unreachable -> unverified_offline, not a refusal', [r.status, r.result], ['offline', 'unverified_offline']);
  eq('cloud unreachable -> nothing written', snap(), before);
  const r2 = await AB.verifyUnboundDevice(fakeSupabase(null, { message: 'permission denied for table journal_data' }).client, USER_A);
  eq('server refused -> unverified_error', [r2.status, r2.result], ['error', 'unverified_error']);
}

console.log('\n══ decideSignIn / applySignIn — the portal ══');
{
  const KEPT = { mpv_device_id: 'DEV-1', mpvLotSize: '50', mpvPairs: '["NIFTY"]', mpvSeg: 'FNO', mpvReviewed: '1', mpvPushSubscribed: '1', mpvPushDismissed: '1', mpvJournalOpens: '7', 'sb-bzgzykncrpoarggsrrnf-auth-token': '{"x":1}' };
  const FULL = {
    mpvf: { why: 'x' }, mpvpm: [T(OLD(1))], mpvtr: [T(OLD(1))], mpveod: [T(OLD(1))], mpvh: { g: {}, s: 2, b: 2 },
    mpvpsyd: [T(OLD(1))], mpvmir: [T(OLD(1))], mpvwk: [T(OLD(1))], mpvmn: [T(OLD(1))], mpvrules: [T(OLD(1))],
    mpvstrat: { a: 1 }, mpvname: 'Ravi', mpvOnboarded: '1', mpvinsight: { seen: 1 }, mpvPin: '-1234',
    mpvOwner: USER_A,
  };

  setLocal(FULL, { ...KEPT, mpvCloudUpdatedAt: STAMP });
  let before = snap();
  let d = AB.decideSignIn(USER_A);
  AB.applySignIn(d, USER_A);
  eq('same account -> same, nothing changes', [d.action, snap() === before], ['same', true]);

  setLocal({}, KEPT);
  d = AB.decideSignIn(USER_B);
  AB.applySignIn(d, USER_B);
  eq('no binding, blank phone -> bind', [d.action, AB.readOwner()?.id], ['bind', USER_B.id]);

  const { mpvOwner: _owner, ...unbound } = FULL;
  setLocal(unbound, { ...KEPT, mpvCloudUpdatedAt: STAMP });
  before = snap();
  d = AB.decideSignIn(USER_B);
  AB.applySignIn(d, USER_B);
  eq('no binding, journal on phone -> defer to the first-open proof, nothing changes', [d.action, snap() === before], ['defer', true]);

  setLocal(FULL, { ...KEPT, mpvCloudUpdatedAt: STAMP, mpvSyncDirty: '1' });
  before = snap();
  d = AB.decideSignIn(USER_B);
  AB.applySignIn(d, USER_B);
  eq('different account, previous has unsynced changes -> refuse', [d.action, d.previousEmail], ['refuse', USER_A.email]);
  eq('refused sign-in -> nothing on the phone changes', snap(), before);

  setLocal(FULL, { ...KEPT, mpvCloudUpdatedAt: STAMP });
  d = AB.decideSignIn(USER_B);
  AB.applySignIn(d, USER_B);
  eq('different account, fully synced -> switch', d.action, 'switch');
  eq('switch -> all 17 account keys gone', AB.ACCOUNT_KEYS.filter((k) => store.has(k)), []);
  eq('switch -> bound to the new account', AB.readOwner(), { id: USER_B.id, email: USER_B.email });
  eq('switch -> device id, form defaults, flags and auth session kept',
    Object.entries(KEPT).filter(([k, v]) => store.get(k) !== v).map(([k]) => k), []);
}

console.log('\n══ readOwner / maskEmail ══');
{
  setLocal({}, { mpvOwner: 'not-json' });
  eq('corrupt binding reads as none', AB.readOwner(), null);
  setLocal({ mpvOwner: { email: 'x@y.z' } });
  eq('binding without an id reads as none', AB.readOwner(), null);
  eq('maskEmail', AB.maskEmail('krishna@gmail.com'), 'k***@gmail.com');
  eq('maskEmail with no email', AB.maskEmail(null), 'ఈ account');
}

console.log('\n══ PIN gate matches the journal\'s own PIN ══');
const html = read('src/journal-content.html');
{
  const m = /function hashPin\(p\)\{[^\n]*?return h\.toString\(\);\}/.exec(html);
  eq('journal hashPin found', !!m, true);
  const iframeHash = new Function(`${m[0]}; return hashPin;`)();
  for (const p of ['1234', '0000', '482915']) eq(`parent hashPin == journal hashPin (${p})`, AB.hashPin(p), iframeHash(p));
  setLocal({ mpvPin: iframeHash('4821') }); // the journal stores JSON.stringify(hash)
  eq('right PIN opens the backup', AB.pinMatches('4821'), true);
  eq('wrong PIN does not', AB.pinMatches('1111'), false);
  eq('hasStoredPin', AB.hasStoredPin(), true);
  setLocal();
  eq('no PIN set -> no gate', [AB.hasStoredPin(), AB.pinMatches('')], [false, true]);
}

console.log('\n══ backup file — readable by the journal\'s own Data Restore ══');
{
  setLocal({ mpvtr: [T(OLD(1))], mpvf: { why: 'x' }, mpvname: 'Ravi', mpvPin: '-1234' });
  const b = AB.buildBackup(new Date(2026, 8, 12));
  eq('dated', [b.exported, b.version], ['2026-09-12', 'v3']);
  eq('carries the trades', b.db.tr.map((t) => t.id), [OLD(1)]);
  const restore = /function doImport[\s\S]*?var keys=(\[\[[^;]*?\]\]);/.exec(html);
  const restoreKeys = JSON.parse(restore[1].replace(/'/g, '"'));
  eq('every list Data Restore reads is present', restoreKeys.filter(([, s]) => !(s in b.db)).map(([, s]) => s), []);
  eq('never includes the PIN', JSON.stringify(b).includes('-1234'), false);
}

console.log('\n══ no cloud journal yet — the student says it is theirs (claimed_no_row) ══');
{
  // The production case of 2026-09-15: journal on the phone, never synced, no cloud row.
  setLocal({
    mpvtr: [{ id: OLD(40), date: '2026-08-06', inst: 'NIFTY' }, { id: OLD(2), date: '2026-09-08', inst: 'BANKNIFTY' }],
    mpveod: [{ id: OLD(3), date: '2026-09-07' }],
    mpvpm: [{ id: OLD(5), date: 'not-a-date' }],
    mpvname: 'Jyothi',
  }, { mpv_device_id: 'DEV-9' });
  eq('summary shows name, counts and date range (bad dates ignored)', AB.localSummary(),
    { name: 'Jyothi', trades: 2, eods: 1, firstDate: '2026-08-06', lastDate: '2026-09-08' });

  const before = snap();
  const { client, calls } = fakeSupabase(null);
  const r = await AB.verifyUnboundDevice(client, USER_C);
  eq('no cloud row + journal on phone -> refused_no_row (the question is offered)', [r.status, r.reason], ['refused', 'no_row']);
  eq('asking changes nothing on the phone', snap(), before);

  eq('claim binds this account', [AB.claimUnboundDevice(USER_C), AB.readOwner()?.id], [true, USER_C.id]);
  eq('claim refuses once any binding exists', AB.claimUnboundDevice(USER_B), false);

  const res = await JS.pullJournal(client, USER_C);
  eq('normal pull then uploads the phone journal as this account\'s FIRST row',
    [res.status, calls.upserts, calls.upserted?.user_id], ['pushed', 1, USER_C.id]);
  eq('the uploaded journal is exactly what the student was shown',
    [calls.upserted?.data?.mpvtr.map((t) => t.id), calls.upserted?.data?.mpveod.length, calls.upserted?.data?.mpvname],
    [[OLD(40), OLD(2)], 1, 'Jyothi']);
  eq('no delete during a claim', calls.deletes, 0);
}
{
  setLocal();
  eq('empty phone summary is safe', AB.localSummary(), { name: null, trades: 0, eods: 0, firstDate: null, lastDate: null });
}

console.log('\n══ static guards ══');
{
  for (const f of ['src/utils/accountBinding.js', 'src/utils/journalSync.js', 'src/pages/Journal.jsx', 'src/pages/StudentPortal.jsx', 'src/TestTools.jsx', 'src/BackupButton.jsx']) {
    eq(`never deletes a cloud row: no .delete( in ${f}`, /\.delete\s*\(/.test(read(f)), false);
  }
  eq('journal ls() refuses writes once mpvOwner changes', /function ls\(k,v\)\{if\(!ownerOk\(\)\)/.test(html), true);
  eq('More menu has Logout', html.includes("type:'MPV_LOGOUT'"), true);

  const J = read('src/pages/Journal.jsx');
  eq('Journal.jsx calls pushJournal directly in exactly 2 places (guardedPush + pagehide)', [...J.matchAll(/pushJournal\(supabase/g)].length, 2);
  eq('pagehide flush is behind canSync()', /canSync\(\) && isDirty\(\)\) pushJournal/.test(J), true);
  eq('claim success is confirmed by a centred card after reload, not the corner toast',
    [/sessionStorage\.setItem\('mpv_claim_result'/.test(J), /setClaimResult\(JSON\.parse\(raw\)\)/.test(J), /mpv_restore_note', saved/.test(J)],
    [true, true, false]);

  const src = ['src/pages/Journal.jsx', 'src/pages/StudentPortal.jsx', 'src/utils/accountBinding.js'].map(read).join('\n');
  eq('every analytics result literal is a documented value',
    [...src.matchAll(/result:\s*'([a-z_]+)'/g)].map((m) => m[1]).filter((v) => !AB.BINDING_RESULTS.includes(v)), []);
  eq('every refusal reason has a documented refused_* result and a code',
    ['no_row', 'never_synced', 'foreign_records', 'name_mismatch']
      .filter((r) => !AB.BINDING_RESULTS.includes(`refused_${r}`) || !AB.REFUSAL_CODES[r]), []);
  eq('sign-in results documented',
    Object.values(AB.SIGNIN_RESULTS).filter((v) => !AB.BINDING_RESULTS.includes(v)), []);
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
