/**
 * The practice game: a GameController that runs entirely on the device, on the
 * word MASTER and the bundled list of its words (lib/tutorial-words.ts). It
 * scores like the server does, has no clock, makes no requests and keeps
 * nothing. The 20th valid word clears the round, like a real one: the round is
 * over, the game screen shows its round-end panel, and going on from there
 * (`skip`) ends the practice, because it has only the one round.
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

/** A step's refusal of a word: shown as the wrong-word message. It costs the usual 2 points unless `penalty` is false. */
export interface Rejection {
  text: string
  penalty?: boolean
}

/** What a step may restore: the score and every word played so far. */
export interface Snapshot {
  score: number
  answers: Answer[]
}

export type TutorialGame = GameController & {
  /** Valid words found so far, in order. */
  readonly found: string[]
  /** Words tried that were not valid. */
  readonly missed: string[]
  /**
   * The current step's check on a submitted word. When it returns a rejection the word counts as a wrong one (and
   * isn't recorded as played, so it can still be used later). Null means anything goes.
   */
  gate: ((word: string) => Rejection | null) | null
  /** The last word that reached Submit (accepted or not), lower case; empty at the start. */
  readonly lastWord: string
  /** The round was cleared and the player went on from its round-end panel: the practice is complete. */
  readonly complete: boolean
  /** Record a word and score it as a submit would, without feedback or sound (used when the coach skips a step). */
  inject(word: string, valid: boolean): void
  snapshot(): Snapshot
  restore(snap: Snapshot): void
  /** Back to the empty start. */
  reset(): void
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

  let lastWord = $state('')
  let complete = $state(false)
  const answers = () => g.state.words[TUTORIAL_ROOT]
  const found = () => answers().filter(([, valid]) => valid).map(([word]) => word)
  const missed = () => answers().filter(([, valid]) => !valid).map(([word]) => word)

  function record(word: string, valid: boolean, score: number) {
    g.state = {
      ...g.state,
      score,
      words: { [TUTORIAL_ROOT]: [...answers(), [word, valid] as Answer] },
    }
  }

  const pointsFor = (word: string) =>
    Math.ceil((10 * word.length) / TUTORIAL_ROOT.length) + (word.length === TUTORIAL_ROOT.length ? 10 : 0)

  const controller: TutorialGame = {
    gate: null,
    get lastWord() {
      return lastWord
    },
    get complete() {
      return complete
    },
    get state() {
      return g.state
    },
    // No clock: the tutorial never runs out.
    get timeLeft() {
      return g.state.time_limit
    },
    busy: false,
    lastRound: null,
    // One round, started at 0: everything scored so far is this round's.
    get roundPoints() {
      return g.state.score
    },
    get found() {
      return found()
    },
    get missed() {
      return missed()
    },

    async submit(raw): Promise<Feedback> {
      const word = raw.toLowerCase()
      lastWord = word
      // A full round takes no more words, as on the server.
      if (found().length >= TUTORIAL_GOAL) return { tone: 'info', text: 'This round already has all its words' }
      const refusal = controller.gate?.(word)
      if (refusal) {
        if (refusal.penalty !== false) g.state = { ...g.state, score: Math.max(0, g.state.score - 2) }
        return { tone: 'bad', text: refusal.penalty === false ? refusal.text : `${refusal.text} · −2` }
      }
      if (answers().some(([played]) => played === word)) {
        record(word, false, Math.max(0, g.state.score - 2))
        return { tone: 'bad', text: `“${word}” was already played · −2` }
      }
      if (!VALID.has(word)) {
        record(word, false, Math.max(0, g.state.score - 2))
        return { tone: 'bad', text: `“${word}” isn't in the word list · −2` }
      }
      const points = pointsFor(word)
      if (found().length + 1 >= TUTORIAL_GOAL) {
        record(word, true, g.state.score + points + 50)
        return { tone: 'great', text: 'Round cleared! +50 bonus' }
      }
      record(word, true, g.state.score + points)
      return { tone: 'good', text: praise(word.length, TUTORIAL_ROOT.length) }
    },

    // "Next round" on the cleared round. Before that there is nothing to skip to.
    async skip() {
      if (found().length < TUTORIAL_GOAL) return
      complete = true
      g.state = { ...g.state, status: false }
    },
    async quit() {
      g.state = { ...g.state, status: false, word: null }
    },
    pause() {},
    async resume() {
      return null
    },
    destroy() {},

    inject(word, valid) {
      record(word, valid, valid ? g.state.score + pointsFor(word) : Math.max(0, g.state.score - 2))
    },
    snapshot() {
      return { score: g.state.score, answers: answers().map(([w, v]) => [w, v] as Answer) }
    },
    restore(snap) {
      g.state = {
        ...g.state,
        status: true,
        score: snap.score,
        words: { [TUTORIAL_ROOT]: snap.answers.map(([w, v]) => [w, v] as Answer) },
      }
      lastWord = ''
      complete = false
    },
    reset() {
      controller.restore({ score: 0, answers: [] })
    },

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
      const played = new Set(answers().map(([word]) => word))
      for (let tries = 0; tries < 50; tries++) {
        const size = 3 + Math.floor(Math.random() * 2)
        const word = [...letters].sort(() => Math.random() - 0.5).slice(0, size).join('')
        if (!VALID.has(word) && !played.has(word)) return word
      }
      return 'mmm'
    },
  }
  return controller
}
