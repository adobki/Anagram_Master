/**
 * Installing the app. Chrome, Edge and Samsung Internet offer a prompt that
 * the page can start from its own button; they announce it with an event that
 * has to be caught early and kept (and only while the browser thinks it
 * worthwhile). Safari on iPhone and iPad, and Firefox, have no such prompt, so
 * there the player is shown which menu to use (components/InstallGuide.svelte).
 * Every place that offers installing calls `install.start()`, which uses the
 * prompt when there is one and the guide when there isn't.
 */

/** Where the home-screen card was last dismissed (ms since 1970); it comes back after a while. */
const SNOOZE_KEY = 'am-install'
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000

const ua = navigator.userAgent
export type Platform = 'ios' | 'android' | 'desktop'
export type Browser = 'safari' | 'chrome' | 'edge' | 'firefox' | 'samsung' | 'other'

export const platform: Platform =
  /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    ? 'ios'
    : /Android/.test(ua)
      ? 'android'
      : 'desktop'

export const browser: Browser = /SamsungBrowser/.test(ua)
  ? 'samsung'
  : /EdgiOS|Edg\//.test(ua)
    ? 'edge'
    : /FxiOS|Firefox/.test(ua)
      ? 'firefox'
      : /CriOS|Chrome/.test(ua)
        ? 'chrome'
        : /Safari/.test(ua)
          ? 'safari'
          : 'other'

function snoozedUntil(): number {
  try {
    return Number(localStorage.getItem(SNOOZE_KEY)) + SNOOZE_MS
  } catch {
    return 0
  }
}

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const standalone = matchMedia('(display-mode: standalone)')
/** A browser tab can't tell that the app is installed elsewhere on the device, so the app remembers having run as one. */
const INSTALLED = 'am-installed'

function remembered(): boolean {
  try {
    return localStorage.getItem(INSTALLED) === '1'
  } catch {
    return false
  }
}

function remember() {
  try {
    localStorage.setItem(INSTALLED, '1')
  } catch {
    // Storage is blocked: it just isn't remembered.
  }
}

class InstallState {
  #offer = $state.raw<InstallPromptEvent | null>(null)
  /** The app is already running as an installed app. */
  installed = $state(standalone.matches || (navigator as { standalone?: boolean }).standalone === true)
  /** The how-to-install dialog is open. */
  guideOpen = $state(false)
  #snoozed = $state(snoozedUntil() > Date.now())

  constructor() {
    if (this.installed) remember()
    addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault() // keep it for our own button, instead of the browser's mini bar
      this.#offer = event as InstallPromptEvent
    })
    addEventListener('appinstalled', () => {
      this.installed = true
      remember()
      this.#offer = null
    })
    standalone.addEventListener('change', () => {
      this.installed = standalone.matches
      if (this.installed) remember()
    })
  }

  /** The app is installed on this device as far as it can tell: running as an app now, or has been before. */
  get onDevice() {
    return this.installed || remembered()
  }

  /** The browser has offered to install it, and it isn't installed yet. */
  get available() {
    return !!this.#offer && !this.installed
  }

  /** The home screen's reminder is due: not installed, and not dismissed lately. */
  get nudge() {
    return !this.installed && !this.#snoozed
  }

  /** "Not now" on the reminder: it stays away for a couple of weeks. */
  snooze() {
    this.#snoozed = true
    try {
      localStorage.setItem(SNOOZE_KEY, String(Date.now()))
    } catch {
      // Storage is blocked: it will show again next visit.
    }
  }

  /** The Install buttons: the browser's own prompt if it offered one, otherwise the step-by-step guide. */
  start() {
    if (this.available) void this.prompt()
    else this.guideOpen = true
  }

  async prompt() {
    const offer = this.#offer
    if (!offer) return
    this.#offer = null // an offer can only be used once
    await offer.prompt()
    if ((await offer.userChoice).outcome === 'accepted') this.installed = true
  }
}

export const install = new InstallState()
