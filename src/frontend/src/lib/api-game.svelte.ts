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
import { praise, type Feedback, type GameController } from './game'
import { tilesOf } from './letters'
import { toasts } from './toast.svelte'

const OFFLINE = "Couldn't reach the server. Check your connection and try again."

/** The saved game behind the player's cookie, if it's still running. */
export async function findSavedGame(): Promise<GameState | null> {
  try {
    const state = await api.status()
    if (state.status) return state
    await api.quit().catch(() => {}) // a finished game: just clear its cookie
  } catch {
    // 403: no cookie. 401: no game, or its last round just timed out.
  }
  return null
}

export function createApiGame(initial: GameState): GameController {
  const g = $state({ state: initial, timeLeft: initial.time, busy: false })
  // Paused until the game screen shows (see GameController.pause).
  let paused = true
  let advancing = false

  const clock = setInterval(() => {
    if (!g.state.status) return
    if (g.timeLeft > 0) g.timeLeft -= 1
    else if (!paused && !advancing && !g.busy) void timeUp()
  }, 1000)

  function end() {
    clearInterval(clock)
    g.state = { ...g.state, status: false, word: null, time: 0 }
    g.timeLeft = 0
  }

  function apply(reply: GameState | ErrorReply) {
    if (!isGameState(reply)) return end() // "Time up! Game is over"
    g.state = reply
    g.timeLeft = reply.time
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

  /** The round's time is up: move to the next round, or end the game on the last one. */
  async function timeUp() {
    advancing = true
    try {
      if (g.state.round >= g.state.rounds_limit) {
        // Reading the status after the last round times out ends the game (401).
        apply(await call(api.status))
      } else {
        apply(await call(api.skip))
      }
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

    async submit(word) {
      const before = g.state
      let reply: GameState | ErrorReply
      try {
        reply = await call(() => api.submit(word))
      } catch (error) {
        return failed(error)
      }
      apply(reply)
      if (!isGameState(reply) || !reply.status) return { tone: 'info', text: "Time's up! Game over." }

      const error = reply.error ?? ''
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
      try {
        apply(await call(api.skip))
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
      if (!g.state.status || g.timeLeft > 0) return null
      if (g.state.round >= g.state.rounds_limit) {
        await timeUp()
        return null
      }
      await timeUp()
      return { tone: 'info', text: `Time ran out while you were away. On to round ${g.state.round}.` }
    },

    destroy() {
      clearInterval(clock)
    },
  }
}
