/**
 * GameController on the real API. The server owns the rules, the score and
 * the clock; this keeps the latest state, counts the clock down locally
 * between replies (resynced from each reply's `time`), and turns the API's
 * replies into short messages for the game screen.
 *
 * Game over arrives three ways, all handled here: a reply with
 * `status: false`, a 200 reply with only `{error}` (from /play), or a 401
 * (from /status after the last round times out).
 */

import { api, ApiError, isGameState, type ErrorReply, type GameState } from './api'
import { games } from './history.svelte'
import { praise, type Feedback, type GameController, type RoundSummary } from './game'
import { tilesOf } from './letters'
import { toasts } from './toast.svelte'

const OFFLINE = "Couldn't reach the server. Check your connection and try again."

/**
 * The player's saved game, or null when there is none (no cookie, no game, or
 * its last round just timed out). Throws when the server can't be reached or
 * fails, so "no game" is never confused with "don't know yet".
 */
export async function findSavedGame(): Promise<GameState | null> {
  try {
    const state = await api.status()
    if (state.status) return state
    await api.quit().catch(() => {}) // a finished game: just clear its cookie
  } catch (error) {
    // 403: no cookie. 401: no game, or its last round just timed out.
    if (!(error instanceof ApiError && (error.status === 401 || error.status === 403))) throw error
  }
  return null
}

/** `token` is the game's /resume token, when known (a game started on this device); it is filed in History. */
export function createApiGame(initial: GameState, token?: string | null): GameController {
  const g = $state({ state: initial, timeLeft: initial.time, busy: false, lastRound: null as RoundSummary | null })
  games.record(initial, token)
  // The score when the current round began; unknown for a game resumed after round 1.
  let roundStart: number | null = initial.round === 1 ? 0 : null
  // Paused until the game screen shows (see GameController.pause).
  let paused = true
  let advancing = false

  const clock = setInterval(() => {
    if (!g.state.status) return
    if (g.timeLeft > 0) g.timeLeft -= 1
    // Only the last round ends by itself (there is no next one). Any other round that runs out waits for the player.
    else if (!paused && !advancing && !g.busy && g.state.round >= g.state.rounds_limit) void timeUp()
  }, 1000)

  function end() {
    clearInterval(clock)
    g.state = { ...g.state, status: false, word: null, time: 0 }
    g.timeLeft = 0
    games.record(g.state)
  }

  function apply(reply: GameState | ErrorReply) {
    if (!isGameState(reply)) return end() // "Time up! Game is over"
    const before = g.state
    if (reply.status && before.word && reply.round !== before.round) {
      const answers = reply.words[before.word] ?? []
      g.lastRound = {
        round: before.round,
        words: answers.filter(([, valid]) => valid).length,
        points: roundStart === null ? null : reply.score - roundStart,
      }
      roundStart = reply.score
    }
    g.state = reply
    g.timeLeft = reply.time
    games.record(reply)
    if (!reply.status) clearInterval(clock)
  }

  async function call<T>(work: () => Promise<T>): Promise<T> {
    g.busy = true
    try {
      return await work()
    } finally {
      g.busy = false
    }
  }

  /** A 401/403 means the game is gone server-side; anything else is a network or server problem. */
  function failed(error: unknown): Feedback {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      end()
      return { tone: 'info', text: 'This game is over.' }
    }
    return { tone: 'bad', text: OFFLINE }
  }

  /** The last round's time is up: reading the status ends the game (a 401). */
  async function timeUp() {
    advancing = true
    try {
      apply(await call(api.status))
    } catch (error) {
      failed(error)
    } finally {
      advancing = false
    }
  }

  return {
    get state() {
      return g.state
    },
    get timeLeft() {
      return g.timeLeft
    },
    get busy() {
      return g.busy
    },
    get lastRound() {
      return g.lastRound
    },
    get roundPoints() {
      return roundStart === null ? null : g.state.score - roundStart
    },

    async submit(word) {
      const before = g.state
      let reply: GameState | ErrorReply
      try {
        reply = await call(() => api.submit(word))
      } catch (error) {
        return failed(error)
      }
      apply(reply)
      if (!isGameState(reply) || !reply.status) {
        // The reply ended the game: with the last round's final word, that is the game complete.
        const root = before.word ?? ''
        const complete = isGameState(reply) && (reply.words[root] ?? []).some(([played, valid]) => valid && played === word.toLowerCase())
        return complete
          ? { tone: 'great', text: `That's all ${before.rounds_limit} words! Game complete.` }
          : { tone: 'info', text: "Time's up! Game over." }
      }

      const error = reply.error ?? ''
      if (error.includes("Time's up")) return { tone: 'info', text: "Time's up for this round" }
      if (error.includes('Invalid word')) return { tone: 'bad', text: `“${word}” isn't in the word list · −2` }
      if (error.includes('Duplicate')) return { tone: 'bad', text: `“${word}” was already played · −2` }
      if (error.includes("can't use")) return { tone: 'info', text: "That's this round's word. Make new ones from it!" }

      const root = before.word ?? ''
      const accepted = (reply.words[root] ?? []).some(([played, valid]) => valid && played === word.toLowerCase())
      if (reply.round !== before.round || error.includes('last word')) {
        // The round ended with this reply: either this word was the 20th
        // (bonus), or time had run out and the server discarded it.
        if (accepted) return { tone: 'great', text: 'Round cleared! +50 bonus' }
        return { tone: 'info', text: `Time ran out. On to round ${reply.round}.` }
      }
      if (accepted) return { tone: 'good', text: praise(word.length, tilesOf(root).length) }
      return { tone: 'info', text: error.replace(/<br\s*\/?>/gi, ' ') || 'Try another word' }
    },

    async skip() {
      const round = g.state.round
      try {
        const reply = await call(() => api.skip(round))
        apply(reply)
        // A repeated or late request does nothing, and says so.
        if (isGameState(reply) && reply.error && reply.round === round) toasts.show(reply.error)
      } catch (error) {
        toasts.show(failed(error).text)
      }
    },

    async quit() {
      try {
        apply(await call(api.quit))
      } catch (error) {
        if (error instanceof ApiError) end() // the game is gone either way
        else toasts.show(OFFLINE)
      }
      clearInterval(clock)
    },

    pause() {
      paused = true
    },

    async resume() {
      paused = false
      try {
        apply(await call(api.status))
      } catch (error) {
        failed(error) // 401 here: the last round ran out while away, so the game ended
        return null
      }
      // The last round that ran out while away ends the game. Any other waits for the player to go on.
      if (g.state.status && g.timeLeft <= 0 && g.state.round >= g.state.rounds_limit) await timeUp()
      return null
    },

    destroy() {
      clearInterval(clock)
    },
  }
}
