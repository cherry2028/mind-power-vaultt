// Service worker registration + update plumbing.
//
// registerType is 'prompt', so a new worker installs and then WAITS. We surface
// a Telugu toast and only call updateSW() (which posts SKIP_WAITING and
// reloads) when the student taps refresh — a bundle never swaps mid-journal.

import { registerSW } from 'virtual:pwa-register';

let needRefresh = false;
let applyUpdate = () => {};
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

export function initPwa() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    applyUpdate = registerSW({
      immediate: true,
      onNeedRefresh() { needRefresh = true; emit(); },
      onRegisterError(err) { console.warn('[MPV-PWA] SW registration failed:', err?.message); },
    });
  } catch (err) {
    // Never let PWA plumbing break the app.
    console.warn('[MPV-PWA] init skipped:', err?.message);
  }
}
