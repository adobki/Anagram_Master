import type { GameState } from './api'

/** Scores below this are not saved. Mirrors DBScores.min_score on the server. */
export const MIN_LEADERBOARD_SCORE = 10

/**
 * Shortest word the game accepts. The server takes any length; two letters is
 * the game's rule, and short words are a deliberate part of it (twenty words
 * in two minutes is hard for humans otherwise). The UI enforces it.
 */
export const MIN_WORD_LENGTH = 2

/** good: a valid word. great: it cleared the round. bad: rejected. info: neutral. */
export type Tone = 'good' | 'great' | 'bad' | 'info'

/** A short message about the player's last action. */
export interface Feedback {
  tone: Tone
  text: string
}

/**
 * Everything the game screen needs from "the game". During the design preview
 * a local mock implements it (lib/mock.svelte.ts); mission 5 implements it on
 * the API, and the screens stay as they are.
 */
export interface GameController {
  /** The latest game state from the server. */
  readonly state: GameState
  /** Seconds left in the round, counted down locally between server replies. */
  readonly timeLeft: number
  /** True while a request is in flight. */
  readonly busy: boolean
  submit(word: string): Promise<Feedback>
  skip(): Promise<void>
  quit(): Promise<void>
  /**
   * The game screen is closing. The round clock keeps running (it lives on
   * the server, so players can't stop it to think), but the game won't move
   * on to the next round when it runs out until resume() is called.
   */
  pause(): void
  /**
   * The game screen is showing again. If the round ran out of time meanwhile,
   * the game moves on, and the returned message says so.
   */
  resume(): Promise<Feedback | null>
  /** Stops timers. Call it when the controller is no longer needed. */
  destroy(): void
}

/** Praise for a valid word, scaled by how much of the root word it uses. */
export function praise(length: number, rootLength: number): string {
  const share = length / rootLength
  if (share >= 1) return 'Perfect!'
  if (share >= 0.75) return 'Amazing!'
  if (share >= 0.5) return 'Great!'
  if (length >= 4) return 'Nice!'
  return 'Good'
}
