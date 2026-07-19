// Local-first Supabase sync for the journal.
//
// The journal iframe keeps reading/writing localStorage (instant, offline-safe
// during market hours). This module mirrors that data to the journal_data
// table so a student who switches phones gets their journal back.
//
// Model: one jsonb row per student keyed on the auth user id (works for
// phone-OTP logins whose JWT has no email claim), last-write-wins. Safe
// because the single-device lock means two devices are never active at once.
//
// Status vocabulary (shown on the sync dot — students report these
// differently, so keep them distinct):
//   'offline' — no internet / request never reached the server
//   'error'   — server reached but it refused (RLS, auth, 4xx/5xx)

export const JOURNAL_KEYS = [
  'mpvf', 'mpvpm', 'mpvtr', 'mpveod', 'mpvh', 'mpvpsyd', 'mpvmir',
  'mpvwk', 'mpvmn', 'mpvrules', 'mpvstrat', 'mpvname', 'mpvOnboarded',
  'mpvinsight', // insight-card + milestone tracking (Phase 2 hook layer)
];

const STAMP_KEY = 'mpvCloudUpdatedAt'; // updated_at of the last row we pushed/pulled
const DIRTY_KEY = 'mpvSyncDirty';      // '1' when local has unpushed changes

export function markDirty() { localStorage.setItem(DIRTY_KEY, '1'); }
export function isDirty() { return localStorage.getItem(DIRTY_KEY) === '1'; }
// Forget what this device knows about the cloud — next boot pull restores fresh.
export function resetSyncMarkers() { localStorage.removeItem(STAMP_KEY); localStorage.removeItem(DIRTY_KEY); }

// 'offline' when the request never reached Supabase, 'error' when it did and
// was rejected. PostgREST network failures surface as fetch TypeErrors
// stringified into the error message.
function classifyFailure(e) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'offline';
  const msg = String(e?.message || e || '');
  if (/failed to fetch|network|load failed|fetch failed|timed?\s*out/i.test(msg)) return 'offline';
  return 'error';
}

function hasLocalJournal() {
  // mpvOnboarded alone doesn't count as journal content
  return ['mpvtr', 'mpveod', 'mpvpm', 'mpvf'].some((k) => localStorage.getItem(k));
}

// "Empty" for overwrite-protection purposes: no trades and no EOD reviews.
// (Foundation text alone is not worth protecting a cloud journal for.)
function isEmptyJournal(data) {
  return !((data?.mpvtr || []).length || (data?.mpveod || []).length);
}

// Merge a cloud journal with the local one when both moved independently
// (stale stamp / same email on two devices). Arrays with unique ids are
// unioned (local wins for the same id — it is the active device); scalar
// keys prefer local; streak counters take the max so nobody loses a streak.
const ID_ARRAY_KEYS = ['mpvtr', 'mpveod', 'mpvpm', 'mpvpsyd', 'mpvmir', 'mpvwk', 'mpvmn', 'mpvrules'];
export function mergeJournals(cloud, local) {
  const merged = { ...cloud, ...local };
  for (const k of ID_ARRAY_KEYS) {
    const c = Array.isArray(cloud?.[k]) ? cloud[k] : [];
    const l = Array.isArray(local?.[k]) ? local[k] : [];
    if (!c.length && !l.length) continue;
    const byId = new Map();
    for (const rec of c) byId.set(rec?.id, rec);
    for (const rec of l) byId.set(rec?.id, rec);
    merged[k] = [...byId.values()].sort((a, b) => (a?.id || 0) - (b?.id || 0));
  }
  const ch = cloud?.mpvh, lh = local?.mpvh;
  if (ch || lh) {
    merged.mpvh = {
      g: { ...(ch?.g || {}), ...(lh?.g || {}) },
      s: Math.max(Number(ch?.s || 0), Number(lh?.s || 0)),
      b: Math.max(Number(ch?.b || 0), Number(lh?.b || 0)),
    };
  }
  return merged;
}

export function collectLocal() {
  const data = {};
  for (const k of JOURNAL_KEYS) {
    const v = localStorage.getItem(k);
    if (v !== null) {
      try { data[k] = JSON.parse(v); } catch { /* skip corrupted key */ }
    }
  }
  return data;
}

export function restoreToLocal(data) {
  for (const k of JOURNAL_KEYS) {
    if (data && data[k] !== undefined) localStorage.setItem(k, JSON.stringify(data[k]));
  }
}

