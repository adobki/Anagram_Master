/**
 * App updates. The service worker, registered here once, installs a new
 * version in the background and waits. The player chooses when to switch to
 * it, from the banner (components/UpdatePrompt.svelte) or from Settings.
 *
 * Nothing in here reloads a page unasked: not when a version is found, not
 * when another window updates (that window is told instead), and not on a
 * refresh. Two things keep a new version from switching in by itself:
 *   - the worker takes over every page it can (`clientsClaim` in vite.config.ts,
 *     and `public/sw-claim.js` for a page loaded without it), because a new
 *     version only waits while a page is using the current one;
 *   - this window reloads only after Update was pressed in it.
 * The one exception is a critical update (a security fix, say): the version
 * list in /version.json says from which version on an update is critical.
 * The banner still appears, but if it is dismissed, or the player moves on to
 * another screen, the update installs by itself the next time the app is on a
 * screen that isn't a game (`applyIfCritical`).
 * A new version is looked for (quietly, at most once a minute) when the app opens, whenever the home screen shows
 * (App.svelte), when the app comes back to the front, when the connection returns, every hour, and when About or
 * the Settings button asks. The resume trigger matters most on a phone: a backgrounded app does no navigation, and
 * its hourly timer is paused while it is frozen, so nothing else would notice a new version until a relaunch.
 * One thing remains by design: with every window closed, nothing is left to
 * wait for, so the next open starts the version that was already downloaded.
 */
import { useRegisterSW } from 'virtual:pwa-register/svelte'
import { appVersion } from './version'
import { compareVersions } from './version-format'

const HOUR = 60 * 60 * 1000
/** How soon a quiet check may repeat. About runs one every time it opens. */
const MIN_GAP = 60 * 1000
/** Longest to wait for a newly found version to finish installing. */
const INSTALL_WAIT = 20 * 1000
/** If the new worker hasn't taken over this soon after Update, reload anyway. */
const TAKEOVER_WAIT = 4 * 1000

class UpdateState {
  /** A new version is installed and waiting for the player to switch to it. */
  ready = $state(false)
  /** Another window has already switched to the new version. This one still runs the old code until it reloads. */
  elsewhere = $state(false)
  /** The waiting version's number, once known. */
  waiting = $state<string | null>(null)
  /** The oldest version that may keep running, from /version.json: anything older must update. */
  criticalSince = $state<string | null>(null)
  /** The waiting update is a critical one for this device. */
  critical = $derived(!!this.criticalSince && compareVersions(appVersion, this.criticalSince) < 0)
  /** A check is running, or a version it found is still installing. */
  busy = $state(false)
  /** What the last button-press check found. */
  outcome = $state<'current' | 'failed' | null>(null)

  #registration: ServiceWorkerRegistration | undefined
  #needRefresh: { set(value: boolean): void }
  #switchTo: (reload?: boolean) => Promise<void>
  #lastCheck = 0
  /** The player pressed Update in this window. */
  #applying = false
  /** "Later" was pressed for a critical update. */
  #dismissed = false
  /** The screen the player was on when a critical update was found (or dismissed): it installs once they leave it. */
  #foundOn: string | null = null
  #lastScreen: string | null = null

  constructor() {
    const { needRefresh, updateServiceWorker } = useRegisterSW({
      onRegisteredSW: (_url, registration) => {
        this.#registration = registration
        if (registration) {
          setInterval(() => void this.check(), HOUR)
          void this.check() // the app has just opened
        }
      },
      // When a new worker takes over, the library reloads the page by itself. That is right for the window
      // the player pressed Update in, but not for another one, which may be in the middle of a game.
      onNeedReload: () => (this.#applying ? location.reload() : this.#updatedElsewhere()),
    })
    this.#needRefresh = needRefresh
    this.#switchTo = updateServiceWorker
    needRefresh.subscribe((value) => {
      this.ready = value
      if (value) {
        this.elsewhere = false // a version is waiting, which is a fresh update
        this.#dismissed = false
        void this.#readVersion()
      }
    })

    // Back in front of the player (resumed from the background, or another tab selected), or back online.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void this.check()
    })
    addEventListener('online', () => void this.check())

