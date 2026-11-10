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

**The API must be running.** The app plays against the real game server, so start Flask first. Locally, games and scores go to whichever database `utils/MongoDB.py` points at.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Starts the dev server with hot reload |
| `npm run dev:lan` | Starts the same server, reachable from other devices on your network |
| `npm run check` | Type-checks the code (`svelte-check` and `tsc`) |
| `npm run build` | Builds for production into `dist/`, including the service worker and manifest |
| `npm run preview` | Serves `dist/` on http://localhost:4173, also proxied to the API |
| `npm run stamp` | Stamps a new version into `package.json` and `package-lock.json` (see Versioning) |

`npm run preview` runs the real service worker, which caches the app for offline use. See Updates below for what happens after a rebuild.

## Updates

A new version never takes over a page by itself. When one is found, the player is told and chooses when to switch.

- **Finding one.** The app looks when the About screen opens, once an hour, and when Settings → Updates → Check is pressed. It only downloads; nothing switches.
- **Telling the player.** A "Version … is ready" card with Update and Later (held back during a game), and a dot on the gear. Update switches and reloads. Later hides the card until the next version.
- **Refreshing keeps the current version.** The old version stays until Update is pressed. A hard refresh (Ctrl+Shift+R) skips the service worker by design, so it loads whatever is on the server.
- **Other windows** are never reloaded under their player: if Update is pressed in one window, the others get an "updated in another window" card with a Reload button.
- **Why a new version waits.** A service worker only waits while some page is using the current one. So the worker takes over every page it can: `clientsClaim` in `vite.config.ts`, and `public/sw-claim.js` for a page that was loaded without it (a hard refresh). Without that, a page the worker doesn't control, such as the first visit, would let a newer version switch in at once, with no card, and the next refresh would show it.
- **By design.** With every window closed, nothing is left to wait for, so the next open starts the version that was already downloaded.
- **While developing,** DevTools → Application → Service workers → "Update on reload" and "Bypass for network" switch pages over without asking. Leave them off when testing updates.

## Versioning

The app's version is `v2.YYMMDD`, with `.HHMM` added when a second version ships on the same day (for example `v2.261110`, then `v2.261110.1432`). It is shown at the bottom of the About screen and in the update prompt.

It is stored in `package.json` and `package-lock.json`, because that is where npm keeps a version, and the app imports it from there (`src/lib/version.ts`). npm needs three numeric parts without leading zeros, so the stored form is `2.261110.0` for a day's first version and `2.261110.<HHMM as a number>` for later ones (09:05 is `905`); `src/lib/version-format.ts` turns it back into the text above.

**Run `npm run stamp` before every commit that changes the front end, and commit both files with it.** The script compares today with the version stored in the last commit, so running it twice before one commit gives the same date part.

## Settings

The gear in every screen's header opens one Settings fly-out (`components/Settings.svelte`, mounted once in `App.svelte`). It has the player name (not shown during a game, because the API only takes a name when a game starts), theme, text size, motion and contrast, sound effects, vibration, play options, install and update controls, and two reset buttons.

- **Storing.** `lib/settings.svelte.ts` keeps one `am-settings` entry in localStorage, holding only what the player chose. A default can therefore depend on the device (the keyboard setting starts on for touch-first devices), and "Reset settings" just deletes the entry. The theme (`am-theme`) is separate because `index.html` reads it before first paint. `index.html` also applies the text size, motion and contrast choices before first paint, and the store keeps the same `data-*` attributes on `<html>` up to date. Keep the two in step.
- **Adding a setting.** List it in `Choices` and `DEFAULTS` in `settings.svelte.ts`, add its getter and setter, then put a `Switch` or `Segmented` in `Settings.svelte`. If something else saves to localStorage, add its key to `lib/data.ts`.
- **Reduced motion** is decided in one place, `reducedMotion()` in `lib/motion.ts`, which honours the player's choice before the device's. CSS uses `[data-motion]` the same way (`styles/base.css`).
- **Sound** is made with Web Audio, with no audio files. `lib/sound-voices.ts` has the notes: soft sine tones from one pentatonic scale, nothing above about 1.3 kHz, a short attack so nothing clicks, and peaks under half scale after the master volume. Keep new sounds to that. They can be checked by rendering them in an `OfflineAudioContext` and measuring the peak and spectrum.

## About screen screenshots

The About screen's pictures (`src/assets/about/shot-*.webp`) are 16 screenshots: four screens, each for phones and for desktop, in light and dark. `scripts/screenshots.mjs` plays real games in Edge to make them, and takes about two minutes. Start the server against a test database first, because games scoring 10 or more are saved:

```sh
npm i --no-save playwright-core sharp     # kept out of package.json on purpose
cd ../backend && am_database_name=AM_FE_tests PORT=5555 python -m server
node scripts/screenshots.mjs              # from src/frontend (add a base URL if the server isn't on port 5555)
```

Re-run it whenever a screen it shows changes. The diagrams on that screen are hand-drawn SVGs in `src/assets/about/`.

## Layout

| Path | Contents |
|---|---|
| `index.html` | The page shell Vite starts from |
| `src/main.ts` | Mounts the app |
| `src/App.svelte` | The root component; switches between screens |
| `src/screens/` | Full screens: home, game, game over, leaderboard, help, about |
| `src/components/` | Reusable pieces: buttons, letter tiles, rack, tray, timer, score, word list, dialog, toasts |
| `src/styles/tokens.css` | Design tokens: light and dark colours, type, spacing, radii, motion |
| `src/styles/base.css` | Global styles, including the root font size that scales the UI up on big screens |
| `src/lib/drag.svelte.ts` | Drag and drop for tiles (pointer events, so touch and mouse both work) |
| `src/lib/api.ts` | Typed client for `/api/v1` |
| `src/lib/game.ts` | `GameController`, the interface the game screen plays through |
| `src/lib/api-game.svelte.ts` | `GameController` on the API: local clock, game-over handling, reply messages |
| `src/lib/letters.ts` | Turns a root word into tiles (letters only; `-` and `'` are dropped) |
| `src/lib/theme.svelte.ts` | Light/dark theme: follows the device until the player picks Light or Dark in Settings, then remembered |
| `src/lib/settings.svelte.ts` | The player's preferences, saved on the device (see Settings) |
| `src/lib/player.svelte.ts` | The remembered player name, shared by Home and Settings |
| `src/lib/sound.ts`, `sound-voices.ts` | Sound effects: the player, and the notes themselves |
| `src/lib/device.ts` | What the device can do (touch-first, vibration, wake lock) |
| `src/lib/update.svelte.ts`, `install.svelte.ts` | The service worker's updates, and installing the app |
| `src/lib/data.ts` | The localStorage keys "Clear my data" removes |
| `src/assets/` | Images imported by components (fingerprinted on build) |
| `public/` | Files copied as-is: the favicon and the PWA icons (made from the logo's helix) |
| `vite.config.ts` | Svelte and PWA plugins, and the API proxy |
