import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// The Flask API, started from the repo root with `python -m api.api`.
// The dev and preview servers forward /api/* to it, so the browser sees a
// single origin and the API's HttpOnly `session` cookie works with no CORS
// and no change to Flask.
const API = 'http://127.0.0.1:5555'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    svelte(),
    // Emits the web app manifest and a Workbox service worker on build.
    // Real icons, the offline screen and the update prompt come in mission 7.
    VitePWA({
      manifest: {
        name: 'Anagram Master',
        short_name: 'Anagram Master',
        description:
          'A timed word game: rearrange the letters of a root word to form as many new words as you can.',
        theme_color: '#0d0c11',
        background_color: '#0d0c11',
        display: 'standalone',
      },
      workbox: {
        // Precache the font and images too, so the app shell works offline.
        globPatterns: ['**/*.{js,css,html,woff2,png,svg}'],
        // API calls must always reach the server, never the cached app shell.
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  server: {
    proxy: { '/api': API },
  },
  // `vite preview` reuses server.proxy, so the production build can be
  // tried against the local API too.
})
