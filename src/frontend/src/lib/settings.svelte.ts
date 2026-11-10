/**
 * Per-device preferences, saved in one localStorage entry.
 *
 * Only what the player has chosen is stored. That lets a default depend on the
 * device (it is worked out when read), and "Reset settings" just deletes the
 * entry. The theme has its own key (lib/theme.svelte.ts), because index.html
 * reads it before first paint.
 */

const KEY = 'am-settings'

/** Every setting and its type. To add one: list it here, give it a default, then add its accessor below. */
interface Choices {
  /** Keep the tray's letters after submitting a word. */
  keepLetters: boolean
}

type Stored = { [K in keyof Choices]: Choices[K] | null }

const DEFAULTS: { [K in keyof Choices]: () => Choices[K] } = {
  keepLetters: () => false,
}

const KEYS = Object.keys(DEFAULTS) as (keyof Choices)[]

function load(): Stored {
  const stored = Object.fromEntries(KEYS.map((key) => [key, null])) as Stored
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (raw && typeof raw === 'object') {
      for (const key of KEYS) {
        const value = (raw as Record<string, unknown>)[key]
        // Ignore anything of the wrong type (an old or hand-edited entry).
        if (typeof value === typeof DEFAULTS[key]()) (stored as Record<string, unknown>)[key] = value
      }
    }
  } catch {
    // Unreadable or blocked: everything stays at its default.
  }
  return stored
}

function save(stored: Stored) {
  try {
    const chosen = Object.fromEntries(Object.entries(stored).filter(([, value]) => value !== null))
    if (Object.keys(chosen).length) localStorage.setItem(KEY, JSON.stringify(chosen))
    else localStorage.removeItem(KEY)
  } catch {
    // Storage is blocked (e.g. private mode): the choices last for this visit.
  }
}

class SettingsState {
  #stored = $state<Stored>(load())

  constructor() {
    // Another tab or window of the app changed them.
    addEventListener('storage', (event) => {
      if (event.key === KEY || event.key === null) this.#stored = load()
    })
  }

  #get<K extends keyof Choices>(key: K): Choices[K] {
    return (this.#stored[key] ?? DEFAULTS[key]()) as Choices[K]
  }

  #set<K extends keyof Choices>(key: K, value: Choices[K]) {
    this.#stored[key] = value
    save(this.#stored)
  }

  get keepLetters() {
    return this.#get('keepLetters')
  }
  set keepLetters(value: boolean) {
    this.#set('keepLetters', value)
  }

  /** Back to the defaults. (The theme is reset separately, in lib/theme.svelte.ts.) */
  reset() {
    for (const key of KEYS) this.#stored[key] = null
    save(this.#stored)
  }
}

export const settings = new SettingsState()
