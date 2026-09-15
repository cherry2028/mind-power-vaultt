import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// Import the journal HTML as raw string — bundled in JS, never publicly accessible
import journalHtml from '../journal-content.html?raw';
import { BUILD_ID, hardReset } from '../pwa';

import { supabase } from '../supabase';
import { generateWeeklyPdf } from '../utils/weeklyPdf';
import { pullJournal, pushJournal, markDirty, isDirty, resetSyncMarkers } from '../utils/journalSync';
import { OWNER_KEY, REFUSAL_CODES, readOwner, maskEmail, verifyUnboundDevice, clearAccountData, localSummary, claimUnboundDevice } from '../utils/accountBinding';
import { TARGET, SHOW_PREVIEW_BANNER, PREVIEW_BANNER_HEIGHT } from '../utils/deployTarget';
import { MENTOR_WHATSAPP, mentorWaUrl } from '../utils/mentorContact';
import { buildLicenseCardHtml, buildInsightCardHtml, buildMilestoneCardHtml, generateCardImage } from '../utils/shareCards';
import Seo from '../Seo';
import PushOptIn from '../PushOptIn';
import ReviewRequest from '../ReviewRequest';
import BackupButton from '../BackupButton';
import { track } from '../analytics';

const CARD_BUILDERS = {
  license: { build: buildLicenseCardHtml, file: (p) => `MPV_License_${p.date}.png` },
  insight: { build: buildInsightCardHtml, file: (p) => `MPV_Mirror_${p.date}.png` },
  milestone: { build: buildMilestoneCardHtml, file: (p) => `MPV_Streak_${p.days}days.png` },
};

const WA_TEXT = 'Weekly report పంపుతున్నాను 📊 — Mind Power Vaultt Journal';

// ═══ SERVER-SIDE ENTITLEMENT GATE ═══
// The portal's expires_at read (StudentPortal.jsx) is UX — fast feedback, and
// trivially skipped by anyone who sets a session token by hand. THIS is the
// control: check_entitlement() runs inside Postgres under the caller's own JWT,
// takes no parameters, and cannot be edited from devtools.
const ENTITLEMENT_MSG = {
  no_subscription: 'ఈ email కి active subscription కనిపించలేదు. Journal వాడాలంటే Portal లో subscription తీసుకోండి.',
  expired: 'మీ subscription expire అయింది. Renew చేసి మళ్ళీ login అవ్వండి.',
  cancelled: 'మీ subscription ఇప్పుడు active గా లేదు. Cherry ని contact చేయండి.',
  no_email: 'ఈ account కి email లేదు. Email OTP తో login అవ్వండి.',
};

// Fails OPEN on any transport/server error. A Supabase outage must never lock
// out a paying student mid-session — the DB-side grants are what actually stop
// privilege escalation, so a degraded read here costs nothing.
async function checkEntitlement(client) {
  try {
    const { data, error } = await client.rpc('check_entitlement');
    if (error) throw error;
    if (!data || typeof data.allowed !== 'boolean') throw new Error('malformed entitlement response');
    return data;
  } catch (err) {
    console.error('[MPV-ENTITLEMENT] check failed — failing open:', err?.message || err);
    return { allowed: true, reason: 'ok', degraded: true };
  }
}

const FONT = "'DM Sans','Noto Sans Telugu',sans-serif";

