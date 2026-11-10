/**
 * Full screen, for the browsers that allow it: computers, Android, iPads. (Not
 * iPhones, which only do it for video; the switch is left out there.)
 *
 * The Settings switch is the player's preference, and this keeps it true to
 * what is on screen:
 *   - switching it on starts full screen at once (from the tap on the switch);
 *   - a browser only starts full screen from a tap or key press, so when the
 *     app opens with it on, it starts on the first tap or key press;
 *   - leaving full screen yourself (Esc, the back gesture) switches it off,
 *     so the app doesn't keep pulling you back in;
 *   - switching it off, or resetting settings, leaves full screen.
 */
import { settings } from './settings.svelte'

type FullscreenDocument = Document & {
  webkitFullscreenEnabled?: boolean
  webkitFullscreenElement?: Element | null
  webkitExitFullscreen?: () => Promise<void> | void
}
type FullscreenElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void }

const doc = document as FullscreenDocument
const root = document.documentElement as FullscreenElement

const isActive = () => !!(doc.fullscreenElement ?? doc.webkitFullscreenElement)

class FullscreenState {
  /** The browser can do it. */
  supported = !!(doc.fullscreenEnabled || doc.webkitFullscreenEnabled)
  /** The page is full screen right now. */
  active = $state(isActive())

  #unloading = false
  #waiting = false

  constructor() {
    if (!this.supported) return

    const changed = () => {
      const was = this.active
      this.active = isActive()
      if (!was || this.active || this.#unloading) return
      // It ended. If the player did it (Esc, the back gesture), take that as "off". If the page just went
      // to the background, which some phones treat as leaving full screen, it's still wanted: go back in on the next tap.
      if (document.visibilityState === 'visible') settings.fullscreen = false
      else this.#startOnNextTap()
    }
    doc.addEventListener('fullscreenchange', changed)
    doc.addEventListener('webkitfullscreenchange', changed)

    // A reload or leaving the page ends full screen too, but that isn't the player turning it off.
    addEventListener('pagehide', () => (this.#unloading = true))
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && settings.fullscreen && !this.active) this.#startOnNextTap()
    })

    // Turned off in Settings, by Reset settings, or in another window: leave full screen.
    $effect.root(() => {
      $effect(() => {
        if (!settings.fullscreen && this.active) void this.exit()
      })
    })

    if (settings.fullscreen) this.#startOnNextTap()
  }

  /** Browsers only allow full screen from a tap or key press, so wait for one. */
  #startOnNextTap() {
    if (this.#waiting) return
    this.#waiting = true
    const events = ['pointerup', 'keydown'] as const
    const stop = () => {
      for (const type of events) removeEventListener(type, attempt, true)
      this.#waiting = false
    }
    const attempt = async () => {
      if (!settings.fullscreen || this.active) return stop()
      await this.enter() // asked for synchronously, while the tap still counts
      if (this.active) stop()
    }
    for (const type of events) addEventListener(type, attempt, true)
  }

  /** Must be called from a tap or key press, or the browser refuses. */
  async enter() {
    try {
      if (root.requestFullscreen) await root.requestFullscreen({ navigationUI: 'hide' })
      else await root.webkitRequestFullscreen?.()
    } catch {
      // Not allowed just now (no tap before it, or the browser said no).
    }
  }

  async exit() {
    try {
      if (!isActive()) return
      if (doc.exitFullscreen) await doc.exitFullscreen()
      else await doc.webkitExitFullscreen?.()
    } catch {
      // Already out.
    }
  }
}

export const fullscreen = new FullscreenState()
