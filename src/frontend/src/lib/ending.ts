/**
 * Games to be ended on the server, quietly. "Clear my data" forgets every game on this device, so the ones still
 * in progress would stay open on the server with nobody able to return to them. Their tokens are queued here and
 * each game is ended with one request (a score of 10 or more still goes on the leaderboard, as for End game).
 *
 * The queue is kept in localStorage (`am-ending`) so it outlives the clear, the reload after it, and being
 * offline: it is sent when the app starts and whenever the connection comes back. That is why its key is NOT in
 * the list in `data.ts`. It holds tokens only, nothing about the player.
 *
 * Nothing here is ever shown: no messages, and every failure is swallowed.
 */
import { api, ApiError } from './api'

const KEY = 'am-ending'
/** After this long a game is past caring about (and its token's cookie lifetime is long gone). */
const KEEP_MS = 30 * 24 * 60 * 60 * 1000

interface Pending {
  token: string
  /** When it was queued (ms since 1970). */
  at: number
}

function load(): Pending[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    if (!Array.isArray(list)) return []
    const oldest = Date.now() - KEEP_MS
    return list.filter((p) => p && typeof p.token === 'string' && p.token && typeof p.at === 'number' && p.at > oldest)
  } catch {
    return []
  }
}

function save(list: Pending[]) {
  try {
    if (list.length) localStorage.setItem(KEY, JSON.stringify(list))
    else localStorage.removeItem(KEY)
  } catch {
    // Storage is blocked: the games just stay open until the server forgets them.
  }
}

/** Queue these games (by token) to be ended, and start on them if there is a connection. */
export function endGamesLater(tokens: string[]) {
  if (!tokens.length) return
  const list = load()
  const known = new Set(list.map((p) => p.token))
  for (const token of tokens) if (!known.has(token)) list.push({ token, at: Date.now() })
  save(list)
  void flushEnding()
}

let flushing = false

/**
 * End the queued games, one request at a time. A game the server ended, or says is already over or unknown, leaves
 * the queue. If the server can't be reached or fails, the rest waits for the next try.
 */
export async function flushEnding(): Promise<void> {
  if (flushing) return
  flushing = true
  try {
    for (const { token } of load()) {
      try {
        await api.endGame(token)
      } catch (error) {
        // 4xx: over already, or not a game the server knows. Anything else: try again another time.
        if (!(error instanceof ApiError && error.status >= 400 && error.status < 500 && error.status !== 429)) return
      }
      // Read again before writing: more may have been queued while the request was out.
      save(load().filter((p) => p.token !== token))
    }
  } finally {
    flushing = false
  }
}