    if ('serviceWorker' in navigator) {
      // The worker changed under this window without Update being pressed here: another window did it.
      let controlled = !!navigator.serviceWorker.controller
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (controlled && !this.#applying) this.#updatedElsewhere()
        controlled = true
      })
      // A page loaded without the worker (a hard refresh) asks it to take over, so a newer version waits. See public/sw-claim.js.
      if (import.meta.env.PROD) {
        void navigator.serviceWorker.ready.then((registration) => {
          if (!navigator.serviceWorker.controller) registration.active?.postMessage({ type: 'CLAIM' })
        })
      }
    }
  }

  #updatedElsewhere() {
    this.elsewhere = true
    this.ready = true
    void this.#readVersion()
  }

  /** The newest version's number, read from the server (dist/version.json). */
  async #readVersion() {
    try {
      const reply = await fetch('/version.json', { cache: 'no-store' })
      const data = await reply.json()
      this.waiting = typeof data.version === 'string' ? data.version : null
      this.criticalSince = typeof data.criticalSince === 'string' ? data.criticalSince : null
    } catch {
      // Keep the plain message.
    }
  }

  /**
   * Looks for a new version. Quiet by default, and it won't repeat within a
   * minute. A manual check (the Settings button) always runs and says in
   * `outcome` what it found. Either way it only downloads: nothing switches.
   */
  async check(manual = false) {
    if (this.busy) return
    if (!manual && Date.now() - this.#lastCheck < MIN_GAP) return
    if (manual) this.outcome = null
    const registration = this.#registration
    if (!registration) {
      // No service worker (the dev server, or an old browser): nothing to find.
      if (manual) this.outcome = 'current'
      return
    }
    this.busy = true
    try {
      await registration.update()
      this.#lastCheck = Date.now()
      // A version found now installs in the background first. Wait for that, so
      // "up to date" isn't said while a newer one is on its way.
      const installing = registration.installing
      if (installing) {
        await Promise.race([
          new Promise<void>((resolve) => {
            installing.addEventListener('statechange', () => {
              if (installing.state !== 'installing') resolve()
            })
          }),
          new Promise((resolve) => setTimeout(resolve, INSTALL_WAIT)),
        ])
        await new Promise((resolve) => setTimeout(resolve, 300)) // the "waiting" event follows a moment later
      }
      if (manual && !this.ready) this.outcome = 'current'
    } catch {
      if (manual) this.outcome = 'failed'
    } finally {
      this.busy = false
    }
  }

  /** Switch to the newest version (the page reloads). Only ever called by the player pressing a button. */
  apply() {
    // Nothing is waiting: another window already switched, so just reload to join it.
    if (this.elsewhere || !this.#registration?.waiting) return void location.reload()
    this.#applying = true
    void this.#switchTo(true)
    // Should the new worker not take over, don't leave the player with a button that did nothing.
    setTimeout(() => location.reload(), TAKEOVER_WAIT)
  }

  /**
   * A critical update installs by itself, but never in the middle of a game (or on the results right after
   * one). Called as the player moves between screens: it applies as soon as they are on a different screen
   * than the one they were on when the update arrived (or when they pressed Later), so pressing Later never
   * reloads the page under them, but the next screen they open does.
   */
  applyIfCritical(screen: string, busy = false) {
    this.#lastScreen = screen
    if (!(this.ready || this.#dismissed) || !this.critical || this.#applying) return
    this.#foundOn ??= screen
    if (screen === 'game' || screen === 'over' || screen === 'tutorial' || busy) return
    if (screen !== this.#foundOn) this.apply()
  }

  /** "Later": hide the banner until the next version is found. */
  dismiss() {
    this.#dismissed = true
    this.#foundOn = this.#lastScreen
    this.#needRefresh.set(false)
    this.ready = false
  }
}

export const update = new UpdateState()
