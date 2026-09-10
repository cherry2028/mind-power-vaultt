// Phase 0 — additive-safe cloud sync.
//
// Unlike verdict/risk-engine, this imports the REAL src/utils/journalSync.js —
// no mirrored copy. The whole point is that the shipped write path preserves
// top-level keys it does not own, so testing a copy would prove nothing.
//
// The contract being locked down:
//   1. A key the client does not manage survives a push.
//   2. Keys the client DOES manage still overwrite the cloud, exactly as before.
//   3. Guard 2 (empty local vs real cloud) is NOT weakened by re-basing.
//   4. opts.force still means force.

// ── stub the browser globals journalSync expects, before importing it ────────
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};
// `navigator` is read-only in Node 24 and journalSync only reads navigator.onLine
// inside classifyFailure(), which none of these tests reach. Left alone on purpose.

const { pushJournal, mergeJournals, collectLocal } = await import('../src/utils/journalSync.js');

let pass = 0, fail = 0;
function eq(name, got, expected) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  if (ok) pass++; else fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) console.log(`      got      ${JSON.stringify(got)}\n      expected ${JSON.stringify(expected)}`);
}

// ── a minimal Supabase double that records what would be written ────────────
function fakeSupabase(remoteRow) {
  const captured = { upserted: null, calls: 0 };
  const api = {
    from() { return api; },
    select() { return api; },
    eq() { return api; },
    async maybeSingle() { return { data: remoteRow, error: null }; },
    async upsert(row) { captured.calls++; captured.upserted = row; return { error: null }; },
  };
  return { client: api, captured };
}

const USER = { id: 'u-1', email: 'student@example.com' };
function setLocal(obj) {
  store.clear();
  for (const [k, v] of Object.entries(obj)) store.set(k, JSON.stringify(v));
}
const TRADE = (id) => ({ id, date: '2026-09-10', inst: 'NIFTY', pnl: 100, pln: true });

console.log('\n══ mergeJournals — unknown keys ══');
eq('unknown cloud key survives a merge',
  mergeJournals({ inbox: [{ bkey: 'a:1' }], mpvtr: [] }, { mpvtr: [] }).inbox,
  [{ bkey: 'a:1' }]);
eq('unknown key present on both — local wins (documented behaviour)',
  mergeJournals({ zz: 'cloud' }, { zz: 'local' }).zz, 'local');
eq('known key still merges by id, not overwritten wholesale',
  mergeJournals({ mpvtr: [TRADE(1)] }, { mpvtr: [TRADE(2)] }).mpvtr.map(t => t.id), [1, 2]);
eq('streak counters still take the max',
  mergeJournals({ mpvh: { g: {}, s: 9, b: 12 } }, { mpvh: { g: {}, s: 3, b: 4 } }).mpvh,
  { g: {}, s: 9, b: 12 });

console.log('\n══ pushJournal — the plain-write path ══');
{
  setLocal({ mpvtr: [TRADE(2)], mpveod: [{ id: 9, date: '2026-09-10' }] });
  localStorage.setItem('mpvCloudUpdatedAt', '2026-09-10T12:00:00.000Z');
  const remote = {
    data: { mpvtr: [TRADE(1)], inbox: [{ bkey: 'angelone:555' }], someFutureKey: { a: 1 } },
    updated_at: '2026-09-10T11:00:00.000Z', // older than local stamp -> no merge path
  };
  const { client, captured } = fakeSupabase(remote);
  const res = await pushJournal(client, USER);
  eq('status is a plain synced write', res.status, 'synced');
  eq('foreign key `inbox` survives', captured.upserted.data.inbox, [{ bkey: 'angelone:555' }]);
  eq('a second foreign key survives too', captured.upserted.data.someFutureKey, { a: 1 });
  eq('client-owned mpvtr still fully overwrites the cloud',
    captured.upserted.data.mpvtr.map(t => t.id), [2]);
  eq('client-owned mpveod still written', captured.upserted.data.mpveod.map(e => e.id), [9]);
}

