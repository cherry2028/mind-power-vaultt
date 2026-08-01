/* Mind Power Vaultt — service worker (injectManifest source).
 *
 * Deliberately hand-written and dependency-free:
 *   - the app shell is precached so the journal opens instantly, even offline
 *     (the journal is already local-first; the shell now matches that)
 *   - NOTHING data-related is ever cached: Supabase and /api responses go
 *     straight to the network, because the sync engine owns data
 *   - blob: URLs (the journal iframe) never reach a service worker at all —
 *     only http/https requests are intercepted — so journal rendering is
 *     structurally unaffected
 *   - updates are prompt-based: a new worker waits until the app tells it to
 *     SKIP_WAITING, so a bundle never swaps mid-journal
 */

// Injected at build time by vite-plugin-pwa: [{ url, revision }, ...]
const MANIFEST = self.__WB_MANIFEST || [];

// Cache name derived from the manifest contents, so each deploy gets a fresh
// cache and stale bundles can never be served after an update.
function hash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
const CACHE = `mpv-shell-${hash(JSON.stringify(MANIFEST))}`;
const SHELL_URLS = MANIFEST.map((e) => e.url);

// Never touched by the service worker — the sync engine and API own these.
// Matched by BOTH host and path: a self-hosted or custom-domain Supabase would
// slip past a hostname-only check, and caching journal data would be a
// correctness bug (the sync engine is the single source of truth).
function isDataRequest(url) {
  return (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/rest/v1/') ||
    url.pathname.startsWith('/auth/v1/') ||
    url.pathname.startsWith('/storage/v1/') ||
    url.pathname.startsWith('/realtime/v1/') ||
    url.hostname.endsWith('.supabase.co') ||
    url.hostname.endsWith('.supabase.in') ||
    url.hostname.includes('google-analytics') ||
    url.hostname.includes('googletagmanager')
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      // addAll fails atomically on one bad response; add individually so a
      // single missing asset can't block the whole install.
      Promise.all(
        SHELL_URLS.map((u) =>
          cache.add(new Request(u, { cache: 'reload' })).catch(() => {})
        )
      )
    )
  );
  // NOTE: no skipWaiting() here — the app prompts the student first.
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k.startsWith('mpv-shell-') && k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return; // non-standard scheme — leave it alone
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (isDataRequest(url)) return; // straight to network, never cached

  // Navigations: network-first so a fresh deploy is picked up immediately,
  // falling back to the cached shell when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(async () => {
        const cache = await caches.open(CACHE);
        return (
          (await cache.match('/index.html')) ||
          (await cache.match('/')) ||
          Response.error()
        );
      })
    );
    return;
  }

  // Same-origin static assets: cache-first (filenames are content-hashed).
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req)
            .then((res) => {
              if (res && res.ok && res.type === 'basic') {
                const copy = res.clone();
                caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
              }
              return res;
            })
            .catch(() => hit || Response.error())
      )
    );
  }
  // Cross-origin (fonts, CDNs): default network handling.
});

// ─────────────────────────── Web Push ───────────────────────────
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : '' };
  }
  const title = payload.title || 'Mind Power Vaultt';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: payload.tag || 'mpv-reminder',
      renotify: false,
      data: { url: payload.url || '/portal' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/portal';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(target) && 'focus' in client) return client.focus();
      }
      if (list.length && 'navigate' in list[0]) return list[0].navigate(target).then((c) => c && c.focus());
      return self.clients.openWindow(target);
    })
  );
});
