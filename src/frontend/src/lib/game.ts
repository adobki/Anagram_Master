import type { GameState } from './api'

/** Scores below this are not saved. Mirrors DBScores.min_score on the server. */
export const MIN_LEADERBOARD_SCORE = 10

export type Tone = 'good' | 'bad' | 'info'

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
