/**
 * Installing the app. Chrome, Edge and Samsung Internet offer a prompt that
 * the page can start from its own button; they announce it with an event that
 * has to be caught early and kept. Safari on iPhone and iPad has no such
 * prompt, so there the player is told which menu to use.
 */

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const standalone = matchMedia('(display-mode: standalone)')

class InstallState {
  #offer = $state.raw<InstallPromptEvent | null>(null)
  /** The app is already running as an installed app. */
  installed = $state(standalone.matches || (navigator as { standalone?: boolean }).standalone === true)

  constructor() {
    addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault() // keep it for our own button, instead of the browser's mini bar
      this.#offer = event as InstallPromptEvent
    })
    addEventListener('appinstalled', () => {
      this.installed = true
      this.#offer = null
    })
    standalone.addEventListener('change', () => (this.installed = standalone.matches))
  }

  /** The browser has offered to install it, and it isn't installed yet. */
  get available() {
    return !!this.#offer && !this.installed
  }

  /** An iPhone or iPad, where installing is done from the Share menu. */
  get needsShareMenu() {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    return ios && !this.installed
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