// Pull on journal open. `user` is the Supabase auth user (id always present;
// email may be missing for phone-OTP students).
// Returns { status, cloudTrades?, cloudEods? } where status is
// 'restored' | 'pushed' | 'in-sync' | 'blocked-empty' | 'offline' | 'error'.
export async function pullJournal(supabase, user) {
  if (!user?.id) return { status: 'error' };
  try {
    const { data: row, error } = await supabase
      .from('journal_data')
      .select('data, updated_at')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw error;

    if (row) {
      const localStamp = localStorage.getItem(STAMP_KEY);
      const remoteNewer = !localStamp || new Date(row.updated_at) > new Date(localStamp);
      if (!hasLocalJournal() || (remoteNewer && !isDirty())) {
        restoreToLocal(row.data);
        localStorage.setItem(STAMP_KEY, row.updated_at);
        localStorage.removeItem(DIRTY_KEY);
        return { status: 'restored' };
      }
    }
    if (isDirty() || (!row && hasLocalJournal())) {
      // Local changes never made it to the cloud (or first sync ever) — push
      // now. pushJournal carries its own overwrite guards, so a stale dirty
      // flag on an empty device can no longer clobber a real cloud journal.
      const pushed = await pushJournal(supabase, user);
      if (pushed.status === 'synced' || pushed.status === 'merged') return { status: 'pushed' };
      return pushed;
    }
    return { status: 'in-sync' };
  } catch (e) {
    console.warn('[MPV-SYNC] pull failed:', e?.message);
    return { status: classifyFailure(e) };
  }
}

// Push local journal to the cloud, with overwrite protection.
//
// Every push starts by READING the cloud row in the same call — a write can
// never happen without a successful read of what it would replace. Then:
//   - empty local vs non-empty cloud  -> refuse ('blocked-empty') unless
//     the student explicitly confirmed (opts.force)
//   - cloud newer than what this device last saw -> reconcile: merge both,
//     write the merged journal back AND restore it locally ('merged')
//   - otherwise -> plain write ('synced')
//
// Returns { status, cloudTrades?, cloudEods? } where status is
// 'synced' | 'merged' | 'blocked-empty' | 'offline' | 'error'.
export async function pushJournal(supabase, user, opts = {}) {
  if (!user?.id) return { status: 'error' };
  try {
    // Guard 1: read-before-write (also covers "no push without a successful
    // pull this session" — the read IS the freshness check, every time).
    const { data: remote, error: rerr } = await supabase
      .from('journal_data')
      .select('data, updated_at')
      .eq('user_id', user.id)
      .maybeSingle();
    if (rerr) throw rerr;

    let payload = collectLocal();
    const localStamp = localStorage.getItem(STAMP_KEY);
    let didMerge = false;

    if (remote && !opts.force) {
      // Guard 2: an empty journal never silently replaces a real one.
      if (isEmptyJournal(payload) && !isEmptyJournal(remote.data)) {
        console.warn('[MPV-SYNC] push blocked: local journal is empty but cloud has data');
        markDirty();
        return {
          status: 'blocked-empty',
          cloudTrades: (remote.data?.mpvtr || []).length,
          cloudEods: (remote.data?.mpveod || []).length,
        };
      }
      // Guard 3: cloud moved since this device last saw it — merge, don't clobber.
      const cloudNewer = !localStamp || new Date(remote.updated_at) > new Date(localStamp);
      if (cloudNewer) {
        payload = mergeJournals(remote.data, payload);
        restoreToLocal(payload); // device catches up to the reconciled journal
        didMerge = true;
      }
    }

    const updatedAt = new Date().toISOString();
    const { error } = await supabase
      .from('journal_data')
      .upsert(
        {
          user_id: user.id,
          student_email: user.email || null, // informational only, never used for auth
          data: payload,
          updated_at: updatedAt,
        },
        { onConflict: 'user_id' }
      );
    if (error) throw error;
    localStorage.setItem(STAMP_KEY, updatedAt);
    localStorage.removeItem(DIRTY_KEY);
    return { status: didMerge ? 'merged' : 'synced' };
  } catch (e) {
    console.warn('[MPV-SYNC] push failed:', e?.message);
    markDirty(); // keep it queued for retry
    return { status: classifyFailure(e) };
  }
}
