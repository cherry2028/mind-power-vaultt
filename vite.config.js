import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'

// A human-readable build id, shown in the journal's More menu and exposed as
// window.MPV_BUILD. It is how we can tell whether a student's installed app has
// actually picked up a deploy — "what version do you see?" beats guessing.
function buildId() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}.${p(d.getHours())}${p(d.getMinutes())}`;
  let sha = (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7);
  if (!sha) {
    try { sha = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); }
    catch { /* not a git checkout — the timestamp alone still identifies the build */ }
  }
  return sha ? `${stamp}-${sha}` : stamp;
}

// https://vite.dev/config/
export default defineConfig({
  define: { __BUILD_ID__: JSON.stringify(buildId()) },
  plugins: [
    react(),
    VitePWA({
      // Hand-written service worker (src/sw.js) — we need precise control over
      // what is never cached (Supabase/API) and how updates roll out.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      // 'prompt': a new worker waits until the student taps refresh, so a
      // bundle never swaps out mid-journal.
      registerType: 'prompt',
      injectRegister: null, // registered explicitly in src/pwa.js
      // The OS fetches manifest icons itself at install time; precaching them
      // would add ~215 KB to every student's first load for nothing.
      includeManifestIcons: false,
      injectManifest: {
        // App shell only.
        globPatterns: ['**/*.{js,css,html}'],
        // jsPDF and html2canvas are lazily imported (weekly PDF + share cards).
        // They'd add ~580 KB to the install for features most students touch
        // once a week — the runtime cache-first handler picks them up on first
        // use instead, and they stay available offline from then on.
        globIgnores: ['**/jspdf*.js', '**/html2canvas*.js'],
      },
      manifest: {
        name: 'Mind Power Vaultt — Trading Journal',
        short_name: 'MPV Journal',
        description: 'Telugu trading psychology journal — daily license, discipline tracking and weekly reports.',
        lang: 'te',
        // Front door: the journal session lives in sessionStorage and does not
        // survive an app relaunch, so land on the portal (login) instead of a
        // locked journal screen.
        start_url: '/portal',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#05050A',
        background_color: '#05050A',
        categories: ['finance', 'education', 'productivity'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  server: {
    port: 5173
  }
})
