/**
 * App updates. The service worker, registered here once, installs a new
 * version in the background and waits. The player chooses when to switch to
 * it, from the banner (components/UpdatePrompt.svelte) or from Settings.
 */
import { useRegisterSW } from 'virtual:pwa-register/svelte'

const HOUR = 60 * 60 * 1000
/** How soon a quiet check may repeat. About runs one every time it opens. */
const MIN_GAP = 60 * 1000
/** Longest to wait for a newly found version to finish installing. */
const INSTALL_WAIT = 20 * 1000

class UpdateState {
  /** A new version is installed and waiting for the player to switch to it. */
  ready = $state(false)
  /** Its version number, once known. */
  waiting = $state<string | null>(null)
  /** A check is running, or a version it found is still installing. */
  busy = $state(false)
  /** What the last button-press check found. */
  outcome = $state<'current' | 'failed' | null>(null)

  #registration: ServiceWorkerRegistration | undefined
  #needRefresh: { set(value: boolean): void }
  #switchTo: (reload?: boolean) => Promise<void>
  #lastCheck = 0

  constructor() {
    const { needRefresh, updateServiceWorker } = useRegisterSW({
      onRegisteredSW: (_url, registration) => {
        this.#registration = registration
        if (registration) setInterval(() => void this.check(), HOUR)
      },
    })
    this.#needRefresh = needRefresh
    this.#switchTo = updateServiceWorker
    needRefresh.subscribe((value) => {
      this.ready = value
      if (value) void this.#readVersion()
    })
  }

  /** The waiting version's number, read from the server (dist/version.json). */
  async #readVersion() {
    try {
      const reply = await fetch('/version.json', { cache: 'no-store' })
      const data = await reply.json()
      this.waiting = typeof data.version === 'string' ? data.version : null
    } catch {
      // Keep the plain message.
    }
  }

  /**
   * Looks for a new version. Quiet by default, and it won't repeat within a
   * minute. A manual check (the Settings button) always runs and says in
   * `outcome` what it found.
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

  /** Switch to the waiting version (the page reloads). */
  apply() {
    void this.#switchTo(true)
  }

  /** "Later": hide the banner until the next version is found. */
  dismiss() {
    this.#needRefresh.set(false)
  }
}

export const update = new UpdateState()
