// Account binding — a device's local journal belongs to exactly ONE account.
//
// THE BUG THIS CLOSES: localStorage belongs to the browser, not the account.
// Nothing ever cleared the journal keys when a different account signed in on
// the same device, and the sync stamp was not account-scoped, so account B
// could push account A's journal into B's cloud row, or merge the two.
//
// THE RULE: refusing beats guessing.
//   - A device is bound (mpvOwner) to the account that owns its local journal.
//   - Signing in as a DIFFERENT account clears the person's keys first — but
//     only when the previous account has nothing unsynced. Otherwise sign-in is
//     refused: losing someone's unsynced work to a convenience is the worse
//     outcome.
//   - A device that already holds journal data but has no binding (every
//     device on its first open after this shipped) is bound only when the data
//     can be PROVEN to belong to the signed-in account. Otherwise sync is
//     refused and nothing is deleted.
//
// Nothing in this module ever writes to, or deletes from, the cloud.

import {
  JOURNAL_KEYS, ID_ARRAY_KEYS, STAMP_KEY, DIRTY_KEY,
  collectLocal, isDirty, classifyFailure,
} from './journalSync.js';

// Local only — deliberately NOT in JOURNAL_KEYS, so it never syncs.
export const OWNER_KEY = 'mpvOwner';

// Everything that belongs to the PERSON rather than the device (mpvname is one
// of JOURNAL_KEYS). Deliberately kept: mpv_device_id (identifies the device for
// the single-device lock), the trade-form defaults (mpvLotSize / mpvPairs /
// mpvSeg) and the review / push-notification flags.
export const ACCOUNT_KEYS = [...JOURNAL_KEYS, 'mpvPin', STAMP_KEY, DIRTY_KEY];

// Every value the `journal_binding` analytics event can carry, as its `result`
// parameter. Result only — never an email, a user id or a record id.
export const BINDING_RESULTS = [
  // portal, at sign-in
  'signin_bound_new_device',        // no binding, nothing on the phone -> bound
  'signin_deferred',                // no binding, journal data present -> journal's first-open proof decides
  'signin_switch_cleared',          // different account, previous one fully synced -> keys cleared, rebound
  'signin_switch_refused_unsynced', // different account, previous one has unsynced changes -> sign-in refused
  // journal, first open of an unbound device
  'bound_blank',                    // nothing on the phone -> bound
  'bound_proven',                   // proof passed -> bound silently
  'refused_no_row',                 // proof failed: this account has no cloud journal
  'refused_never_synced',           // proof failed: this phone never synced
  'refused_foreign_records',        // proof failed: records older than the last sync that this account's cloud lacks
  'refused_name_mismatch',          // proof failed: phone and cloud names differ, nothing unsynced
  'unverified_offline',             // proof could not read the cloud (no internet) -> no sync this session
  'unverified_error',               // proof could not read the cloud (server refused) -> no sync this session
  // journal, any time
  'mismatch_locked',                // local storage belongs to a different account than the session
  'sync_blocked_host',              // host/database pairing not allowed (deployTarget.js)
  // logout
  'logout_done',
  'logout_refused_unsynced',
  'logout_after_backup',            // unbound device: student took a backup and confirmed twice
];

// Shown to the student on the refusal screen; they read it out to the mentor.
export const REFUSAL_CODES = {
  no_row: 'NO_CLOUD_ROW',
  never_synced: 'NEVER_SYNCED',
  foreign_records: 'FOREIGN_RECORDS',
  name_mismatch: 'NAME_MISMATCH',
};

function readJSON(key) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? null : JSON.parse(v);
  } catch {
    return null;
  }
}

export function readOwner() {
  const o = readJSON(OWNER_KEY);
  return o && typeof o === 'object' && typeof o.id === 'string' && o.id ? o : null;
}

export function writeOwner(user) {
  localStorage.setItem(OWNER_KEY, JSON.stringify({ id: user.id, email: user.email || null }));
}

// Local only. Never touches the cloud.
export function clearAccountData() {
  for (const k of ACCOUNT_KEYS) localStorage.removeItem(k);
  localStorage.removeItem(OWNER_KEY);
}

export function maskEmail(email) {
  if (!email) return 'ఈ account';
  const m = /^(.)[^@]*(@.+)$/.exec(String(email));
  return m ? `${m[1]}***${m[2]}` : '***';
}

function isBlank(v) {
  if (v === null || v === undefined || v === false || v === 0) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') return Object.values(v).every(isBlank);
  return false;
}

// Bookkeeping the app writes on its own, which says nothing about whose journal
// this is.
const IGNORED_KEYS = new Set(['mpvOnboarded']);
const IGNORED_FIELDS = { mpvf: ['_firstDay', '_build'] };

// "Nothing on this phone worth protecting": no records, no name, no foundation
// or strategy text. Stricter than "no trades" on purpose — anything personal
// sends the device to the proof instead.
export function isBlankDevice(local = collectLocal()) {
  return Object.entries(local).every(([k, v]) => {
    if (IGNORED_KEYS.has(k)) return true;
    if (IGNORED_FIELDS[k] && v && typeof v === 'object' && !Array.isArray(v)) {
      const rest = { ...v };
      for (const f of IGNORED_FIELDS[k]) delete rest[f];
      return isBlank(rest);
    }
    return isBlank(v);
  });
}

function idOf(rec) {
  const v = rec?.id;
  return v === null || v === undefined || v === '' ? null : String(v);
}

