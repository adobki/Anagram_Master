import type { GameState } from './api'
import { games } from './history.svelte'

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
 * The round has every word it can take: `rounds_limit` is also the most valid words a round accepts, and the last
 * of them earns the bonus. Such a round is over, although the game stays on it until the player moves on.
 */
export function roundIsFull(state: GameState): boolean {
  if (!state.word) return false
  let valid = 0
  for (const [, scored] of state.words[state.word] ?? []) if (scored) valid++
  return valid >= state.rounds_limit
}

/**
 * Seconds left in the round as the player sees them. A round is over for them once its time runs out, they skip
 * it, or its last word is found. From then on every screen shows 0, although the server's own clock runs on until
 * they move to the next round (so `timeLeft` itself is never changed for this).
 */
export function roundClock(game: Pick<GameController, 'state' | 'timeLeft'>): number {
  return games.endedEarly(game.state) || roundIsFull(game.state) ? 0 : game.timeLeft
}

/**
 * Everything the game screen needs from "the game". lib/api-game.svelte.ts
 * implements it on the API.
 */
export interface GameController {
  /** The latest game state from the server. */
  readonly state: GameState
  /** Seconds left in the round by the server's clock, counted down locally between its replies. See `roundClock`. */
  readonly timeLeft: number
  /** True while a request is in flight. */
  readonly busy: boolean
  /** The round that just ended, set at the moment `state` moves to the next one. */
  readonly lastRound: RoundSummary | null
  /** Points gained so far in the current round, or null when its starting score isn't known (a game resumed mid-round). */
  readonly roundPoints: number | null
  submit(word: string): Promise<Feedback>
  /**
   * Moves on to the next round (for the round that is current now, so a repeat does nothing). Nothing else ever
   * does: a round that ends (time up, skipped, or all its words found) waits for the game screen to call this.
   */
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

/** The parts of the game screen the guided tutorial can switch on and off. */
export type GuidePart = 'found' | 'tabs' | 'tray' | 'rack' | 'actions' | 'shuffle' | 'keep' | 'settings'

/** What the guided tutorial asks of the game screen. Without one, everything works. */
export interface Guide {
  /** The parts that work; the rest are greyed out. Null: all of them. */
  enabled: ReadonlySet<GuidePart> | null
  /** The parts that flash, pointing the player at them. */
  focus: ReadonlySet<GuidePart>
  /** A word in the Found list was tapped (it is in the tray now). */
  onuse?: () => void
  /** Shuffle or Restore was pressed. */
  onshuffle?: () => void
}
