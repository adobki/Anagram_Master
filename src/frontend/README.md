# Anagram Master: front end

The new player-facing app for the Anagram Master API, built as a mobile-first, installable web app (PWA). It uses three tools:

- [Svelte 5](https://svelte.dev) with TypeScript for the components;
- [Vite](https://vite.dev) for the dev server and the build;
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app) to generate the web app manifest and the service worker.

## Requirements

- Node.js 20.19+ or 22.12+.
- The API running locally. From the repo root, `python -m api.api` starts it on port 5555.

## Run it

```sh
npm install      # first time, and whenever dependencies change
npm run dev      # http://localhost:5173, reloads as you edit
```

The dev server forwards every `/api/...` request to Flask on `127.0.0.1:5555`. To the browser, the app and the API are one site, so the game cookie works with no CORS setup and no Flask changes.

To test on a phone on the same Wi-Fi, run `npm run dev:lan` and open the "Network" URL it prints. The first time, Windows Firewall asks whether Node.js may accept connections.

**Design preview.** Until mission 5, the screens run on a local mock of the API (`src/lib/mock.svelte.ts`), so Flask isn't needed yet. Open `/#game` or `/#over` to jump straight to the game or game-over screen.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Starts the dev server with hot reload |
| `npm run dev:lan` | Starts the same server, reachable from other devices on your network |
| `npm run check` | Type-checks the code (`svelte-check` and `tsc`) |
| `npm run build` | Builds for production into `dist/`, including the service worker and manifest |
| `npm run preview` | Serves `dist/` on http://localhost:4173, also proxied to the API |

`npm run preview` registers the service worker, which caches the app. After a rebuild, the old version can stay on screen. To pick up the new one, enable DevTools → Application → Service workers → "Update on reload".

## Layout

| Path | Contents |
|---|---|
| `index.html` | The page shell Vite starts from |
| `src/main.ts` | Mounts the app |
| `src/App.svelte` | The root component; switches between screens |
| `src/screens/` | Full screens: home, game, game over |
| `src/components/` | Reusable pieces: buttons, letter tiles, timer, score, word list, dialog, toasts |
| `src/styles/tokens.css` | Design tokens: light and dark colours, type, spacing, radii, motion |
| `src/lib/api.ts` | Typed client for `/api/v1` |
| `src/lib/game.ts` | `GameController`, the interface the game screen plays through |
| `src/lib/letters.ts` | Turns a root word into tiles (letters only; `-` and `'` are dropped) |
| `src/lib/theme.svelte.ts` | Light/dark theme: follows the system until toggled, then remembered |
| `src/lib/mock.svelte.ts` | Stand-in for the API during the design preview (removed in mission 5) |
| `src/assets/` | Images imported by components (fingerprinted on build) |
| `public/` | Files copied as-is, such as the favicon |
| `vite.config.ts` | Svelte and PWA plugins, and the API proxy |
