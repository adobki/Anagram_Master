/**
 * Light/dark theme. It follows the system until the player picks one, and the
 * pick is remembered on this device. index.html applies the same rule before
 * first paint, so keep KEY and the data-theme attribute in sync with it.
 */

export type Theme = 'light' | 'dark'

const KEY = 'am-theme'
const media = window.matchMedia('(prefers-color-scheme: dark)')

function load(): Theme | null {
  try {
    const value = localStorage.getItem(KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

function save(value: Theme | null) {
  try {
    if (value) localStorage.setItem(KEY, value)
    else localStorage.removeItem(KEY)
  } catch {
    // Storage is blocked (e.g. private mode): the choice lasts for this visit.
  }
}

function apply(theme: Theme) {
  const root = document.documentElement
  const swap = () => {
    root.dataset.theme = theme
    const bg = getComputedStyle(root).getPropertyValue('--bg').trim()
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg)
  }
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  // Cross-fade where the browser supports view transitions.
  if (document.startViewTransition && !reduced) document.startViewTransition(swap)
  else swap()
}

class ThemeState {
  #choice = $state<Theme | null>(load())
  #system = $state<Theme>(media.matches ? 'dark' : 'light')

  /** The theme on screen now. */
  current: Theme = $derived(this.#choice ?? this.#system)

  constructor() {
    media.addEventListener('change', (event) => {
      this.#system = event.matches ? 'dark' : 'light'
      if (!this.#choice) apply(this.#system)
    })
  }

  toggle() {
    const next: Theme = this.current === 'dark' ? 'light' : 'dark'
    // Choosing what the system already uses means "follow the system" again.
    this.#choice = next === this.#system ? null : next
    save(this.#choice)
    apply(next)
  }
}

export const theme = new ThemeState()
