// One-line GA4 event helper. Safe when gtag is blocked/absent (ad blockers,
// emergency offline use) — analytics must never break app behavior.
export function track(event, params) {
  try { if (typeof window.gtag === 'function') window.gtag('event', event, params || {}); } catch { /* never throw */ }
}
