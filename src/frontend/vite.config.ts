import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json' with { type: 'json' }
import { displayVersion } from './src/lib/version-format.ts'

// The Flask API, started from the repo root with `python -m api.api`.
// The dev and preview servers forward /api/* to it, so the browser sees a
// single origin and the API's HttpOnly `session` cookie works with no CORS
// and no change to Flask.
// Override it with VITE_API_TARGET (see .env.example) to point the dev server somewhere else.
const API = loadEnv('development', process.cwd(), 'VITE_').VITE_API_TARGET || 'http://127.0.0.1:5555'

// https://vite.dev/config/
const criticalSince = (pkg as { criticalSince?: string }).criticalSince

export default defineConfig({
  plugins: [
    svelte(),
    // dist/version.json lets a running app ask what version is waiting to be
    // installed (see src/components/UpdatePrompt.svelte).
    {
      name: 'version-json',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'version.json',
          // criticalSince: devices older than this must update (see scripts/stamp-version.mjs).
          source: JSON.stringify({
            version: displayVersion(pkg.version),
            ...(criticalSince ? { criticalSince: displayVersion(criticalSince) } : {}),
          }),
        })
      },
    },
    // Emits the web app manifest and a Workbox service worker on build. The
    // app registers the worker itself (src/lib/update.svelte.ts), so a new
    // version waits for the player's go-ahead instead of reloading mid-game.
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Anagram Master',
        short_name: 'Anagram Master',
        description:
          'A timed word game: rearrange the letters of a root word to form as many new words as you can.',
        theme_color: '#0d0c11',
        background_color: '#0d0c11',
        display: 'standalone',
        orientation: 'any',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // A newer version only waits if a page is using the current one. A page the worker doesn't
        // control (the first visit, or after a hard refresh) would let it switch in at once, unasked,
        // so the worker takes pages over when it activates, and on request (public/sw-claim.js).
        clientsClaim: true,
        importScripts: ['sw-claim.js'],
        // Precache the font and images too, so the app shell works offline.
        globPatterns: ['**/*.{js,css,html,woff2,png,svg}'],
        // The API and the classic (v1) pages must always reach the server,
        // never the cached app shell.
        navigateFallbackDenylist: [/^\/api\//, /^\/v1(\/|$)/, /^\/static\//],
        // The About page's pictures (webp) are too many to precache. Keep each
        // one the first time it's seen, so the page also works offline.
        runtimeCaching: [
          {
            urlPattern: /\.webp$/,
            handler: 'CacheFirst',
            options: { cacheName: 'about-images', expiration: { maxEntries: 40 } },
          },
        ],
      },
    }),
  ],
  server: {
    // /v1 and /static are the classic pages, so they work from the dev server too.
    proxy: { '/api': API, '/v1': API, '/static': API },
  },
  // `vite preview` reuses server.proxy, so the production build can be
  // tried against the local API too.
})
