/**
 * The practice game: a GameController that runs entirely on the device, on the
 * word MASTER and the bundled list of its words (lib/tutorial-words.ts). It
 * scores like the server does, has no clock, makes no requests and keeps
 * nothing. The 20th valid word clears the round and ends it, like a real one.
 */
import type { Answer, GameState } from './api'
import { praise, type Feedback, type GameController } from './game'
import { TUTORIAL_WORDS } from './tutorial-words'

export const TUTORIAL_ROOT = 'master'
export const TUTORIAL_GOAL = 20

const VALID = new Set(TUTORIAL_WORDS)

export const isTutorialWord = (word: string) => VALID.has(word.toLowerCase())

/** Words for the coach to suggest: ones that read like words (they have a vowel). */
const readable = (word: string) => /[aeiou]/.test(word)

/** A random item, or undefined when there is none. */
const pick = <T>(items: T[]): T | undefined => items[Math.floor(Math.random() * items.length)]

export type TutorialGame = GameController & {
  /** Valid words found so far, in order. */
  readonly found: string[]
  /** Words tried that were not valid. */
  readonly missed: string[]
  /** A random valid word nobody has played yet, optionally of these lengths, or null if none is left. */
  suggest(lengths?: number[]): string | null
  /** A made-up word (not in the list) made from the letters, for showing what a miss costs. */
  nonsense(): string
}

export function createTutorialGame(): TutorialGame {
  const g = $state({
    state: {
      status: true,
      name: 'You',
      word: TUTORIAL_ROOT,
      words: { [TUTORIAL_ROOT]: [] as Answer[] },
      time: 120,
      time_limit: 120,
      round: 1,
      rounds_limit: TUTORIAL_GOAL,
      score: 0,
      created_at: '',
      updated_at: '',
      session_id: 'tutorial',
      host_id: null,
    } as GameState,
  })

  const answers = () => g.state.words[TUTORIAL_ROOT]
  const found = () => answers().filter(([, valid]) => valid).map(([word]) => word)
  const missed = () => answers().filter(([, valid]) => !valid).map(([word]) => word)

  function record(word: string, valid: boolean, score: number, over = false) {
    g.state = {
      ...g.state,
      status: !over,
      score,
      words: { [TUTORIAL_ROOT]: [...answers(), [word, valid] as Answer] },
    }
  }

  return {
    get state() {
      return g.state
    },
    // No clock: the tutorial never runs out.
    get timeLeft() {
      return g.state.time_limit
    },
    busy: false,
    lastRound: null,
    get found() {
      return found()
    },
    get missed() {
      return missed()
    },

    async submit(raw): Promise<Feedback> {
      const word = raw.toLowerCase()
      if (answers().some(([played]) => played === word)) {
        record(word, false, Math.max(0, g.state.score - 2))
        return { tone: 'bad', text: `“${word}” was already played · −2` }
      }
      if (!VALID.has(word)) {
        record(word, false, Math.max(0, g.state.score - 2))
        return { tone: 'bad', text: `“${word}” isn't in the word list · −2` }
      }
      const points = Math.ceil((10 * word.length) / TUTORIAL_ROOT.length) + (word.length === TUTORIAL_ROOT.length ? 10 : 0)
      if (found().length + 1 >= TUTORIAL_GOAL) {
        record(word, true, g.state.score + points + 50, true)
        return { tone: 'great', text: 'Round cleared! +50 bonus' }
      }
      record(word, true, g.state.score + points)
      return { tone: 'good', text: praise(word.length, TUTORIAL_ROOT.length) }
    },

    async skip() {},
    async quit() {
      g.state = { ...g.state, status: false, word: null }
    },
    pause() {},
    async resume() {
      return null
    },
    destroy() {},

    suggest(lengths) {
      const played = new Set(answers().map(([word]) => word))
      const pool = TUTORIAL_WORDS.filter(
        (word) => !played.has(word) && readable(word) && (!lengths || lengths.includes(word.length)),
      )
      // Fall back to any unplayed word if nothing readable is left.
      return pick(pool) ?? pick(TUTORIAL_WORDS.filter((word) => !played.has(word) && (!lengths || lengths.includes(word.length)))) ?? null
    },

    nonsense() {
      const letters = TUTORIAL_ROOT.split('')
      for (let tries = 0; tries < 50; tries++) {
        const size = 3 + Math.floor(Math.random() * 2)
        const word = [...letters].sort(() => Math.random() - 0.5).slice(0, size).join('')
        if (!VALID.has(word)) return word
      }
      return 'mmm'
    },
  }
}
