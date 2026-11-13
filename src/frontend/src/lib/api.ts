/**
 * Typed client for the Anagram Master API (Flask, /api/v1).
 *
 * The API is the source of truth: it checks words, keeps the score and runs
 * the round clock. This module only sends requests and describes the replies.
 *
 * Auth is the HttpOnly `session` cookie that Flask sets on /init and renews on
 * every game reply. The browser sends it automatically because the app and the
 * API share one origin (through Vite's proxy during development).
 */

import { clientInfo } from './client-info'

const BASE = '/api/v1'

/** One submitted answer: the word, and whether it scored. */
export type Answer = [word: string, valid: boolean]

/** Game state, as returned by /init, /status, /play and /close. */
export interface GameState {
  /** True while the game is running; false once it has ended. */
  status: boolean
  name: string
  /** The current root word, or null once the game has ended. Can contain ' or -. */
  word: string | null
  /** Every root word played so far, in order (the current one last), with its answers. */
  words: Record<string, Answer[]>
  /** Seconds left in this round, by the server's clock. */
  time: number
  /** Seconds per round. */
  time_limit: number
  /** The current round, starting at 1. */
  round: number
  rounds_limit: number
  score: number
  /** Server local time, formatted dd/mm/yyyy HH:MM:SS. */
  created_at: string
  updated_at: string
  session_id: string
  host_id: string | null
  /** Present (true) once, in the first reply after the round changes. */
  new_round?: true
  /** A gameplay message such as "ERROR: Invalid word! Try another". Can contain <br>. */
  error?: string
}

/** Error-only reply. /play also sends this, with HTTP 200, when the last round times out. */
export interface ErrorReply {
  error: string
}

export interface Health {
  Database: boolean
  FileStorage: boolean
}

/** [score, name, date]. The date is an HTTP-date string, e.g. "Tue, 02 Jul 2024 19:02:09 GMT". */
export type ScoreEntry = [score: number, name: string, date: string]

/** A non-2xx reply. From /status, 401 or 403 means there is no saved game. */
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/** True when a reply carries game state, false when it is only an error. */
export function isGameState(reply: GameState | ErrorReply): reply is GameState {
  return 'status' in reply
}

async function send<T>(path: string, method = 'GET', body?: object | FormData): Promise<{ data: T; res: Response }> {
  const form = body instanceof FormData
  const res = await fetch(BASE + path, {
    method,
    // A form sets its own Content-Type (with the multipart boundary), so it must not be given one here.
    headers: { ...(body && !form ? { 'Content-Type': 'application/json' } : {}), 'X-Client': clientInfo() },
    body: body ? (form ? body : JSON.stringify(body)) : undefined,
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, data?.error ?? res.statusText)
  return { data: data as T, res }
}

const request = <T>(path: string, method = 'GET', body?: object | FormData) => send<T>(path, method, body).then((r) => r.data)

export const api = {
  /** Send feedback: a multipart form (message, optional rating, category, name, WhatsApp, email, images). */
  feedback: (form: FormData) => request<{ ok: boolean }>('/feedback', 'POST', form),

  /** Is the API up, and are its database and word list available? */
  health: () => request<Health>('/health'),

  /** Start a new game. The name needs 3+ characters; the server keeps the first 15. */
  start: (name: string) => request<GameState>('/init', 'POST', { name }),

  /**
   * Start a new game and also return its token. The cookie that keeps the game is HttpOnly, so the page can't
   * read it; /init sends the same value once, in an X-Session header, for the page to keep. /resume takes it back.
   */
  begin: async (name: string): Promise<{ state: GameState; token: string | null }> => {
    const { data, res } = await send<GameState>('/init', 'POST', { name })
    return { state: data, token: res.headers.get('X-Session') }
  },

  /** Make a saved game the current one again (sets the cookie) from its token. 401 means it is over or gone. */
  resume: (token: string) => request<GameState>('/resume', 'POST', { token }),

  /**
   * The saved game, if there is one. A game that has already ended comes back
   * with `status: false`. Throws ApiError 403 (no cookie) or 401 (no game, or
   * the last round has just timed out).
   */
  status: () => request<GameState>('/status'),

  /** Submit a word for the current round. */
  submit: (word: string) => request<GameState | ErrorReply>('/play', 'POST', { word }),

  /**
   * Skip to the next round. It says which round it is for, so a repeated or late request (the round already
   * moved on) does nothing instead of skipping a second one. The server ignores this on the last round.
   */
  skip: (round: number) => request<GameState | ErrorReply>('/play', 'POST', { new_word: true, round }),

  /** End the game and clear the cookie. Scores of 10+ go on the leaderboard. */
  quit: () => request<GameState>('/close', 'POST'),

  /** The top 20 scores, best first. */
  scores: () => request<{ scores: ScoreEntry[] }>('/scores').then((r) => r.scores),
}