// THE FIRST-OPEN PROOF. Pure — no storage, no network.
//
// Record ids are the creation timestamp (Date.now()). Every push writes the
// whole local journal, so after any successful sync everything on the phone is
// in the cloud. A local record that is OLDER than the last sync and missing
// from this account's cloud row can therefore only have come from another
// account.
//
// Proven when ALL hold:
//   1. this account has a cloud row, and this phone has synced before;
//   2. every local record is in this account's cloud row (same list, same id)
//      or was created after this phone's last sync;
//   3. with nothing unsynced, the phone's name does not differ from the cloud's.
export function proveOwnership({ local, row, stamp, dirty }) {
  if (!row) return { ok: false, reason: 'no_row' };
  const stampMs = Date.parse(stamp || '');
  if (!Number.isFinite(stampMs)) return { ok: false, reason: 'never_synced' };

  const cloud = row.data || {};
  for (const k of ID_ARRAY_KEYS) {
    const recs = Array.isArray(local?.[k]) ? local[k] : [];
    if (!recs.length) continue;
    const cloudIds = new Set((Array.isArray(cloud[k]) ? cloud[k] : []).map(idOf).filter(Boolean));
    for (const rec of recs) {
      const id = idOf(rec);
      if (id !== null && cloudIds.has(id)) continue;
      const created = Number(id);
      if (id !== null && Number.isFinite(created) && created > stampMs) continue;
      return { ok: false, reason: 'foreign_records' };
    }
  }

  if (!dirty) {
    const ln = local?.mpvname, cn = cloud.mpvname;
    if (!isBlank(ln) && !isBlank(cn) && JSON.stringify(ln) !== JSON.stringify(cn)) {
      return { ok: false, reason: 'name_mismatch' };
    }
  }
  return { ok: true, reason: 'proven' };
}

// First open of a device with no binding. Binds (writes mpvOwner) or refuses.
// Never deletes, never restores, never pushes — the caller runs the normal pull
// only after 'bound'.
// Returns { status: 'bound' | 'refused' | 'offline' | 'error', result, reason? }.
export async function verifyUnboundDevice(supabase, user) {
  const local = collectLocal();
  if (isBlankDevice(local)) {
    writeOwner(user);
    return { status: 'bound', result: 'bound_blank' };
  }

  let row;
  try {
    const { data, error } = await supabase
      .from('journal_data')
      .select('data, updated_at')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw error;
    row = data;
  } catch (e) {
    const status = classifyFailure(e);
    return { status, result: status === 'offline' ? 'unverified_offline' : 'unverified_error' };
  }

  const proof = proveOwnership({ local, row, stamp: localStorage.getItem(STAMP_KEY), dirty: isDirty() });
  if (proof.ok) {
    writeOwner(user);
    return { status: 'bound', result: 'bound_proven' };
  }
  return { status: 'refused', reason: proof.reason, result: `refused_${proof.reason}` };
}

// Portal, after the subscription check and BEFORE the device claim.
//   same   — this device is already bound to this account
//   bind   — no binding and nothing on the phone: bind now
//   defer  — no binding but journal data present: the journal's proof decides
//   refuse — a different account, whose changes are not all in the cloud
//   switch — a different account, fully synced: clear its keys and rebind
export function decideSignIn(user) {
  const owner = readOwner();
  if (owner && owner.id === user.id) return { action: 'same' };
  if (!owner) return isBlankDevice() ? { action: 'bind' } : { action: 'defer' };
  if (isDirty()) return { action: 'refuse', previousEmail: owner.email || null };
  return { action: 'switch', previousEmail: owner.email || null };
}

export function applySignIn(decision, user) {
  if (decision.action === 'bind') writeOwner(user);
  if (decision.action === 'switch') {
    clearAccountData();
    writeOwner(user);
  }
}

export const SIGNIN_RESULTS = {
  bind: 'signin_bound_new_device',
  defer: 'signin_deferred',
  switch: 'signin_switch_cleared',
  refuse: 'signin_switch_refused_unsynced',
};

// ── PIN (same hash as the journal's own PIN screen, journal-content.html) ────
export function hashPin(p) {
  let h = 0;
  for (let i = 0; i < p.length; i++) { h = ((h << 5) - h) + p.charCodeAt(i); h |= 0; }
  return h.toString();
}
export function hasStoredPin() { return !!readJSON('mpvPin'); }
export function pinMatches(input) {
  const stored = readJSON('mpvPin');
  return !stored || hashPin(String(input ?? '')) === stored;
}

// ── BACKUP — same shape as the journal's own "Full Data Backup (JSON)", so
// More → Export → Data Restore reads it back. ─────────────────────────────────
const BACKUP_MAP = [
  ['mpvf', 'f'], ['mpvpm', 'pm'], ['mpvtr', 'tr'], ['mpveod', 'eod'], ['mpvh', 'h'],
  ['mpvpsyd', 'psyday'], ['mpvmir', 'mirror'], ['mpvwk', 'weekly'], ['mpvmn', 'monthly'],
  ['mpvrules', 'rules'], ['mpvstrat', 'strategy'], ['mpvinsight', 'insight'],
];
const EMPTY_DB = () => ({
  f: {}, pm: [], tr: [], eod: [], h: { g: {}, s: 0, b: 0 }, psyday: [], mirror: [],
  weekly: [], monthly: [], rules: [], strategy: {}, insight: {},
});

function ymd(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function buildBackup(now = new Date()) {
  const local = collectLocal();
  const db = EMPTY_DB();
  for (const [k, short] of BACKUP_MAP) if (local[k] !== undefined && local[k] !== null) db[short] = local[k];
  return { exported: ymd(now), version: 'v3', name: local.mpvname ?? null, db };
}

// Browser only.
export function downloadBackupFile() {
  const data = buildBackup();
  const fileName = `MPV_Backup_${data.exported}.json`;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return fileName;
}
