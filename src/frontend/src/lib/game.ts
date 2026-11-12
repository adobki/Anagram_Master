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

/** How a finished round went, shown when the next one starts. */
export interface RoundSummary {
  round: number
  /** Valid words found in it. */
  words: number
  /** Points gained in it, or null when its starting score isn't known (a game resumed mid-round). */
  points: number | null
}

export function recapText({ round, words, points }: RoundSummary): string {
  const found = `${words} ${words === 1 ? 'word' : 'words'}`
  const score = points === null ? '' : points === 0 ? ' · 0 points' : ` · ${points > 0 ? '+' : '−'}${Math.abs(points)}`
  return `Round ${round} · ${found}${score}`
}

/**
 * Everything the game screen needs from "the game". lib/api-game.svelte.ts
 * implements it on the API.
 */
export interface GameController {
  /** The latest game state from the server. */
  readonly state: GameState
  /** Seconds left in the round, counted down locally between server replies. */
  readonly timeLeft: number
  /** True while a request is in flight. */
  readonly busy: boolean
  /** The round that just ended, set at the moment `state` moves to the next one. */
  readonly lastRound: RoundSummary | null
  submit(word: string): Promise<Feedback>
  /** Moves on to the next round (for the round that is current now, so a repeat does nothing). */
  skip(): Promise<void>
  quit(): Promise<void>
  /**
   * The game screen is closing. The round clock keeps running (it lives on
   * the server, so players can't stop it to think). A round that runs out
   * waits for the player; the game never moves on by itself.
   */
  pause(): void
  /**
   * The game screen is showing again: refreshes the state from the server. A round that ran out meanwhile
   * stays waiting for the player to go on.
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
