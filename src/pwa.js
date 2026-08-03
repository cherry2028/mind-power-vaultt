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
// The service worker itself needs no changes: it already answers SKIP_WAITING
// with self.skipWaiting() and calls clients.claim() on activate, and its
// caching guards (never Supabase/API, never blob:, GET-only) stay exactly as
// they are.

import { registerSW } from 'virtual:pwa-register';

const FOREGROUND_THROTTLE_MS = 2 * 60 * 1000; // don't re-check on every tab flick
const POLL_MS = 60 * 60 * 1000;               // hourly while the app stays open

export const BUILD_ID = typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'dev';

let needRefresh = false;
let applyUpdate = () => {};
let swRegistration = null;
let lastCheck = 0;
const listeners = new Set();

function emit() {
  listeners.forEach((fn) => {
    try { fn(needRefresh); } catch { /* a bad listener must not break SW plumbing */ }
  });
}

export function onNeedRefresh(fn) {
  listeners.add(fn);
  fn(needRefresh);
  return () => listeners.delete(fn);
}

export function refreshNow() {
  applyUpdate();
}

function promptForRefresh() {
  needRefresh = true;
  emit();
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
  window.MPV_BUILD = BUILD_ID; // so a student can be asked "what version?"
  try {
    applyUpdate = registerSW({
      immediate: true,
      onNeedRefresh() { promptForRefresh(); },
      onRegisterError(err) { console.warn('[MPV-PWA] SW registration failed:', err?.message); },
      onRegisteredSW(swUrl, registration) {
        if (!registration) return;
        swRegistration = registration;
        // A worker installed during a previous session can still be waiting
        // (the student closed the app before tapping Refresh). vite-plugin-pwa
        // does not re-fire onNeedRefresh for it, so surface the toast here —
        // this is precisely the stale-forever case.
        if (registration.waiting) promptForRefresh();
        lastCheck = Date.now();
        setInterval(() => checkForUpdate(true), POLL_MS);
      },
    });

    // Re-check whenever the app returns to the foreground. This is the case
    // that matters for an installed PWA: resumed from the app switcher, no
    // navigation, so nothing else would ever look for a new build.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkForUpdate(false);
    });
    window.addEventListener('focus', () => checkForUpdate(false));
  } catch (err) {
    // Never let PWA plumbing break the app.
    console.warn('[MPV-PWA] init skipped:', err?.message);
  }
}
