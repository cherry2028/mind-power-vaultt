// Service worker registration + update plumbing.
//
// THE GOAL: when a new build is deployed, every installed student is on it
// within ONE app launch — never stranded on a stale bundle.
//
// Two problems had to be solved:
//
//  1. DETECTION. registerSW() only looks for a new worker when a page is first
//     loaded. An installed PWA is normally RESUMED from the app switcher rather
//     than re-navigated, so nothing ever re-checked sw.js and a student could
//     sit on a months-old build forever. We now re-check whenever the app comes
//     to the foreground, and hourly while it stays open.
//
//  2. APPLICATION. A detected update still has to be applied. PHASE 1 keeps
//     this fully student-driven: every detected update — including one left
//     waiting from a previous session — surfaces the Telugu toast, and the
//     bundle only swaps when the student taps Refresh (which posts
//     SKIP_WAITING and reloads). The journal is a data-entry app, so nothing
//     is ever swapped out from under a half-entered trade.
//     Phase 2 (later, once this is proven in the wild) can auto-activate at
//     launch, where there is nothing typed yet to lose.
//
//  3. WHEN THE PROMPT MAY APPEAR (2026-09-19). A dismissed prompt used to stay
//     hidden for the rest of the session, so a resumed installed app could sit
//     on old code for days. The prompt is now re-evaluated on every foreground
//     return, but only under the owner's rules (src/utils/updatePrompt.js):
//     never while a sheet/form is open, never within 15 minutes of the
//     student's last journal write, otherwise 10 minutes after a dismissal.
//     There is no market-hours window: this journal carries crypto, forex and
//     gold, and the live journals log most of their trades in the evening.
//     Every rule is an elapsed-time comparison on this device, so no server
//     clock is needed — which also means an offline student still gets it.
//
// The service worker itself needs no changes: it already answers SKIP_WAITING
// with self.skipWaiting() and calls clients.claim() on activate, and its
// caching guards (never Supabase/API, never blob:, GET-only) stay exactly as
// they are.

import { registerSW } from 'virtual:pwa-register';
import { track } from './analytics';
import { TEST_TOOLS_BUILD } from './utils/deployTarget';
import { decidePrompt, entryInProgress, QUIET_MS, IDLE_MS } from './utils/updatePrompt';

const FOREGROUND_THROTTLE_MS = 2 * 60 * 1000; // don't re-check on every tab flick
const POLL_MS = 60 * 60 * 1000;               // hourly while the app stays open

export const BUILD_ID = typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'dev';

let needRefresh = false;   // an update was detected (kept for diagnostics)
let promptVisible = false; // what the toast actually shows
let lastDecision = null;
let watchTimer = null;
let applyUpdate = () => {};

const LS_DISMISSED = 'mpvUpdDismissedAt';
// Written by the journal's ls() on every real save (src/journal-content.html).
// Device-local on purpose: it is NOT in JOURNAL_KEYS, so it never syncs to the
// cloud and typing on one device cannot silence the prompt on another.
const LS_LAST_WRITE = 'mpvLastWrite';
const WATCH_MS = 3000;
// Preview builds shorten both waits so the phone test takes seconds, not half
// an hour. Students always get the real 15 / 10 minutes.
const PROMPT_QUIET_MS = TEST_TOOLS_BUILD ? 30 * 1000 : QUIET_MS;
const PROMPT_IDLE_MS = TEST_TOOLS_BUILD ? 60 * 1000 : IDLE_MS;

function lsGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } }
function lsNum(k) { const n = Number(lsGet(k)); return Number.isFinite(n) && n > 0 ? n : null; }
let swRegistration = null;
let lastCheck = 0;
const listeners = new Set();

function emit() {
  listeners.forEach((fn) => {
    try { fn(promptVisible); } catch { /* a bad listener must not break SW plumbing */ }
  });
}

// Subscribe to "should the update toast be visible right now".
export function onNeedRefresh(fn) {
  listeners.add(fn);
  fn(promptVisible);
  return () => listeners.delete(fn);
}

