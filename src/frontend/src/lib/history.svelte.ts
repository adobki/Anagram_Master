/**
 * The games played on this device, kept so the player can come back to an old
 * one or look at how it went.
 *
 * Each entry holds the last state the server sent for that game, plus the
 * token that makes it the current game again (/resume). The server's cookie is
 * HttpOnly, so this token is the only way to return to a game after starting
 * another. Finished games only need their final state.
 *
 * Kept in localStorage (`am-games`; listed in lib/data.ts). The newest game is
 * first. Finished games beyond the newest few are dropped; unfinished ones
 * never are, because they can still be resumed.
 */
import type { GameState } from './api'

const KEY = 'am-games'
/** How many finished games to keep. */
const KEEP_FINISHED = 30

export interface SavedGame {
  /** The server's session id, unique per game. */
  id: string
  /** Makes this the current game again. Null for a game started before history existed. */
  token: string | null
  /** The last state the server sent. */
  state: GameState
  /** When that state arrived (ms since 1970). */
  savedAt: number
  /** The game has ended (finished, quit, or ran out on the server). */
  over: boolean
}

function load(): SavedGame[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    if (!Array.isArray(list)) return []
    return list.filter((g) => g && typeof g.id === 'string' && g.state && typeof g.savedAt === 'number')
  } catch {
    return []
  }
}

class History {
  list = $state<SavedGame[]>(load())

  get any() {
    return this.list.length > 0
  }

  get(id: string): SavedGame | undefined {
    return this.list.find((g) => g.id === id)
  }

  /** Files a game's latest state. A new game goes first; `token` is kept once known. */
  record(state: GameState, token?: string | null) {
    if (!state.session_id) return
    const snapshot = JSON.parse(JSON.stringify(state)) as GameState
    const over = !snapshot.status
    const existing = this.get(state.session_id)
    if (existing) {
      existing.state = snapshot
      existing.savedAt = Date.now()
      existing.over = existing.over || over
      if (token) existing.token = token
    } else {
      this.list = [{ id: state.session_id, token: token ?? null, state: snapshot, savedAt: Date.now(), over }, ...this.list]
    }
    this.#trim()
    this.#save()
  }

  /** The server says this game is over (resuming it failed): keep what we know, and stop offering Resume. */
  markOver(id: string) {
    const game = this.get(id)
    if (!game || game.over) return
    game.over = true
    game.state = { ...game.state, status: false, word: null, time: 0 }
    this.#save()
  }

  #trim() {
    let finished = 0
    this.list = this.list.filter((g) => !g.over || ++finished <= KEEP_FINISHED)
  }

  #save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.list))
    } catch {
      // Storage is full or blocked: drop the oldest finished game and try once more, else just don't keep it.
      const oldest = [...this.list].reverse().find((g) => g.over)
      if (!oldest) return
      this.list = this.list.filter((g) => g !== oldest)
      try {
        localStorage.setItem(KEY, JSON.stringify(this.list))
      } catch {
        // Nothing more to do.
      }
    }
  }
}

/** The server's "dd/mm/yyyy HH:MM:SS" as a date, or null if it isn't one. */
export function startedAt(created: string): Date | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/.exec(created)
  if (!m) return null
  const date = new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5], +m[6])
  return Number.isNaN(date.getTime()) ? null : date
}

export const games = new History()
