// Ad attribution passthrough (gclid / utm).
//
// Google appends gclid (and often utm_*) to the ad landing URL. This is a SPA
// that navigates internally — navigate('/get-journal'), navigate('/?buy=1') —
// which DROPS query params, so the click id would vanish before the payment
// page. We capture the ad params once on landing, persist them for the session,
// and re-append them to the journal/checkout links so gclid survives all the
// way to the payment page.
//
// (Google's own _gcl cookie, set by gtag on landing, already carries attribution
// for the online conversion — this keeps gclid visible in the URL end-to-end as
// belt-and-suspenders and makes it available for any server-side capture.)

const KEYS = ['gclid', 'gbraid', 'wbraid', 'gad_source', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
const STORE = 'mpv_attr';

// Save any ad params present in the current URL (last-touch wins per key).
export function captureAttribution() {
  try {
    const q = new URLSearchParams(window.location.search);
    const found = {};
    KEYS.forEach((k) => { const v = q.get(k); if (v) found[k] = v; });
    if (!Object.keys(found).length) return;
    const prev = JSON.parse(sessionStorage.getItem(STORE) || '{}');
    sessionStorage.setItem(STORE, JSON.stringify({ ...prev, ...found }));
  } catch { /* never break the app over analytics */ }
}

export function attrParams() {
  try { return JSON.parse(sessionStorage.getItem(STORE) || '{}'); } catch { return {}; }
}

// Append the persisted ad params to an internal path.
export function withAttr(path) {
  try {
    const p = attrParams();
    const keys = Object.keys(p);
    if (!keys.length) return path;
    const sep = path.includes('?') ? '&' : '?';
    return path + sep + keys.map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(p[k])}`).join('&');
  } catch { return path; }
}
