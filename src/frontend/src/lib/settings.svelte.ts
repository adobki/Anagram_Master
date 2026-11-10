/**
 * Per-device preferences, saved in one localStorage entry.
 *
 * Only what the player has chosen is stored. That lets a default depend on the
 * device (it is worked out when read), and "Reset settings" just deletes the
 * entry. The theme has its own key (lib/theme.svelte.ts), because index.html
 * reads it before first paint.
 */

import { touchFirst } from './device'

const KEY = 'am-settings'

/** The sound effects that can each be switched on or off. */
export type Effect = 'word' | 'wrong' | 'cleared' | 'countdown' | 'over'

/** Every setting and its type. To add one: list it here, give it a default, then add its accessor below. */
interface Choices {
  /** Keep the tray's letters after submitting a word. */
  keepLetters: boolean
  /** Sound effects: the master switch, the volume (0 to 100) and one switch per effect. */
  sound: boolean
  volume: number
  sfxWord: boolean
  sfxWrong: boolean
  sfxCleared: boolean
  sfxCountdown: boolean
  sfxOver: boolean
  /** Vibration for rejected words and cleared rounds. */
  haptics: boolean
  /** One buzz when ten seconds are left in a round (needs `haptics`). */
  lowTimeBuzz: boolean
  /** Confetti when a round is cleared. */
  celebrations: boolean
  /** Games ignore the keyboard, so only the on-screen controls work. */
  keyboardOff: boolean
  /** Skip asks for a second tap, because it costs the round. */
  confirmSkip: boolean
  /** Keep the screen awake while a game is showing. */
  keepAwake: boolean
  /** Open straight into a game in progress, skipping Home. */
  autoResume: boolean
}

const SFX_KEY = {
  word: 'sfxWord',
  wrong: 'sfxWrong',
  cleared: 'sfxCleared',
  countdown: 'sfxCountdown',
  over: 'sfxOver',
} as const satisfies Record<Effect, keyof Choices>

type Stored = { [K in keyof Choices]: Choices[K] | null }

const DEFAULTS: { [K in keyof Choices]: () => Choices[K] } = {
  keepLetters: () => false,
  sound: () => true,
  volume: () => 70,
  sfxWord: () => true,
  sfxWrong: () => true,
  sfxCleared: () => true,
  sfxCountdown: () => true,
  sfxOver: () => true,
  haptics: () => !matchMedia('(prefers-reduced-motion: reduce)').matches, // off for people who ask for less motion
  lowTimeBuzz: () => true,
  celebrations: () => true,
  keyboardOff: () => touchFirst, // a phone or tablet is used by touch
  confirmSkip: () => true,
  keepAwake: () => true,
  autoResume: () => false,
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

  get sound() {
    return this.#get('sound')
  }
  set sound(value: boolean) {
    this.#set('sound', value)
  }

  /** 0 to 100. */
  get volume() {
    return Math.min(100, Math.max(0, this.#get('volume')))
  }
  set volume(value: number) {
    this.#set('volume', Math.round(Math.min(100, Math.max(0, value))))
  }

  /** Whether one effect is switched on (the master `sound` switch is separate). */
  sfx(effect: Effect): boolean {
    return this.#get(SFX_KEY[effect])
  }
  setSfx(effect: Effect, on: boolean) {
    this.#set(SFX_KEY[effect], on)
  }

  get haptics() {
    return this.#get('haptics')
  }
  set haptics(value: boolean) {
    this.#set('haptics', value)
  }

  get lowTimeBuzz() {
    return this.#get('lowTimeBuzz')
  }
  set lowTimeBuzz(value: boolean) {
    this.#set('lowTimeBuzz', value)
  }

  get celebrations() {
    return this.#get('celebrations')
  }
  set celebrations(value: boolean) {
    this.#set('celebrations', value)
  }

  get keyboardOff() {
    return this.#get('keyboardOff')
  }
  set keyboardOff(value: boolean) {
    this.#set('keyboardOff', value)
  }

  get confirmSkip() {
    return this.#get('confirmSkip')
  }
  set confirmSkip(value: boolean) {
    this.#set('confirmSkip', value)
  }

  get keepAwake() {
    return this.#get('keepAwake')
  }
  set keepAwake(value: boolean) {
    this.#set('keepAwake', value)
  }

  get autoResume() {
    return this.#get('autoResume')
  }
  set autoResume(value: boolean) {
    this.#set('autoResume', value)
  }

  /** Back to the defaults. (The theme is reset separately, in lib/theme.svelte.ts.) */
  reset() {
    for (const key of KEYS) this.#stored[key] = null
    save(this.#stored)
  }
}

export const settings = new SettingsState()
