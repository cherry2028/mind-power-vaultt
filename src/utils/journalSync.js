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
];

const STAMP_KEY = 'mpvCloudUpdatedAt'; // updated_at of the last row we pushed/pulled
const DIRTY_KEY = 'mpvSyncDirty';      // '1' when local has unpushed changes

export function markDirty() { localStorage.setItem(DIRTY_KEY, '1'); }
export function isDirty() { return localStorage.getItem(DIRTY_KEY) === '1'; }

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
// Returns 'restored' | 'pushed' | 'in-sync' | 'offline' | 'error'.
export async function pullJournal(supabase, user) {
  if (!user?.id) return 'error';
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
        return 'restored';
      }
    }
    if (isDirty() || (!row && hasLocalJournal())) {
      // Local changes never made it to the cloud (or first sync ever) — push now.
      const pushed = await pushJournal(supabase, user);
      return pushed === 'synced' ? 'pushed' : pushed;
    }
    return 'in-sync';
  } catch (e) {
    console.warn('[MPV-SYNC] pull failed:', e?.message);
    return classifyFailure(e);
  }
}

// Push local journal to the cloud. Returns 'synced' | 'offline' | 'error'.
export async function pushJournal(supabase, user) {
  if (!user?.id) return 'error';
  try {
    const updatedAt = new Date().toISOString();
    const { error } = await supabase
      .from('journal_data')
      .upsert(
        {
          user_id: user.id,
          student_email: user.email || null, // informational only, never used for auth
          data: collectLocal(),
          updated_at: updatedAt,
        },
        { onConflict: 'user_id' }
      );
    if (error) throw error;
    localStorage.setItem(STAMP_KEY, updatedAt);
    localStorage.removeItem(DIRTY_KEY);
    return 'synced';
  } catch (e) {
    console.warn('[MPV-SYNC] push failed:', e?.message);
    markDirty(); // keep it queued for retry
    return classifyFailure(e);
  }
}
