/*
 * DESIGN PREVIEW ONLY. This stands in for the server so the screens can be
 * tried without Flask. Mission 5 deletes this file and implements
 * GameController on the real API.
 *
 * It follows the server's rules, with two shortcuts:
 * - any answer of 3+ letters that contains a vowel counts as a dictionary word;
 * - the round's word spelled backwards (blessed → desselb) fills the round
 *   with valid words, to test the 20-word bonus.
 */

import type { Answer, GameState } from './api'
import { praise, type Feedback, type GameController } from './game'
import { tilesOf } from './letters'

const ROOTS = [
  'brother-german', 'academics', "shepherd's-purse", 'paintbrushes', 'lighthouse',
  'snowflakes', 'chocolates', 'mysterious', 'adventure', 'butterflies',
  'watermelon', 'playground', 'dangerously', 'tournament', 'kingfisher',
  'marshmallow', 'thunderstorm', 'generation', 'spectacular', 'triangle',
]
const TIME = 120
const GOAL = 20 // valid words that clear a round (the server reuses rounds_limit)

// Real words used to fill sample games; each round gets the ones its root can make.
const SAMPLE_WORDS = `mother garment theorem anthem hornet throne german manger ember beret armor
  error bather berth other earth heart there their three tone note rose more home
  medic camel smile cadet ideas acid same dice scam shepherd purse herds shred spurs
  usher ruse sushi brushes banish shrine paints burnt brush paint haste shirt house
  light sight tight hotel those south shout sole lost flake snake lakes towel slow
  flow fowl owls chose coach latch cloth costs mystery sour rouse rumor stem vent
  dense under avenue nature tread river butter flies stub rule tile fist bust water
  melon lemon motel tremor metal player ground grand dragon day pray deny round
  angry danger loudest sanger aground ruse turn tour tame mount ration turnament
  king fish fresh shine finer sign marsh small shallow mall harm show storm thunder
  north under stunt honest snort gene rate tenor nation grate ratio spectacle cart
  scare trace pace tale grant train alert integral`
  .split(/\s+/)
  .filter(Boolean)

const letters = (root: string) => tilesOf(root).map((tile) => tile.letter)
const looksLikeAWord = (word: string) => word.length >= 3 && /[aeiouy]/.test(word)
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
const pad = (n: number) => String(n).padStart(2, '0')
const stamp = (d = new Date()) =>
  `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`

function canMake(word: string, from: string[]) {
  const pool = [...from]
  for (const char of word) {
    const i = pool.indexOf(char)
    if (i < 0) return false
    pool.splice(i, 1)
  }
  return true
}

function points(word: string, root: string) {
  const n = letters(root).length
  return Math.ceil((10 * word.length) / n) + (word.length === n ? 10 : 0)
}

function sampleAnswers(root: string, count: number): Answer[] {
  const pool = letters(root)
  return SAMPLE_WORDS.filter((w) => canMake(w, pool))
    .slice(0, count)
    .map((w): Answer => [w, true])
}

function buildState(name: string, round: number, perRound: number[]): GameState {
  const words: Record<string, Answer[]> = {}
  let score = 0
  ROOTS.slice(0, round).forEach((root, i) => {
    words[root] = sampleAnswers(root, perRound[i] ?? 0)
    for (const [w] of words[root]) score += points(w, root)
  })
  const now = stamp()
  return {
    status: true, name, word: ROOTS[round - 1], words, time: TIME, time_limit: TIME,
    round, rounds_limit: ROOTS.length, score, created_at: now, updated_at: now,
    session_id: Math.random().toString(36).slice(2), host_id: null,
  }
}