// 2026-09-08 -> "8 Sept 2026" for the no-cloud-journal summary.
const fmtDay = (d) => {
  if (!d) return '—';
  const t = new Date(`${d}T00:00:00`);
  return Number.isNaN(t.getTime()) ? '—' : t.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function Journal() {
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const [dataReady, setDataReady] = useState(false); // cloud pull finished (or not applicable)
  const [showReview, setShowReview] = useState(false); // Feature 4: review request
  const reviewCheckedRef = useRef(false);              // decide once per page load
  const [pdfShare, setPdfShare] = useState(null); // {status:'generating'|'ready'|'error', ...}
  const [syncConflict, setSyncConflict] = useState(null); // {cloudTrades, cloudEods} — empty local vs real cloud
  const [cardShare, setCardShare] = useState(null); // {status:'generating'|'ready'|'error', kind, file, url, fileName, hint}
  const [refusal, setRefusal] = useState(null);          // {reason, account} — unbound phone, ownership not proven
  const [refusalOpen, setRefusalOpen] = useState(false);
  const [mismatch, setMismatch] = useState(null);        // {owner, current} — storage belongs to another account
  const [logout, setLogout] = useState(null);            // {stage:'confirm'|'working'|'failed'|'unsafe', backupTaken?}
  const [loggingOut, setLoggingOut] = useState(false);   // unmounts the iframe before storage is cleared
  const [claim, setClaim] = useState(null);              // {stage:'working'|'failed'} — "అవును, నాది" upload
  const [claimResult, setClaimResult] = useState(null);  // {saved, trades, eods} — success card after that reload
  const iframeRef = useRef(null);
  const bootRef = useRef('no');         // 'no' | 'running' | 'done' — binding + cloud pull, once per page load
  const bindingRef = useRef('pending'); // 'pending' | 'bound' | 'refused' | 'unverified' | 'local' | 'mismatch' | 'logged-out'
  const ownerRawRef = useRef(null);     // mpvOwner as it stood when this page finished booting
  const refusedUserRef = useRef(null);  // {id, email} a refused phone signed in with (for "అవును, నాది")
  const syncUserRef = useRef(null);     // {id, email?} — null = no sync this session
  const syncStatusRef = useRef('off');  // 'synced' | 'syncing' | 'offline' | 'error' | 'paused' | 'unverified' | 'off'
  const navigate = useNavigate();

  const postSyncStatus = (status) => {
    if (status) syncStatusRef.current = status;
    try {
      iframeRef.current?.contentWindow?.postMessage(
        { type: 'MPV_SYNC_STATUS', status: syncStatusRef.current }, '*');
    } catch { /* iframe not ready yet — it will ask via MPV_HELLO */ }
  };

  // Tell the journal iframe to re-read localStorage (after a merge/restore
  // changed it underneath a live journal).
  const postReloadDb = (note) => {
    try {
      iframeRef.current?.contentWindow?.postMessage({ type: 'MPV_RELOAD_DB', note: note || '' }, '*');
    } catch { /* ignore */ }
  };

  // Shared handling for a push outcome (statuses come from journalSync).
  const handlePushResult = (result) => {
    if (result.status === 'refused') return; // binding guard stopped it — its own screen is already showing
    if (result.status === 'blocked-empty') {
      setSyncConflict({ cloudTrades: result.cloudTrades, cloudEods: result.cloudEods });
      postSyncStatus('error');
      return;
    }
    if (result.status === 'merged') {
      postReloadDb('Journal cloud తో sync అయింది ✦');
      postSyncStatus('synced');
      return;
    }
    postSyncStatus(result.status); // 'synced' | 'offline' | 'error'
  };

  // ═══ ACCOUNT BINDING (see utils/accountBinding.js) ═══
  // Sync may run only when ALL hold: this host/database pairing is allowed,
  // the phone is bound, and it is bound to the account we are syncing as.
  const canSync = () =>
    TARGET.syncAllowed &&
    bindingRef.current === 'bound' &&
    !!syncUserRef.current &&
    readOwner()?.id === syncUserRef.current.id;

  // Local storage now belongs to a different account than this page started
  // with (another tab signed in or out, or the session itself changed). Stop
  // every push, take the journal down, and say so. Deletes nothing.
  const lockMismatch = (currentEmail) => {
    if (bindingRef.current === 'mismatch' || bindingRef.current === 'logged-out') return;
    const was = syncUserRef.current;
    bindingRef.current = 'mismatch';
    syncUserRef.current = null;
    const owner = readOwner();
    // "current" = the account THIS page was using. When another tab signed a
    // different account in, the live session already belongs to that other
    // account, so the page's own account is the one to name.
    setMismatch({ owner: owner ? maskEmail(owner.email) : null, current: maskEmail(was?.email || currentEmail) });
    track('journal_binding', { result: 'mismatch_locked' });
  };

  // Every push from this page goes through here: the binding must still match,
  // and the live session must still be the account we bound to.
  const guardedPush = async (opts) => {
    if (!canSync()) {
      if (bindingRef.current === 'bound') lockMismatch();
      return { status: 'refused' };
    }
    const { data, error: sessionError } = await supabase.auth.getSession();
    const session = data?.session;
    if (sessionError || !session) {
      // Token refresh failed (usually offline) — not evidence of another account.
      return { status: typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'error' };
    }
    if (session.user.id !== syncUserRef.current.id) {
      lockMismatch(session.user.email);
      return { status: 'refused' };
    }
    return pushJournal(supabase, syncUserRef.current, opts);
  };

  // First validation of this page load: decide the binding, then the normal
  // cloud pull — BEFORE the journal iframe boots, so a student on a new phone
  // sees their restored journal immediately.
  const bootAccount = async (user) => {
    const owner = readOwner();
    if (owner && owner.id !== user.id) {
      lockMismatch(user.email);
      return;
    }

    if (!TARGET.syncAllowed) {
      bindingRef.current = 'local';
      syncUserRef.current = null;
      syncStatusRef.current = 'off';
      console.error('[MPV-SYNC] sync refused — host/database pairing not allowed:', TARGET.hostname, TARGET.db);
      track('journal_binding', { result: 'sync_blocked_host' });
      return;
    }

    if (!owner) {
      // First open of this phone since binding shipped (or a phone whose
      // binding was never written). Bind only on proof; never delete.
      const v = await verifyUnboundDevice(supabase, user);
      track('journal_binding', { result: v.result });
      if (v.status === 'refused') {
        bindingRef.current = 'refused';
        syncUserRef.current = null;
        syncStatusRef.current = 'paused';
        refusedUserRef.current = { id: user.id, email: user.email || null };
        // What is on the phone — a no_row student must SEE it before being asked.
        setRefusal({ reason: v.reason, account: maskEmail(user.email), summary: localSummary(), declined: false });
        setRefusalOpen(true);
        return;
      }
      if (v.status !== 'bound') {
        // Could not read the cloud. No sync this session; the next open retries.
        bindingRef.current = 'unverified';
        syncUserRef.current = null;
        syncStatusRef.current = 'unverified';
        return;
      }
    }

    // Keyed on user.id: present for every auth method incl. phone OTP.
    bindingRef.current = 'bound';
    syncUserRef.current = { id: user.id, email: user.email || null };
    const result = await pullJournal(supabase, syncUserRef.current);
    if (result.status === 'restored') {
      sessionStorage.setItem('mpv_restore_note', 'మీ journal cloud నుండి restore అయింది ✦');
    }
    if (result.status === 'blocked-empty') {
      // Stale dirty flag on a near-empty device vs a real cloud journal —
      // never auto-resolve; the student decides via the conflict overlay.
      setSyncConflict({ cloudTrades: result.cloudTrades, cloudEods: result.cloudEods });
      syncStatusRef.current = 'error';
    } else {
      syncStatusRef.current =
        (result.status === 'offline' || result.status === 'error') ? result.status : 'synced';
    }
  };

  // ═══ LOGOUT ═══
  const startLogout = () => {
    if (bindingRef.current === 'mismatch' || bindingRef.current === 'logged-out') return;
    // A phone whose journal is not proven to be in this account's cloud must
    // not be cleared on a single tap.
    setLogout(bindingRef.current === 'bound' ? { stage: 'confirm' } : { stage: 'unsafe', backupTaken: false });
  };

  const finishLogout = async (result) => {
    track('journal_binding', { result });
    bindingRef.current = 'logged-out';
    syncUserRef.current = null;
    setLogout({ stage: 'working' });
    setLoggingOut(true); // unmount the iframe first, so nothing can write the keys back
    await new Promise((r) => setTimeout(r, 150));
    clearAccountData(); // local only — the cloud journal is never touched
    ['mpv_journal_token', 'mpv_journal_access', 'mpv_restore_note'].forEach((k) => sessionStorage.removeItem(k));
    try { await supabase.auth.signOut({ scope: 'local' }); } catch { /* the app token is already gone */ }
    window.location.replace('/portal');
  };

  const confirmLogout = async () => {
    setLogout({ stage: 'working' });
    if (isDirty()) {
      postSyncStatus('syncing');
      const result = await guardedPush();
      if (result.status === 'refused') { setLogout(null); return; } // the mismatch lock took over
      if (result.status !== 'synced' && result.status !== 'merged') {
        track('journal_binding', { result: 'logout_refused_unsynced' });
        handlePushResult(result); // blocked-empty opens the existing conflict screen
        setLogout(result.status === 'blocked-empty' ? null : { stage: 'failed' });
        return;
      }
    }
    await finishLogout('logout_done');
  };

  const unsafeLogout = () => {
    if (!window.confirm('చివరి confirmation: ఈ phone నుండి journal, PIN తీసేస్తాం. Backup file లేకపోతే ఈ data తిరిగి రాదు. Logout చేయాలా?')) return;
    finishLogout('logout_after_backup');
  };

  // Mismatch screen: sign this page out and go back through the portal, where
  // the sign-in rules decide what happens to this phone's storage.
  const relogin = async () => {
    try { await supabase.auth.signOut({ scope: 'local' }); } catch { /* best effort */ }
    sessionStorage.removeItem('mpv_journal_token');
    sessionStorage.removeItem('mpv_journal_access');
    window.location.replace('/portal');
  };

  // ═══ NO CLOUD JOURNAL YET — "ఈ phone లో ఉన్న journal మీదేనా?" ═══
  // refused_no_row: this account has never had a cloud journal, so the proof has
  // nothing to compare against. The student has seen the name, counts and dates
  // and knows whose journal it is. A "yes" can only create this account's FIRST
  // cloud row — nothing existing is overwritten or mixed (utils/accountBinding.js).
  const claimNoRow = async () => {
    const user = refusedUserRef.current;
    if (!user || bindingRef.current !== 'refused' || !TARGET.syncAllowed) return;
    setClaim({ stage: 'working' }); // unmounts the journal: nothing writes while the binding changes
    await new Promise((r) => setTimeout(r, 150));

    // Re-check right before binding — a cloud row may exist by now.
    const v = await verifyUnboundDevice(supabase, user);
    if (v.status === 'refused' && v.reason === 'no_row') {
      if (!claimUnboundDevice(user)) { window.location.reload(); return; }
      track('journal_binding', { result: 'claimed_no_row' });
    } else if (v.status === 'refused') {
      // No longer a no_row case: the normal refusal applies. Never claim over a cloud journal.
      track('journal_binding', { result: v.result });
      window.location.reload();
      return;
    } else if (v.status !== 'bound') {
      setClaim({ stage: 'failed' }); // could not reach the cloud; nothing was bound
      return;
    } else {
      track('journal_binding', { result: v.result }); // proof now passes on its own
    }

    // Bound. The normal pull uploads the phone's journal (no row + local data -> push).
    const result = await pullJournal(supabase, user);
    const saved = result.status === 'pushed' || result.status === 'in-sync' || result.status === 'restored';
    // Confirmed after the reload by a centred card on THIS page, once the journal
    // is unlocked (MPV_HELLO) — not the journal's small corner toast, which the
    // reminder / install / update prompts sit on top of. A scared student must see it.
    const s = localSummary();
    sessionStorage.setItem('mpv_claim_result', JSON.stringify({ saved, trades: s.trades, eods: s.eods }));
    window.location.reload();
  };

  const declineNoRow = () => {
    track('journal_binding', { result: 'declined_no_row' });
    setRefusal((r) => ({ ...r, declined: true }));
  };

  // Analytics: journal session opened (fires once per page load, after auth +
  // data-ready). Standalone effect — reads nothing the sync engine writes.
  useEffect(() => {
    if (!authorized || !dataReady) return;
    const token = sessionStorage.getItem('mpv_journal_token') || '';
    track('journal_opened', { login_mode: token.startsWith('EMERGENCY_') ? 'emergency' : 'account' });
  }, [authorized, dataReady]);

  // Feature 4: after every 10 opens, ask an account-mode student for a review.
  // Counts once per page load; only account logins (real Supabase session) can
  // submit, so only they are counted. Stops permanently once a review is given.
  useEffect(() => {
    if (!authorized || !dataReady || reviewCheckedRef.current) return;
    reviewCheckedRef.current = true;
    if (!syncUserRef.current) return;                          // no synced account this session — can't submit
    if (localStorage.getItem('mpvReviewed') === '1') return;   // already reviewed — never nag
    const opens = (parseInt(localStorage.getItem('mpvJournalOpens') || '0', 10) || 0) + 1;
    localStorage.setItem('mpvJournalOpens', String(opens));
    if (opens % 10 === 0) setShowReview(true);
  }, [authorized, dataReady]);

  // ═══ CLOUD SYNC ENGINE (local-first, guarded push, merge on conflict) ═══
  useEffect(() => {
    if (!authorized || !dataReady) return;
    let pushTimer = null;

    const doPush = async () => {
      if (!canSync()) return;
      postSyncStatus('syncing');
      handlePushResult(await guardedPush());
    };

    const onMessage = (e) => {
      if (e.source !== iframeRef.current?.contentWindow || !e.data) return;
      const type = e.data.type;
      if (type === 'MPV_HELLO') {
        postSyncStatus(); // iframe booted — tell it the current status
        // Journal unlocked after an "అవును, నాది" reload: say it worked, big and centred.
        try {
          const raw = sessionStorage.getItem('mpv_claim_result');
          if (raw) {
            sessionStorage.removeItem('mpv_claim_result');
            setClaimResult(JSON.parse(raw));
          }
        } catch { /* a missing card must never break the journal */ }
      }
      // "App Update చేయి" in the More menu: drop every worker + cache and
      // reload from the network. Journal data (localStorage + Supabase) is not
      // touched — this only clears the stale app shell.
      if (type === 'MPV_FORCE_UPDATE') hardReset();
      if (type === 'MPV_LOGOUT') startLogout();
      // The iframe stops writing the moment mpvOwner changes under it.
      if (type === 'MPV_OWNER_CHANGED') lockMismatch();
      if (type === 'MPV_SHOW_SYNC_HELP' && bindingRef.current === 'refused') {
        // Tapping ⏸ re-asks the no_row question, so a mistaken "no" can be undone.
        setRefusal((r) => (r ? { ...r, declined: false } : r));
        setRefusalOpen(true);
      }
      if (type === 'MPV_DB_DIRTY') {
        // Always record that this phone has changes the cloud does not — the
        // sign-in and logout safety checks read this even while sync is off.
        markDirty();
        if (!canSync()) return;
        clearTimeout(pushTimer);
        pushTimer = setTimeout(doPush, 5000);
      }
    };
    const onPageHide = () => {
      // Best-effort flush — don't lose the debounce window on tab close.
      // Synchronous binding check only (nothing can be awaited here); RLS
      // rejects a write for any other account regardless.
      if (canSync() && isDirty()) pushJournal(supabase, syncUserRef.current);
    };
    const onOnline = () => {
      if (!canSync()) return;
      if (isDirty()) doPush();
      else postSyncStatus('synced');
    };
    const onOffline = () => {
      if (canSync()) postSyncStatus('offline');
    };
    // Another tab signed a different account in, or logged out.
    const onStorage = (e) => {
      if (e.key !== null && e.key !== OWNER_KEY) return;
      if (localStorage.getItem(OWNER_KEY) !== ownerRawRef.current) lockMismatch();
    };

    window.addEventListener('message', onMessage);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('storage', onStorage);
    return () => {
      clearTimeout(pushTimer);
      window.removeEventListener('message', onMessage);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('storage', onStorage);
    };
  }, [authorized, dataReady]);

  // ═══ WEEKLY PDF → WHATSAPP (triggered from the journal iframe) ═══
  useEffect(() => {
    const onMessage = async (e) => {
      if (e.source !== iframeRef.current?.contentWindow) return;
      if (!e.data || e.data.type !== 'MPV_WEEKLY_PDF') return;
      const payload = e.data.payload || {};
      setPdfShare({ status: 'generating' });
      try {
        const { blob, file, fileName } = await generateWeeklyPdf(payload);
        const url = URL.createObjectURL(blob);

        // Best-effort permanent record in Supabase — sharing works even if this fails.
        let recordSaved = false;
        const token = sessionStorage.getItem('mpv_journal_token') || '';
        if (token && !token.startsWith('EMERGENCY_')) {
          try {
            const res = await fetch('/api/save-weekly-report', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({
                studentName: payload.studentName,
                weekStart: payload.weekStart,
                weekEnd: payload.weekEnd,
                report: payload,
              }),
            });
            recordSaved = (await res.json())?.success === true;
          } catch { /* offline or server issue — keep sharing */ }
        }
        setPdfShare({ status: 'ready', file, url, fileName, recordSaved, hint: '' });
      } catch (err) {
        setPdfShare({ status: 'error', message: err?.message || 'PDF generation failed' });
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // ═══ SHAREABLE CARDS (license / insight / milestone — from the iframe) ═══
  useEffect(() => {
    const onMessage = async (e) => {
      if (e.source !== iframeRef.current?.contentWindow) return;
      if (!e.data || e.data.type !== 'MPV_SHARE_IMAGE') return;
      const { kind, payload } = e.data;
      const builder = CARD_BUILDERS[kind];
      if (!builder || !payload) return;
      setCardShare({ status: 'generating', kind });
      try {
        const { blob, file } = await generateCardImage(builder.build(payload), builder.file(payload));
        setCardShare({ status: 'ready', kind, file, url: URL.createObjectURL(blob), fileName: file.name, hint: '' });
      } catch (err) {
        setCardShare({ status: 'error', kind, message: err?.message || 'Image generation failed' });
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const downloadCard = () => {
    const a = document.createElement('a');
    a.href = cardShare.url;
    a.download = cardShare.fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    if (cardShare.kind === 'license') track('license_shared', { share_path: 'download_button' });
  };

  const shareCard = async () => {
    const files = [cardShare.file];
    if (navigator.canShare && navigator.canShare({ files })) {
      try {
        await navigator.share({ files, title: cardShare.fileName });
        if (cardShare.kind === 'license') track('license_shared', { share_path: 'native_share' });
        setCardShare(s => ({ ...s, hint: '✅ Share sheet లో WhatsApp Status select చేయండి.' }));
        return;
      } catch (err) {
        if (err?.name === 'AbortError') return; // cancelled — not a share, no event
      }
    }
    const a = document.createElement('a');
    a.href = cardShare.url;
    a.download = cardShare.fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    if (cardShare.kind === 'license') track('license_shared', { share_path: 'download_fallback' });
    setCardShare(s => ({ ...s, hint: '📥 Image download అయింది — WhatsApp Status లో upload చేయండి.' }));
  };

  const closeCardShare = () => {
    if (cardShare?.url) URL.revokeObjectURL(cardShare.url);
    setCardShare(null);
  };

  const downloadPdf = () => {
    const a = document.createElement('a');
    a.href = pdfShare.url;
    a.download = pdfShare.fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const shareToWhatsApp = async () => {
    const files = [pdfShare.file];
    if (navigator.canShare && navigator.canShare({ files })) {
      try {
        await navigator.share({ files, title: pdfShare.fileName, text: WA_TEXT });
        setPdfShare(s => ({ ...s, hint: '✅ Share sheet లో WhatsApp select చేసి Krishna Prasad కి పంపండి.' }));
        return;
      } catch (err) {
        if (err?.name === 'AbortError') return; // user cancelled the sheet
        // fall through to wa.me fallback
      }
    }
    downloadPdf();
    window.open(`https://wa.me/${MENTOR_WHATSAPP}?text=${encodeURIComponent(WA_TEXT)}`, '_blank', 'noopener');
    setPdfShare(s => ({ ...s, hint: '📥 PDF download అయింది — WhatsApp లో attach చేయండి.' }));
  };

  const closePdfShare = () => {
    if (pdfShare?.url) URL.revokeObjectURL(pdfShare.url);
    setPdfShare(null);
  };

  // ═══ SYNC CONFLICT RESOLUTION (empty device vs real cloud journal) ═══
  const resolveConflictRestore = () => {
    // Forget local sync markers so the boot pull restores the cloud journal.
    resetSyncMarkers();
    sessionStorage.setItem('mpv_restore_note', 'మీ journal cloud నుండి restore అయింది ✦');
    window.location.reload();
  };
  const resolveConflictForce = async () => {
    setSyncConflict(null);
    postSyncStatus('syncing');
    const result = await guardedPush({ force: true });
    handlePushResult(result);
  };
  const resolveConflictLater = () => {
    setSyncConflict(null); // stays dirty — dot shows ⚠ until they decide
  };

  // ═══ SESSION VALIDATION ═══
  useEffect(() => {
    const validateSession = async () => {
      const token = sessionStorage.getItem('mpv_journal_token');
      if (!token) {
        setError('No active session. Please login through Portal.');
        setChecking(false);
        return;
      }

      // Emergency bypass validation — local-only, no cloud sync
      if (token.startsWith('EMERGENCY_')) {
        syncUserRef.current = null;
        syncStatusRef.current = 'off';
        setAuthorized(true);
        setDataReady(true);
        setChecking(false);
        return;
      }

      try {
        const { data, error } = await supabase.auth.getSession();
        if (data?.session) {
          // Supabase auto-refreshes the session, but the journal iframe reads this
          // stored token for API calls — keep it in sync or it goes stale after ~1 hour
          sessionStorage.setItem('mpv_journal_token', data.session.access_token);


          // Verify if THIS is still the active device. The subscriptions
          // table is keyed on email — phone-OTP sessions have no email claim,
          // so skip the lookup rather than querying with undefined.
          const localDeviceId = localStorage.getItem('mpv_device_id');
          const user = data.session.user;

          if (user.email) {
            const { data: sub, error: subError } = await supabase
              .from('subscriptions')
              .select('device_id')
              .eq('email', user.email)
              .single();

            if (sub && sub.device_id && sub.device_id !== localDeviceId) {
              // Another device logged in!
              await supabase.auth.signOut();
              sessionStorage.removeItem('mpv_journal_token');
              setError('Access revoked. You logged into this account on another device.');
              setChecking(false);
              return;
            }
          }

          // Entitlement — runs on mount AND on every 60s re-validation, right
          // beside the device check, so a subscription that lapses (or is
          // revoked) closes the journal within a minute rather than at next login.
          const ent = await checkEntitlement(supabase);
          if (!ent.allowed) {
            await supabase.auth.signOut();
            sessionStorage.removeItem('mpv_journal_token');
            setError(ENTITLEMENT_MSG[ent.reason] || ENTITLEMENT_MSG.no_subscription);
            setAuthorized(false);
            setChecking(false);
            return;
          }

          if (bootRef.current === 'no') {
            // Account binding + cloud pull — once per page load.
            bootRef.current = 'running';
            try {
              await bootAccount(user);
            } finally {
              // Even if boot threw, later validations must not wait forever.
              // An unfinished boot leaves bindingRef 'pending', so canSync()
              // stays false and nothing is pushed.
              ownerRawRef.current = localStorage.getItem(OWNER_KEY);
              bootRef.current = 'done';
            }
          } else if (bootRef.current === 'running') {
            return; // the first pass is still binding/pulling — it opens the journal itself
          } else if (bindingRef.current === 'bound' &&
                     (user.id !== syncUserRef.current?.id || readOwner()?.id !== user.id)) {
            // Re-validation: the session or the binding changed under this page.
            lockMismatch(user.email);
          }

          setAuthorized(true);
          setDataReady(true);
        } else {
          sessionStorage.removeItem('mpv_journal_token');
          setError('Session expired. Please login again.');
        }
      } catch (err) {
        setError('Verification failed. Please login again.');
      }
      setChecking(false);
    };

    validateSession();

    // Auto-sync: Check every 60 seconds if another device logged in
    const interval = setInterval(validateSession, 60000);
    return () => clearInterval(interval);
  }, []);

  // ═══ ANTI-SCREENSHOT + ANTI-COPY + ANTI-DEVTOOLS ═══
  useEffect(() => {
    if (!authorized) return;

    // Anti-right-click
    const noContext = (e) => { e.preventDefault(); return false; };
    document.addEventListener('contextmenu', noContext);

    // Anti-keyboard shortcuts (Ctrl+S, Ctrl+U, Ctrl+Shift+I, F12, PrintScreen)
    const noKeys = (e) => {
      if (e.key === 'F12') { e.preventDefault(); return false; }
      if (e.ctrlKey && e.shiftKey && ['I','J','C'].includes(e.key.toUpperCase())) { e.preventDefault(); return false; }
      if (e.ctrlKey && ['s','u','p'].includes(e.key.toLowerCase())) { e.preventDefault(); return false; }
      if (e.key === 'PrintScreen') {
        navigator.clipboard.writeText('');
        document.body.style.filter = 'blur(20px)';
        setTimeout(() => { document.body.style.filter = ''; }, 1500);
      }
    };
    document.addEventListener('keydown', noKeys);

    // Anti-print
    const printStyle = document.createElement('style');
    printStyle.textContent = '@media print { body * { display: none !important; } body::after { content: "CONFIDENTIAL — Mind Power Vaultt"; display: block; font-size: 40px; text-align: center; margin-top: 200px; color: red; } }';
    document.head.appendChild(printStyle);

    // Visibility change — blur on tab switch (anti-screenshot via screen share)
    const onVisChange = () => {
      if (document.hidden && iframeRef.current) {
        iframeRef.current.style.filter = 'blur(8px)';
      } else if (iframeRef.current) {
        iframeRef.current.style.filter = '';
      }
    };
    document.addEventListener('visibilitychange', onVisChange);

    return () => {
      document.removeEventListener('contextmenu', noContext);
      document.removeEventListener('keydown', noKeys);
      document.removeEventListener('visibilitychange', onVisChange);
      if (printStyle.parentNode) printStyle.parentNode.removeChild(printStyle);
    };
  }, [authorized]);

  // ═══ RENDER SECURE IFRAME ═══
  useEffect(() => {
    // dataReady gate: never boot the journal before the cloud pull finishes,
    // or it would initialize from stale/empty localStorage.
    if (!authorized || !dataReady || !iframeRef.current) return;
    // Create blob URL — HTML is never in a public URL
    // Stamp the build id into the document so the More menu can show which
    // version this student is actually running (our update-reached-them check).
    const blob = new Blob([journalHtml.replace(/__MPV_BUILD__/g, BUILD_ID)], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    iframeRef.current.src = blobUrl;
    return () => URL.revokeObjectURL(blobUrl);
  }, [authorized, dataReady]);

  const G = {
    gold: "#C9A84C", smoke: "#F5F2EA", black: "#05050A", dark1: "#0A0A10",
    goldDim: "rgba(201,168,76,0.18)", mid: "#D0CCBF"
  };
  const overlay = (z) => ({ position:'fixed', inset:0, zIndex:z, background:'rgba(5,5,10,0.94)', display:'flex', alignItems:'center', justifyContent:'center', padding:16, overflowY:'auto', fontFamily:FONT });
  const card = (border) => ({ maxWidth:430, width:'100%', background:G.dark1, border:`1px solid ${border}`, borderRadius:12, padding:'26px 22px', textAlign:'center', color:G.smoke });
  const primaryBtn = { width:'100%', padding:15, marginBottom:10, background:`linear-gradient(135deg, ${G.gold}, #9A7020)`, color:G.black, border:'none', borderRadius:8, fontSize:14, fontWeight:700, cursor:'pointer' };
  const linkBtn = { background:'transparent', border:'none', color:G.mid, fontSize:12, cursor:'pointer', textDecoration:'underline' };
  const greenBtn = { width:'100%', padding:15, marginBottom:10, background:'linear-gradient(135deg,#2E7D52,#4CAF82)', color:'#fff', border:'none', borderRadius:8, fontSize:14, fontWeight:700, cursor:'pointer' };
  const secondaryBtn = { width:'100%', padding:13, marginBottom:10, background:'transparent', border:`1px solid ${G.goldDim}`, color:G.smoke, borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' };

  // ═══ CHECKING STATE ═══
  if (checking) {
    return (
      <div style={{ minHeight:'100vh', background:G.black, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16 }}>
        <Seo title="Journal — Mind Power Vaultt" path="/journal" noindex />
        <div style={{ width:40, height:40, border:`2px solid ${G.goldDim}`, borderTopColor:G.gold, borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ color:G.gold, fontSize:12, letterSpacing:3, fontFamily:"'DM Sans',sans-serif" }}>VERIFYING SESSION...</p>
      </div>
    );
  }

  // ═══ UNAUTHORIZED STATE ═══
  if (!authorized) {
    return (
      <div style={{ minHeight:'100vh', background:G.black, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'DM Sans',sans-serif", color:G.smoke, userSelect:'none' }}>
        <Seo title="Journal — Mind Power Vaultt" path="/journal" noindex />
        <div style={{ maxWidth:400, width:'100%', padding:'40px', background:G.dark1, border:`1px solid ${G.goldDim}`, borderRadius:12, textAlign:'center', boxShadow:'0 10px 40px rgba(0,0,0,0.5)' }}>
          <div style={{ fontSize:48, marginBottom:16 }}>🔒</div>
          <h2 style={{ color:'#CF6679', fontSize:20, marginBottom:8 }}>Access Denied</h2>
          <p style={{ color:G.mid, fontSize:14, marginBottom:24, lineHeight:1.8 }}>{error}</p>
          <button onClick={() => navigate('/portal')} style={{ width:'100%', padding:16, background:`linear-gradient(135deg, ${G.gold}, #9A7020)`, color:G.black, border:'none', borderRadius:6, fontSize:14, fontWeight:700, letterSpacing:2, cursor:'pointer' }}>
            Go to Portal Login →
          </button>
          <p style={{ marginTop:20, fontSize:11, color:'rgba(240,237,228,0.25)' }}>
            Unauthorized access attempts are logged and monitored.
          </p>
        </div>
      </div>
    );
  }

  // ═══ ACCOUNT MISMATCH — this phone's journal belongs to another account ═══
  if (mismatch) {
    return (
      <div style={{ minHeight:'100vh', background:G.black, display:'flex', alignItems:'center', justifyContent:'center', padding:16, fontFamily:FONT, color:G.smoke }}>
        <Seo title="Journal — Mind Power Vaultt" path="/journal" noindex />
        <div style={card('rgba(207,102,121,0.45)')}>
          <div style={{ fontSize:40, marginBottom:10 }}>🔒</div>
          <h3 style={{ color:'#CF6679', fontSize:17, marginBottom:12, lineHeight:1.5 }}>ఈ phone లో account మారింది</h3>
          <p style={{ fontSize:13, color:G.mid, lineHeight:1.8, marginBottom:10 }}>
            {mismatch.owner
              ? <>ఈ phone లో ఉన్న journal <b style={{ color:G.smoke }}>{mismatch.owner}</b> account ది. మీరు ఇప్పుడు <b style={{ color:G.smoke }}>{mismatch.current}</b> తో login అయ్యారు.</>
              : <>వేరే tab లో logout లేదా వేరే account login జరిగింది.</>}
          </p>
          <p style={{ fontSize:13, color:G.mid, lineHeight:1.8, marginBottom:18 }}>
            తప్పు account లో data కలవకుండా journal ఆపాం. ఏమీ delete చేయలేదు.
          </p>
          <BackupButton />
          <button onClick={relogin} style={primaryBtn}>Portal లో మళ్ళీ login అవ్వండి →</button>
        </div>
      </div>
    );
  }

  // ═══ AUTHORIZED — RENDER JOURNAL ═══
  const accessCode = sessionStorage.getItem('mpv_journal_access') || 'STUDENT';

  return (
    <div style={{ width:'100vw', height: SHOW_PREVIEW_BANNER ? `calc(100vh - ${PREVIEW_BANNER_HEIGHT}px)` : '100vh', overflow:'hidden', background:G.black, userSelect:'none', WebkitUserSelect:'none', position:'relative' }}>
      {/* 🛡️ DYNAMIC WATERMARK TO DETER SCREENSHOTS */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 9999,
        display: 'flex', flexWrap: 'wrap', overflow: 'hidden', opacity: 0.015,
        transform: 'rotate(-30deg) scale(1.5)', userSelect: 'none'
      }}>
        {Array.from({ length: 50 }).map((_, i) => (
          <div key={i} style={{ padding: '40px', fontSize: '24px', fontWeight: 900, color: '#FFFFFF', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
            {accessCode} • CONFIDENTIAL • DO NOT SHARE
          </div>
        ))}
      </div>

      {!loggingOut && !claim && (
        <iframe
          ref={iframeRef}
          title="Mind Power Vaultt Journal"
          style={{ width:'100%', height:'100%', border:'none' }}
          sandbox="allow-scripts allow-same-origin allow-modals allow-popups"
        />
      )}

      {/* Push opt-in stays here (journal is where reminders make sense).
          The install prompt now mounts globally in RoutedApp so it shows on
          every screen, not just deep inside the journal. */}
      <PushOptIn />

      {showReview && (
        <ReviewRequest userId={syncUserRef.current?.id} onClose={() => setShowReview(false)} />
      )}

      {/* ═══ SYNC REFUSED — reassurance first: nothing is deleted, the journal works ═══ */}
      {refusal && refusalOpen && (
        <div style={overlay(10002)}>
          <div style={card('rgba(76,175,130,0.45)')}>
            {claim?.stage === 'working' && (
              <>
                <div style={{ width:36, height:36, margin:'8px auto 14px', border:`2px solid ${G.goldDim}`, borderTopColor:G.gold, borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                <p style={{ color:G.gold, fontSize:14, lineHeight:1.7 }}>
                  మీ journal cloud లో save చేస్తున్నాం…<br/>
                  <span style={{ fontSize:12, color:G.mid }}>App close చేయకండి.</span>
                </p>
              </>
            )}
            {claim?.stage === 'failed' && (
              <>
                <div style={{ fontSize:34, marginBottom:8 }}>⚠️</div>
                <h3 style={{ color:'#E0A84C', fontSize:16, marginBottom:10 }}>Cloud కి చేరలేకపోయాం</h3>
                <p style={{ fontSize:13, color:G.mid, lineHeight:1.8, marginBottom:16 }}>
                  మీ journal ఈ phone లో safe గా ఉంది — ఏమీ మారలేదు. Internet చూసి మళ్ళీ try చేయండి.
                </p>
                <button onClick={claimNoRow} style={greenBtn}>మళ్ళీ try చేయి</button>
                <button onClick={() => window.location.reload()} style={secondaryBtn}>📖 Journal కి వెళ్ళు</button>
              </>
            )}
            {!claim && (
              <>
                <div style={{ fontSize:34, marginBottom:6 }}>🛡️</div>
                <h3 style={{ color:'#4CAF82', fontSize:17, marginBottom:8, lineHeight:1.5 }}>మీ journal safe — ఏమీ delete కాలేదు</h3>
                <p style={{ fontSize:13, color:G.mid, lineHeight:1.8, marginBottom:16 }}>
                  ఈ phone లో journal మామూలుగా పని చేస్తుంది — trades, reviews అన్నీ ఇక్కడే save అవుతాయి.
                  <b style={{ color:G.smoke }}> Cloud sync మాత్రమే ఆగింది.</b>
                </p>

                {refusal.reason === 'no_row' && !refusal.declined ? (
                  <>
                    <p style={{ fontSize:13, color:G.smoke, lineHeight:1.7, marginBottom:10 }}>
                      <b>{refusal.account}</b> account కి cloud లో ఇంకా journal లేదు. ఈ phone లో ఉన్నది:
                    </p>
                    <div style={{ textAlign:'left', background:'rgba(201,168,76,0.06)', border:`1px solid ${G.goldDim}`, borderRadius:8, padding:'12px 14px', fontSize:13, color:G.smoke, lineHeight:1.9, marginBottom:14 }}>
                      <div>👤 పేరు: <b>{refusal.summary?.name || '— (పేరు లేదు)'}</b></div>
                      <div>📊 Trades: <b>{refusal.summary?.trades ?? 0}</b> · EOD reviews: <b>{refusal.summary?.eods ?? 0}</b></div>
                      <div>📅 తేదీలు: <b>{fmtDay(refusal.summary?.firstDate)} – {fmtDay(refusal.summary?.lastDate)}</b></div>
                    </div>
                    <h3 style={{ color:G.gold, fontSize:16, marginBottom:12 }}>ఈ phone లో ఉన్న journal మీదేనా?</h3>
                    <button onClick={claimNoRow} style={greenBtn}>✅ అవును, నాది — cloud లో save చేయి</button>
                    <button onClick={() => setRefusalOpen(false)} style={primaryBtn}>📖 ఇప్పుడు journal వాడు — తర్వాత చెబుతాను</button>
                    <button onClick={declineNoRow} style={secondaryBtn}>కాదు / తెలియదు</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setRefusalOpen(false)} style={primaryBtn}>📖 Journal ఈ phone లో వాడు →</button>
                    <p style={{ fontSize:12, color:G.mid, lineHeight:1.7, margin:'6px 0 14px' }}>
                      ఈ phone లో ఉన్న journal, <b style={{ color:G.smoke }}>{refusal.account}</b> account దే అని confirm చేయలేకపోయాం —
                      తప్పు account లో కలవకుండా sync మాత్రమే ఆపాం. Backup తీసుకుని mentor కి ఈ code చెప్పండి:{' '}
                      <b style={{ color:'#E0A84C' }}>{REFUSAL_CODES[refusal.reason]}</b>
                    </p>
                    <BackupButton />
                    <a href={mentorWaUrl(`Journal cloud sync ఆగింది. Code: ${REFUSAL_CODES[refusal.reason]}. సహాయం కావాలి.`)} target="_blank" rel="noopener noreferrer"
                      style={{ display:'block', boxSizing:'border-box', width:'100%', padding:13, marginBottom:12, border:'1px solid rgba(37,211,102,0.5)', color:'#25D366', borderRadius:8, fontSize:13, fontWeight:600, textDecoration:'none' }}>
                      💬 Mentor కి WhatsApp చేయి
                    </a>
                    {refusal.reason === 'no_row' && (
                      <button onClick={() => setRefusal((r) => ({ ...r, declined: false }))} style={linkBtn}>ఈ journal నాదే — మళ్ళీ అడగండి</button>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══ "అవును, నాది" WORKED — stays until tapped, above every prompt ═══ */}
      {claimResult && (
        <div style={overlay(10004)}>
          <div style={card(claimResult.saved ? 'rgba(76,175,130,0.6)' : 'rgba(224,168,76,0.5)')}>
            <div style={{ fontSize:44, marginBottom:8 }}>{claimResult.saved ? '✅' : '☁️'}</div>
            <h3 style={{ color: claimResult.saved ? '#4CAF82' : '#E0A84C', fontSize:19, marginBottom:10, lineHeight:1.5 }}>
              {claimResult.saved ? 'మీ journal cloud లో save అయింది' : 'Journal మీ account కి జత అయింది'}
            </h3>
            <p style={{ fontSize:14, color:G.smoke, lineHeight:1.8, marginBottom:8 }}>
              {claimResult.saved
                ? <>📊 <b>{claimResult.trades}</b> trades · <b>{claimResult.eods}</b> EOD reviews — అన్నీ cloud లో safe.</>
                : <>Internet రాగానే cloud కి save అవుతుంది. మీ journal ఈ phone లో safe గా ఉంది.</>}
            </p>
            <p style={{ fontSize:13, color:G.mid, lineHeight:1.8, marginBottom:18 }}>
              {claimResult.saved
                ? 'ఇక phone మారినా, మళ్ళీ login అయితే మీ journal తిరిగి వస్తుంది. Header లో sync dot ✓ synced చూపిస్తుంది.'
                : 'Header లో sync dot ✓ synced అయ్యే వరకు app close చేయకండి.'}
            </p>
            <button onClick={() => setClaimResult(null)} style={claimResult.saved ? greenBtn : primaryBtn}>సరే, journal కి వెళ్దాం</button>
          </div>
        </div>
      )}

      {/* ═══ LOGOUT ═══ */}
      {logout && (
        <div style={overlay(10003)}>
          <div style={card(logout.stage === 'unsafe' ? 'rgba(207,102,121,0.45)' : G.goldDim)}>
            {logout.stage === 'confirm' && (
              <>
                <div style={{ fontSize:34, marginBottom:8 }}>🚪</div>
                <h3 style={{ color:G.gold, fontSize:17, marginBottom:14 }}>Logout చేయాలా?</h3>
                <div style={{ textAlign:'left', fontSize:13, color:G.mid, lineHeight:1.8, marginBottom:18 }}>
                  <p style={{ marginBottom:10 }}>☁️ <b style={{ color:G.smoke }}>ముందు sync:</b> cloud కి ఇంకా వెళ్ళని మార్పులు ఉంటే, ముందు వాటిని cloud కి పంపుతాం. పంపడం కుదరకపోతే logout ఆపుతాం — మీ data పోదు.</p>
                  <p style={{ marginBottom:10 }}>📱 <b style={{ color:G.smoke }}>తర్వాత:</b> ఈ phone నుండి journal తీసేస్తాం. మీ journal cloud లో safe — మళ్ళీ login అయితే తిరిగి వస్తుంది.</p>
                  <p>🔐 <b style={{ color:G.smoke }}>PIN:</b> PIN Lock కూడా తీసేస్తాం. మళ్ళీ login అయ్యాక More → PIN Lock లో PIN మళ్ళీ set చేయాలి.</p>
                </div>
                <button onClick={confirmLogout} style={primaryBtn}>అవును, Logout చేయి</button>
                <button onClick={() => setLogout(null)} style={linkBtn}>వద్దు</button>
              </>
            )}
            {logout.stage === 'working' && (
              <>
                <div style={{ width:36, height:36, margin:'8px auto 14px', border:`2px solid ${G.goldDim}`, borderTopColor:G.gold, borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                <p style={{ color:G.gold, fontSize:13 }}>Cloud కి sync చేసి logout చేస్తున్నాం…</p>
              </>
            )}
            {logout.stage === 'failed' && (
              <>
                <div style={{ fontSize:34, marginBottom:8 }}>⚠️</div>
                <h3 style={{ color:'#E0A84C', fontSize:16, marginBottom:10 }}>Sync కాలేదు — logout ఆపాం</h3>
                <p style={{ fontSize:13, color:G.mid, lineHeight:1.8, marginBottom:18 }}>
                  Cloud కి వెళ్ళని మార్పులు ఈ phone లో ఉన్నాయి. అవి పోకుండా logout ఆపాం — మీ data ఈ phone లో safe. Internet చూసి మళ్ళీ try చేయండి.
                </p>
                <button onClick={confirmLogout} style={primaryBtn}>మళ్ళీ try చేయి</button>
                <button onClick={() => setLogout(null)} style={linkBtn}>Cancel</button>
              </>
            )}
            {logout.stage === 'unsafe' && (
              <>
                <div style={{ fontSize:34, marginBottom:8 }}>⚠️</div>
                <h3 style={{ color:'#CF6679', fontSize:16, marginBottom:10, lineHeight:1.5 }}>Logout చేస్తే ఈ phone లో ఉన్న journal పోతుంది</h3>
                <p style={{ fontSize:13, color:G.mid, lineHeight:1.8, marginBottom:12 }}>
                  ఈ phone లో ఉన్న journal cloud లో safe గా ఉందని confirm కాలేదు (cloud sync ఆగి ఉంది). Logout చేస్తే ఈ phone నుండి journal, PIN రెండూ తీసేస్తాం — cloud లో copy లేకపోతే తిరిగి రావు.
                </p>
                <div style={{ textAlign:'left', fontSize:13, color:G.smoke, lineHeight:1.8, marginBottom:14 }}>
                  1. ముందు Backup download చేయండి. (ఆ file తో More → Export → Data Restore చేసి తిరిగి తెచ్చుకోవచ్చు.)<br/>
                  2. తర్వాతే logout.
                </div>
                <BackupButton onDone={() => setLogout({ stage: 'unsafe', backupTaken: true })} />
                <button onClick={unsafeLogout} disabled={!logout.backupTaken}
                  style={{ width:'100%', padding:13, marginBottom:10, background:'transparent', border:'1px solid rgba(207,102,121,0.5)', color:'#CF6679', borderRadius:8, fontSize:13, fontWeight:600, cursor: logout.backupTaken ? 'pointer' : 'not-allowed', opacity: logout.backupTaken ? 1 : 0.4 }}>
                  Backup తీసుకున్నాను — Logout చేయి
                </button>
                <button onClick={() => setLogout(null)} style={linkBtn}>వద్దు</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══ SYNC CONFLICT OVERLAY — empty device vs real cloud journal ═══ */}
      {syncConflict && (
        <div style={{ position:'fixed', inset:0, zIndex:10001, background:'rgba(5,5,10,0.92)', display:'flex', alignItems:'center', justifyContent:'center', padding:16, fontFamily:"'DM Sans','Noto Sans Telugu',sans-serif" }}>
          <div style={{ maxWidth:430, width:'100%', background:G.dark1, border:'1px solid rgba(224,168,76,0.4)', borderRadius:12, padding:'28px 24px', textAlign:'center', color:G.smoke }}>
            <div style={{ fontSize:36, marginBottom:10 }}>⚠️</div>
            <h3 style={{ color:'#E0A84C', fontSize:16, marginBottom:10, lineHeight:1.5 }}>Cloud లో మీ పాత journal data ఉంది</h3>
            <p style={{ fontSize:13, color:G.mid, lineHeight:1.8, marginBottom:18 }}>
              Cloud లో <b style={{ color:G.smoke }}>{syncConflict.cloudTrades} trades · {syncConflict.cloudEods} EOD reviews</b> ఉన్నాయి —
              కానీ ఈ device లో journal ఖాళీగా ఉంది. ఖాళీ data తో cloud ని replace చేస్తే మీ పాత journal శాశ్వతంగా పోతుంది.
            </p>
            <button onClick={resolveConflictRestore} style={{ width:'100%', padding:15, marginBottom:10, background:`linear-gradient(135deg, ${G.gold}, #9A7020)`, color:G.black, border:'none', borderRadius:8, fontSize:14, fontWeight:700, cursor:'pointer' }}>
              ✦ Cloud data restore చేయి (recommended)
            </button>
            <button onClick={resolveConflictForce} style={{ width:'100%', padding:12, marginBottom:10, background:'transparent', border:'1px solid rgba(207,102,121,0.5)', color:'#CF6679', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer' }}>
              కాదు — ఖాళీ data తో replace చేయి (పాత data పోతుంది)
            </button>
            <button onClick={resolveConflictLater} style={{ background:'transparent', border:'none', color:G.mid, fontSize:12, cursor:'pointer', textDecoration:'underline' }}>
              తర్వాత decide చేస్తాను
            </button>
          </div>
        </div>
      )}

      {/* ═══ SHAREABLE CARD OVERLAY (license / insight / milestone) ═══ */}
      {cardShare && (
        <div style={{ position:'fixed', inset:0, zIndex:10000, background:'rgba(5,5,10,0.92)', display:'flex', alignItems:'center', justifyContent:'center', padding:16, fontFamily:"'DM Sans','Noto Sans Telugu',sans-serif" }}>
          <div style={{ maxWidth:400, width:'100%', maxHeight:'92vh', overflowY:'auto', background:G.dark1, border:`1px solid ${G.goldDim}`, borderRadius:12, padding:'22px 20px', textAlign:'center', color:G.smoke }}>
            {cardShare.status === 'generating' && (
              <>
                <div style={{ width:36, height:36, margin:'14px auto', border:`2px solid ${G.goldDim}`, borderTopColor:G.gold, borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                <p style={{ color:G.gold, fontSize:13, letterSpacing:2 }}>CARD తయారవుతోంది...</p>
              </>
            )}
            {cardShare.status === 'error' && (
              <>
                <div style={{ fontSize:32, margin:'8px 0' }}>❌</div>
                <p style={{ fontSize:13, marginBottom:16 }}>Card generate అవ్వలేదు — మళ్ళీ try చేయండి.</p>
                <button onClick={closeCardShare} style={{ padding:'10px 24px', background:'transparent', border:`1px solid ${G.goldDim}`, color:G.mid, borderRadius:6, cursor:'pointer' }}>Close</button>
              </>
            )}
            {cardShare.status === 'ready' && (
              <>
                <img src={cardShare.url} alt="card preview" style={{ width:'100%', borderRadius:8, border:`1px solid ${G.goldDim}`, marginBottom:14 }}/>
                <button onClick={shareCard} style={{ width:'100%', padding:14, marginBottom:8, background:'linear-gradient(135deg,#2E7D52,#25D366)', color:'#fff', border:'none', borderRadius:8, fontSize:14, fontWeight:700, cursor:'pointer' }}>
                  📱 WhatsApp Status లో పెట్టు
                </button>
                <button onClick={downloadCard} style={{ width:'100%', padding:12, marginBottom:8, background:'transparent', border:`1px solid ${G.goldDim}`, color:G.gold, borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                  ⬇ Download Image
                </button>
                {cardShare.hint && <p style={{ fontSize:12, color:'#25D366', marginBottom:8, lineHeight:1.6 }}>{cardShare.hint}</p>}
                <button onClick={closeCardShare} style={{ background:'transparent', border:'none', color:G.mid, fontSize:12, cursor:'pointer', textDecoration:'underline' }}>Close</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══ WEEKLY PDF SHARE OVERLAY ═══ */}
      {pdfShare && (
        <div style={{ position:'fixed', inset:0, zIndex:10000, background:'rgba(5,5,10,0.88)', display:'flex', alignItems:'center', justifyContent:'center', padding:16, fontFamily:"'DM Sans','Noto Sans Telugu',sans-serif" }}>
          <div style={{ maxWidth:420, width:'100%', background:G.dark1, border:`1px solid ${G.goldDim}`, borderRadius:12, padding:'28px 24px', textAlign:'center', color:G.smoke }}>
            {pdfShare.status === 'generating' && (
              <>
                <div style={{ width:36, height:36, margin:'0 auto 14px', border:`2px solid ${G.goldDim}`, borderTopColor:G.gold, borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                <p style={{ color:G.gold, fontSize:13, letterSpacing:2 }}>WEEKLY REPORT PDF తయారవుతోంది...</p>
              </>
            )}
            {pdfShare.status === 'error' && (
              <>
                <div style={{ fontSize:36, marginBottom:10 }}>❌</div>
                <p style={{ fontSize:14, marginBottom:6 }}>PDF generate అవ్వలేదు — మళ్ళీ try చేయండి.</p>
                <p style={{ fontSize:11, color:G.mid, marginBottom:18 }}>{pdfShare.message}</p>
                <button onClick={closePdfShare} style={{ padding:'12px 28px', background:'transparent', border:`1px solid ${G.goldDim}`, color:G.mid, borderRadius:6, cursor:'pointer' }}>Close</button>
              </>
            )}
            {pdfShare.status === 'ready' && (
              <>
                <div style={{ fontSize:36, marginBottom:8 }}>📊</div>
                <h3 style={{ color:G.gold, fontSize:17, marginBottom:4 }}>Weekly Report Ready ✦</h3>
                <p style={{ fontSize:11, color:G.mid, marginBottom:18, wordBreak:'break-all' }}>{pdfShare.fileName}</p>
                <button onClick={shareToWhatsApp} style={{ width:'100%', padding:15, marginBottom:10, background:'linear-gradient(135deg,#2E7D52,#25D366)', color:'#fff', border:'none', borderRadius:8, fontSize:14, fontWeight:700, letterSpacing:1, cursor:'pointer' }}>
                  📱 Krishna Prasad కి పంపు (WhatsApp)
                </button>
                <button onClick={downloadPdf} style={{ width:'100%', padding:13, marginBottom:10, background:'transparent', border:`1px solid ${G.goldDim}`, color:G.gold, borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                  ⬇ Download PDF
                </button>
                {pdfShare.hint && <p style={{ fontSize:12, color:'#25D366', marginBottom:10, lineHeight:1.6 }}>{pdfShare.hint}</p>}
                <p style={{ fontSize:10.5, color:G.mid, marginBottom:4 }}>
                  {pdfShare.recordSaved ? '✅ Report copy mentor records లో save అయింది.' : 'ℹ️ Report copy save అవ్వలేదు (share కి problem లేదు).'}
                </p>
                <p style={{ fontSize:10.5, color:G.mid, marginBottom:14 }}>Email గా పంపాలంటే Share panel లో 📧 option వాడండి.</p>
                <button onClick={closePdfShare} style={{ background:'transparent', border:'none', color:G.mid, fontSize:12, cursor:'pointer', textDecoration:'underline' }}>Close</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
