/**
 * Full screen, for the browsers that allow it: computers, Android, iPads. (Not
 * iPhones, which only do it for video; the switch is left out there.)
 *
 * The Settings switch is a standing preference: it stays on until the player
 * turns it off. A browser only starts full screen from a tap or key press, so:
 *   - switching it on starts full screen at once (from the tap on the switch);
 *   - whenever the page isn't full screen and the switch is on (the app just
 *     opened, Esc or the back gesture left it, another app was in front), the
 *     next tap or key press goes back in, which is how it follows the player
 *     from screen to screen and into a game;
 *   - taps inside Settings don't, so the switch can still be turned off;
 *   - switching it off, or resetting settings, leaves full screen.
 */
import { canFullscreen } from './device'
import { settings } from './settings.svelte'
import { ui } from './ui.svelte'

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
  supported = canFullscreen
  /** The page is full screen right now. */
  active = $state(isActive())

  #unloading = false
  /** The player is exiting the app: leaving full screen isn't a reason to ask for it back. */
  #quitting = false
  #waiting = false

  constructor() {
    if (!this.supported) return

    const changed = () => {
      const was = this.active
      this.active = isActive()
      // It ended (Esc, the back gesture, another app). The switch is still on, so go back in on the next tap.
      if (was && !this.active && !this.#unloading && !this.#quitting && settings.fullscreen) this.#startOnNextTap()
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

  /**
   * Browsers only allow full screen from a tap or key press, so wait for one. They disagree about which events
   * count: Chrome takes `pointerup`, but Safari and Firefox on a touch screen only treat `touchend` and `click` as a
   * real tap (the Settings switch works everywhere because it is a click). So all of them are tried.
   */
  #startOnNextTap() {
    if (this.#waiting) return
    this.#waiting = true
    const events = ['pointerup', 'touchend', 'click', 'keydown'] as const
    const stop = () => {
      for (const type of events) removeEventListener(type, attempt, true)
      this.#waiting = false
    }
    let trying = false
    const attempt = async (event: Event) => {
      if (!settings.fullscreen || this.active) return stop()
      if (ui.settingsOpen) return // someone is in Settings, maybe about to switch it off
      if (event instanceof KeyboardEvent && event.key === 'Escape') return // that is how it is left, not a gesture to enter by
      if (trying) return // one tap sends several events; ask once
      trying = true
      try {
        await this.enter(event.type) // asked for synchronously, while the tap still counts
      } finally {
        trying = false
      }
      if (this.active) stop()
    }
    for (const type of events) addEventListener(type, attempt, true)
  }

  /** Must be called from a tap or key press, or the browser refuses. */
  async enter(trigger = 'switch') {
    try {
      if (root.requestFullscreen) await root.requestFullscreen({ navigationUI: 'hide' })
      else await root.webkitRequestFullscreen?.()
    } catch (error) {
      // Not allowed just now (no tap before it, or the browser said no). Left in the console for remote debugging.
      console.debug(`Full screen refused after "${trigger}":`, error)
    }
  }

  /** Leave full screen because the player is exiting the app (the preference is kept for the next time it opens). */
  async leave() {
    this.#quitting = true
    setTimeout(() => (this.#quitting = false), 2000)
    await this.exit()
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