/** Fills a round up to GOAL valid answers (the backwards-root test shortcut). Returns the points earned. */
function fillRound(root: string, answers: Answer[]) {
  const pool = letters(root)
  const pieces: string[] = [] // runs of the root's letters: always makeable
  for (let length = 2; length <= 7; length++)
    for (let i = 0; i + length <= pool.length; i++) pieces.push(pool.slice(i, i + length).join(''))
  const seen = new Set(answers.map(([w]) => w))
  let found = answers.filter(([, ok]) => ok).length
  let earned = 0
  for (const word of [...SAMPLE_WORDS.filter((w) => canMake(w, pool)), ...pieces]) {
    if (found >= GOAL) break
    if (seen.has(word)) continue
    seen.add(word)
    answers.push([word, true])
    earned += points(word, root)
    found++
  }
  return earned
}

export function createMockGame(name: string, round = 1, perRound: number[] = []): GameController {
  const g = $state({ state: buildState(name, round, perRound), timeLeft: TIME, busy: false })
  // Paused until the game screen shows. The clock runs regardless, like the
  // server's; a paused game just doesn't move on when time runs out.
  let paused = true

  const clock = setInterval(() => {
    if (!g.state.status) return
    if (g.timeLeft > 0) g.timeLeft -= 1
    else if (!paused) advance(true)
  }, 1000)

  function advance(forced: boolean) {
    const s = g.state
    if (s.round >= s.rounds_limit) {
      if (forced) end() // the last round timed out; a skip there is ignored
      return
    }
    const next = ROOTS[s.round]
    s.words[next] = []
    s.word = next
    s.round += 1
    g.timeLeft = TIME
  }

  function end() {
    clearInterval(clock)
    Object.assign(g.state, { status: false, word: null, time: 0 })
  }

  async function request<T>(work: () => T): Promise<T> {
    g.busy = true
    await sleep(160) // pretend network latency
    g.busy = false
    return work()
  }

  return {
    get state() { return g.state },
    get timeLeft() { return g.timeLeft },
    get busy() { return g.busy },

    submit: (raw) =>
      request((): Feedback => {
        const s = g.state
        const root = s.word ?? ''
        const word = raw.toLowerCase()
        const answers = s.words[root]
        if (word === letters(root).join('')) return { tone: 'info', text: "That's this round's word. Make new ones from it!" }
        if (word === letters(root).reverse().join('')) {
          s.score += fillRound(root, answers) + 50
          advance(false)
          return { tone: 'great', text: 'Round cleared! +50 bonus' }
        }
        if (answers.some(([w]) => w === word)) {
          s.score = Math.max(0, s.score - 2)
          return { tone: 'bad', text: 'Already played · −2' }
        }
        const valid = looksLikeAWord(word)
        answers.push([word, valid])
        if (!valid) {
          s.score = Math.max(0, s.score - 2)
          return { tone: 'bad', text: 'Not in the word list · −2' }
        }
        s.score += points(word, root)
        if (answers.filter(([, ok]) => ok).length === GOAL) {
          s.score += 50
          advance(false)
          return { tone: 'great', text: 'Round cleared! +50 bonus' }
        }
        return { tone: 'good', text: praise(word.length, letters(root).length) }
      }),

    skip: () => request(() => advance(false)),
    quit: () => request(end),

    pause: () => {
      paused = true
    },

    resume: () =>
      request((): Feedback | null => {
        paused = false
        const s = g.state
        if (!s.status || g.timeLeft > 0) return null
        const wasLast = s.round >= s.rounds_limit
        advance(true) // on the last round this ends the game
        return wasLast ? null : { tone: 'info', text: `Time ran out while you were away. On to round ${s.round}.` }
      }),

    destroy: () => clearInterval(clock),
  }
}

/** A game in progress, for the "Continue" card on the home screen. */
export const sampleSavedGame = () => createMockGame('Ada', 4, [6, 4, 7, 3])

/** A finished 20-round game, for previewing the game-over screen. */
export function sampleFinishedGame(): GameState {
  const state = buildState('Ada', ROOTS.length, ROOTS.map((_, i) => 2 + ((i * 7) % 6)))
  return { ...state, status: false, word: null, time: 0 }
}
