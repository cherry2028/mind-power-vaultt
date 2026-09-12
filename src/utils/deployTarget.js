// Which deployment is this bundle running on — and may it sync?
//
// Two independent facts decide it:
//   - the HOSTNAME the page is served from (the one thing a person can see in
//     the address bar), and
//   - the DATABASE the bundle was built against (VITE_SUPABASE_URL, baked in at
//     build time).
// Sync is allowed only when they agree:
//   mindpowervaultt.com + production database -> sync
//   any other host      + staging database    -> sync (preview test data)
//   anything else                              -> refuse
// So a preview can never read or write the students' journals, and a
// production-domain bundle accidentally built against staging refuses too.
//
// mind-power-vaultt.vercel.app is not a serving host: Vercel 307-redirects it
// to mindpowervaultt.com. www is not configured at all.

export const PROD_HOST = 'mindpowervaultt.com';
export const PROD_DB_REF = 'juuvefsegqghspaybrtf';
export const STAGING_DB_REF = 'bzgzykncrpoarggsrrnf';

// Height of the fixed PREVIEW — TEST DATA banner (PreviewBanner.jsx).
export const PREVIEW_BANNER_HEIGHT = 58;

// Build-time flag, false in every Vercel production build (vite.config.js), so
// the preview test tools are compiled out of what students download.
// eslint-disable-next-line no-undef
export const TEST_TOOLS_BUILD = typeof __MPV_TEST_TOOLS__ !== 'undefined' && __MPV_TEST_TOOLS__ === true;

export function dbRefOf(url) {
  try {
    const host = new URL(url).hostname;
    if (!host.endsWith('.supabase.co')) return null;
    const ref = host.slice(0, -'.supabase.co'.length);
    return /^[a-z0-9]+$/.test(ref) ? ref : null;
  } catch {
    return null;
  }
}

export function classifyTarget(hostname, supabaseUrl, testToolsBuild = false) {
  const isProdHost = hostname === PROD_HOST;
  const ref = dbRefOf(supabaseUrl);
  const db = ref === PROD_DB_REF ? 'production' : ref === STAGING_DB_REF ? 'staging' : 'unknown';
  const syncAllowed = isProdHost ? db === 'production' : db === 'staging';
  return {
    hostname,
    isProdHost,
    db,
    syncAllowed,
    // Preview test tools: never on the production host, never against the
    // production database, never in a production build.
    testTools: !!testToolsBuild && !isProdHost && db === 'staging',
  };
}

export const TARGET = classifyTarget(
  typeof window !== 'undefined' ? window.location.hostname : '',
  import.meta.env?.VITE_SUPABASE_URL || '',
  TEST_TOOLS_BUILD,
);

// The banner is decided by hostname alone — the thing a person can see.
export const SHOW_PREVIEW_BANNER = !TARGET.isProdHost;