// ── the decision ───────────────────────────────────────────────────────────
function journalDocument() {
  const frame = typeof document !== 'undefined' && document.querySelector('iframe[title="Mind Power Vaultt Journal"]');
  if (!frame) return { doc: null, unreadable: false };
  try {
    const doc = frame.contentDocument;
    return doc ? { doc, unreadable: false } : { doc: null, unreadable: true };
  } catch {
    return { doc: null, unreadable: true };
  }
}

function evaluatePrompt(trigger, { allowShow = true } = {}) {
  try {
    const waiting = !!(swRegistration && swRegistration.waiting);
    const journal = journalDocument();
    const entry = entryInProgress([document, journal.doc], { journalUnreadable: journal.unreadable });
    const now = Date.now();
    const lastWriteAt = lsNum(LS_LAST_WRITE);
    const d = decidePrompt({
      entryInProgress: entry,
      waiting,
      now,
      lastWriteAt,
      lastDismissedAt: lsNum(LS_DISMISSED),
      idleMs: PROMPT_IDLE_MS,
      quietMs: PROMPT_QUIET_MS,
    });
    lastDecision = {
      ...d,
      trigger,
      sinceWriteSec: lastWriteAt ? Math.round((now - lastWriteAt) / 1000) : null,
      at: new Date().toISOString(),
    };

    if (d.show && !promptVisible && allowShow) {
      promptVisible = true;
      track('pwa_update_prompt_shown', { from_build: BUILD_ID, reason: d.reason, trigger });
      emit();
    } else if (!d.show && promptVisible && d.reason !== 'quiet_period') {
      // A sheet opened, a trade was saved, or the update applied elsewhere:
      // take the toast away. This is not a dismissal.
      promptVisible = false;
      emit();
    }
    syncWatch();
  } catch (err) {
    console.warn('[MPV-PWA] prompt check skipped:', err?.message);
  }
}

// While the toast is up, keep checking so it disappears the moment a trade
// sheet opens or a trade is saved. Never shows anything by itself.
function syncWatch() {
  if (promptVisible && !watchTimer) {
    watchTimer = setInterval(() => evaluatePrompt('watch', { allowShow: false }), WATCH_MS);
  } else if (!promptVisible && watchTimer) {
    clearInterval(watchTimer);
    watchTimer = null;
  }
}

export function dismissPrompt() {
  lsSet(LS_DISMISSED, String(Date.now()));
  promptVisible = false;
  emit();
  syncWatch();
}

export function promptState() {
  return {
    promptVisible,
    needRefresh,
    lastDecision,
    dismissedAt: lsNum(LS_DISMISSED),
    lastWriteAt: lsNum(LS_LAST_WRITE),
    idleMs: PROMPT_IDLE_MS,
    quietMs: PROMPT_QUIET_MS,
  };
}

// Preview test tools: re-run the decision now (after moving a stamp).
export function reevaluatePromptNow() {
  evaluatePrompt('test_tools');
}

// Apply a waiting update — deterministically, without delegating to
// workbox-window.
//
// The bug this replaces: we surface the toast from our OWN
// registration.waiting check (a worker left waiting by a previous session).
// vite-plugin-pwa's updateSW() asks workbox-window to message the waiting
// worker, but workbox only holds that reference when ITS OWN 'waiting' event
// fired. Toast shown by us + no workbox reference = messageSkipWaiting() is a
// no-op, so the student taps Refresh and nothing happens.
//
// The correct sequence, done here explicitly:
//   1. postMessage {type:'SKIP_WAITING'} to registration.waiting
//   2. the SW calls self.skipWaiting() -> activates
//   3. its activate handler calls clients.claim() -> takes control
//   4. 'controllerchange' fires on this page
//   5. reload -> now served by the NEW worker, so the new bundle loads
// with a timeout fallback in case any link in that chain is missing (e.g. a
// very old worker that never answers SKIP_WAITING).
export function refreshNow() {
  if (typeof window === 'undefined') return;
  track('pwa_update_refresh_tapped', { from_build: BUILD_ID });
  let done = false;
  const reload = () => {
    if (done) return;
    done = true;
    window.location.reload();
  };

  try {
    const waiting = swRegistration && swRegistration.waiting;
    if (waiting && navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener('controllerchange', reload, { once: true });
      waiting.postMessage({ type: 'SKIP_WAITING' });
      // If the worker never hands over, reload anyway: navigation is
      // network-first, so a plain reload still fetches the newest index.html.
      setTimeout(reload, 2500);
      return;
    }
    // Nothing waiting (or no SW at all) — let the library try, then reload.
    try { applyUpdate(); } catch { /* fall through to the reload below */ }
    setTimeout(reload, 600);
  } catch {
    reload();
  }
}

