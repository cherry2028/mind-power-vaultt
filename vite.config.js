import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
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
