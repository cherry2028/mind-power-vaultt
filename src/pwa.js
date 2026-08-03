// Service worker registration + update plumbing.
//
// registerType is 'prompt', so a new worker installs and then WAITS. We surface
// a Telugu toast and only call updateSW() (which posts SKIP_WAITING and
// reloads) when the student taps refresh — a bundle never swaps mid-journal.
//
// IMPORTANT: registerSW() only looks for a new worker when the page is first
// loaded. An INSTALLED PWA is usually resumed from the app switcher rather than
// re-navigated, so without an explicit re-check a student can sit on a months-
// old build and never see a single shipped feature. So we also call
// registration.update() whenever the app is brought to the foreground, and
// hourly while it stays open. Cheap (a conditional GET on sw.js, 304 when
// unchanged) and it is what makes the update toast actually appear.

import { registerSW } from 'virtual:pwa-register';

const FOREGROUND_THROTTLE_MS = 2 * 60 * 1000; // don't re-check on every tab flick
const POLL_MS = 60 * 60 * 1000;               // hourly while the app stays open

let needRefresh = false;
let applyUpdate = () => {};
let swRegistration = null;
let lastCheck = 0;
const listeners = new Set();

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

export function initPwa() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    applyUpdate = registerSW({
      immediate: true,
      onNeedRefresh() { needRefresh = true; emit(); },
      onRegisterError(err) { console.warn('[MPV-PWA] SW registration failed:', err?.message); },
      onRegisteredSW(swUrl, registration) {
        if (!registration) return;
        swRegistration = registration;
        // A worker may already be waiting from a previous session (installed
        // but never activated because the student closed the app before
        // tapping refresh) — surface the toast immediately in that case.
        if (registration.waiting) { needRefresh = true; emit(); }
        lastCheck = Date.now();
        setInterval(() => checkForUpdate(true), POLL_MS);
      },
    });

    // Re-check whenever the app comes back to the foreground. This is the case
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
