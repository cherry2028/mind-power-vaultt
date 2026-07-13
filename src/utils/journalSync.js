// Local-first Supabase sync for the journal.
//
// The journal iframe keeps reading/writing localStorage (instant, offline-safe
// during market hours). This module mirrors that data to the journal_data
// table so a student who switches phones gets their journal back.
//
// Model: one jsonb row per student, last-write-wins. Safe because the
// single-device lock means two devices are never active at the same time.

export const JOURNAL_KEYS = [
  'mpvf', 'mpvpm', 'mpvtr', 'mpveod', 'mpvh', 'mpvpsyd', 'mpvmir',
  'mpvwk', 'mpvmn', 'mpvrules', 'mpvstrat', 'mpvname', 'mpvOnboarded',
];

const STAMP_KEY = 'mpvCloudUpdatedAt'; // updated_at of the last row we pushed/pulled
const DIRTY_KEY = 'mpvSyncDirty';      // '1' when local has unpushed changes

export function markDirty() { localStorage.setItem(DIRTY_KEY, '1'); }
export function isDirty() { return localStorage.getItem(DIRTY_KEY) === '1'; }

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

// Pull on journal open. Returns 'restored' | 'pushed' | 'in-sync' | 'error'.
export async function pullJournal(supabase, email) {
  try {
    const { data: row, error } = await supabase
      .from('journal_data')
      .select('data, updated_at')
      .eq('student_email', email)
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
      return (await pushJournal(supabase, email)) ? 'pushed' : 'error';
    }
    return 'in-sync';
  } catch (e) {
    console.warn('[MPV-SYNC] pull failed:', e?.message);
    return 'error';
  }
}

// Push local journal to the cloud. Returns true on success.
export async function pushJournal(supabase, email) {
  try {
    const updatedAt = new Date().toISOString();
    const { error } = await supabase
      .from('journal_data')
      .upsert(
        { student_email: email, data: collectLocal(), updated_at: updatedAt },
        { onConflict: 'student_email' }
      );
    if (error) throw error;
    localStorage.setItem(STAMP_KEY, updatedAt);
    localStorage.removeItem(DIRTY_KEY);
    return true;
  } catch (e) {
    console.warn('[MPV-SYNC] push failed:', e?.message);
    markDirty(); // keep it queued for retry
    return false;
  }
}
