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
//  2. APPLICATION. A detected update still has to be applied. The rule is:
//       • found at LAUNCH  -> apply silently and reload. Nothing is typed yet,
//         so there is nothing to lose, and the student just gets the new build.
//       • found MID-SESSION -> show the Telugu toast and let the student tap.
//         The journal is a data-entry app; swapping the bundle out from under a
//         half-entered trade would destroy real work.
//
// The service worker itself needs no changes: it already answers SKIP_WAITING
// with self.skipWaiting() and calls clients.claim() on activate, and its
// caching guards (never Supabase/API, never blob:, GET-only) stay exactly as
// they are.

import { registerSW } from 'virtual:pwa-register';

const FOREGROUND_THROTTLE_MS = 2 * 60 * 1000; // don't re-check on every tab flick
const POLL_MS = 60 * 60 * 1000;               // hourly while the app stays open
const LAUNCH_GRACE_MS = 15 * 1000;            // "found at launch" window
const AUTO_APPLIED_KEY = 'mpvSwAutoApplied';  // reload-loop guard (per session)

export const BUILD_ID = typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'dev';

const bootedAt = Date.now();
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

// Apply a waiting update immediately (SKIP_WAITING + reload). Guarded so a
// pathological update that never "takes" can't put the app in a reload loop —
// after one automatic attempt per session we fall back to the visible prompt.
function applyAtLaunch() {
  let alreadyTried = false;
  try { alreadyTried = sessionStorage.getItem(AUTO_APPLIED_KEY) === '1'; } catch { /* private mode */ }
  if (alreadyTried) { promptForRefresh(); return; }
  try { sessionStorage.setItem(AUTO_APPLIED_KEY, '1'); } catch { /* private mode */ }
  applyUpdate();
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
      onNeedRefresh() {
        // Within the launch window there is nothing to lose — take the update
        // now. Later in the session, ask first.
        if (Date.now() - bootedAt < LAUNCH_GRACE_MS) applyAtLaunch();
        else promptForRefresh();
      },
      onRegisterError(err) { console.warn('[MPV-PWA] SW registration failed:', err?.message); },
      onRegisteredSW(swUrl, registration) {
        if (!registration) return;
        swRegistration = registration;
        // A worker installed during a previous session can still be waiting
        // (the student closed the app before refreshing). This is exactly the
        // stale-forever case — apply it now.
        if (registration.waiting) applyAtLaunch();
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