console.log('\n══ pushJournal — merge path also preserves ══');
{
  setLocal({ mpvtr: [TRADE(2)] });
  localStorage.setItem('mpvCloudUpdatedAt', '2026-09-10T10:00:00.000Z');
  const remote = {
    data: { mpvtr: [TRADE(1)], inbox: [{ bkey: 'delta:77' }] },
    updated_at: '2026-09-10T12:00:00.000Z', // NEWER than the stamp -> merge path
  };
  const { client, captured } = fakeSupabase(remote);
  const res = await pushJournal(client, USER);
  eq('status is merged', res.status, 'merged');
  eq('foreign key survives the merge path', captured.upserted.data.inbox, [{ bkey: 'delta:77' }]);
  eq('trades unioned by id across both sides',
    captured.upserted.data.mpvtr.map(t => t.id), [1, 2]);
}

console.log('\n══ Guard 2 is NOT weakened by re-basing ══');
{
  // The regression this guards against: if the payload were re-based BEFORE the
  // guard, an empty device would inherit the cloud's trades, look non-empty,
  // and sail straight past the overwrite protection.
  setLocal({ mpvtr: [], mpveod: [] });
  localStorage.setItem('mpvCloudUpdatedAt', '2026-09-10T12:00:00.000Z');
  const remote = {
    data: { mpvtr: [TRADE(1), TRADE(2)], mpveod: [{ id: 5 }], inbox: [{ bkey: 'x:1' }] },
    updated_at: '2026-09-10T11:00:00.000Z',
  };
  const { client, captured } = fakeSupabase(remote);
  const res = await pushJournal(client, USER);
  eq('empty local vs real cloud is still blocked', res.status, 'blocked-empty');
  eq('cloud trade count reported to the overlay', res.cloudTrades, 2);
  eq('nothing was written', captured.calls, 0);
}

console.log('\n══ opts.force still means force ══');
{
  setLocal({ mpvtr: [], mpveod: [] });
  const remote = {
    data: { mpvtr: [TRADE(1)], inbox: [{ bkey: 'x:1' }] },
    updated_at: '2026-09-10T11:00:00.000Z',
  };
  const { client, captured } = fakeSupabase(remote);
  const res = await pushJournal(client, USER, { force: true });
  eq('force writes', res.status, 'synced');
  eq('force does NOT resurrect the cloud trades', captured.upserted.data.mpvtr, []);
  eq('force does NOT preserve foreign keys either', captured.upserted.data.inbox, undefined);
}

console.log('\n══ first-ever sync (no cloud row) ══');
{
  setLocal({ mpvtr: [TRADE(1)] });
  const { client, captured } = fakeSupabase(null);
  const res = await pushJournal(client, USER);
  eq('new user pushes cleanly', res.status, 'synced');
  eq('payload is just the local journal', Object.keys(captured.upserted.data).sort(), ['mpvtr']);
}

console.log('\n══ collectLocal is unchanged (guards depend on it) ══');
{
  setLocal({ mpvtr: [TRADE(1)], inbox: [{ bkey: 'never' }] });
  eq('collectLocal still returns ONLY whitelisted keys',
    Object.keys(collectLocal()).sort(), ['mpvtr']);
}

console.log('\n══ round trip: a foreign key survives repeated pushes ══');
{
  let cloud = { data: { mpvtr: [TRADE(1)], inbox: [{ bkey: 'keep:me' }] }, updated_at: '2026-09-10T11:00:00.000Z' };
  for (let i = 0; i < 3; i++) {
    setLocal({ mpvtr: [TRADE(1)] });
    localStorage.setItem('mpvCloudUpdatedAt', '2026-09-10T12:00:00.000Z');
    const { client, captured } = fakeSupabase(cloud);
    await pushJournal(client, USER);
    cloud = { data: captured.upserted.data, updated_at: captured.upserted.updated_at };
  }
  eq('still present after 3 pushes', cloud.data.inbox, [{ bkey: 'keep:me' }]);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