// Escape hatch for a client wedged on a stale worker: drop every service
// worker and cache, then reload from the network. Journal data lives in
// localStorage + Supabase and is NOT touched. Exposed as window.MPV_RESET().
export async function hardReset() {
  try {
    if (navigator.serviceWorker) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister().catch(() => {})));
    }
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k).catch(() => {})));
    }
  } catch { /* best effort — the reload below is what matters */ }
  window.location.reload();
}

// Diagnostic: what worker is actually in control, and on which build.
export function swState() {
  const r = swRegistration;
  return {
    build: BUILD_ID,
    controller: (navigator.serviceWorker && navigator.serviceWorker.controller
      && navigator.serviceWorker.controller.scriptURL) || null,
    installing: !!(r && r.installing),
    waiting: !!(r && r.waiting),
    active: !!(r && r.active),
    needRefresh,
    promptVisible,
    lastDecision,
  };
}

// An update is known. Whether the toast shows is decided by the rules.
function promptForRefresh(trigger) {
  needRefresh = true;
  evaluatePrompt(trigger || 'update_found');
}

function checkForUpdate(force) {
  if (!swRegistration) return;
  const now = Date.now();
  if (!force && now - lastCheck < FOREGROUND_THROTTLE_MS) return;
  lastCheck = now;
  // A rejected update() (offline, transient 5xx) must never surface to the
  // student — the next foreground check simply tries again.
  Promise.resolve(swRegistration.update()).catch(() => {});
}

export function checkForUpdateNow() {
  checkForUpdate(true);
}

export function initPwa() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  window.MPV_BUILD = BUILD_ID;   // so a student can be asked "what version?"
  window.MPV_RESET = hardReset;  // escape hatch for a wedged worker
  window.MPV_SW_STATE = swState; // diagnostic: who is controlling, on what build
  window.MPV_PROMPT_STATE = promptState; // diagnostic: why the update prompt is / isn't showing
  try {
    applyUpdate = registerSW({
      immediate: true,
      onNeedRefresh() { promptForRefresh('update_found'); },
      onRegisterError(err) { console.warn('[MPV-PWA] SW registration failed:', err?.message); },
      onRegisteredSW(swUrl, registration) {
        if (!registration) return;
        swRegistration = registration;
        // A worker installed during a previous session can still be waiting
        // (the student closed the app before tapping Refresh). vite-plugin-pwa
        // does not re-fire onNeedRefresh for it, so surface the toast here —
        // this is precisely the stale-forever case.
        if (registration.waiting) promptForRefresh('launch_waiting');
        lastCheck = Date.now();
        setInterval(() => checkForUpdate(true), POLL_MS);
      },
    });

    // Re-check whenever the app returns to the foreground. This is the case
    // that matters for an installed PWA: resumed from the app switcher, no
    // navigation, so nothing else would ever look for a new build.
    // Every foreground return also re-decides the prompt (not throttled —
    // only the network update check is).
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        checkForUpdate(false);
        evaluatePrompt('foreground');
      }
    });
    window.addEventListener('focus', () => {
      checkForUpdate(false);
      evaluatePrompt('foreground');
    });
  } catch (err) {
    // Never let PWA plumbing break the app.
    console.warn('[MPV-PWA] init skipped:', err?.message);
  }
}
