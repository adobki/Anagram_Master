/** The player's best score on this device. */

const KEY = 'am-best'

export function loadBest(): number {
  try {
    const value = Number(localStorage.getItem(KEY))
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0
  } catch {
    return 0
  }
}

/**
 * Records a finished game's score. `beaten` is the earlier best when this
 * score tops it (so it's worth celebrating), and null otherwise, including
 * the very first game, which has nothing to beat.
 */
export function recordScore(score: number): { best: number; beaten: number | null } {
  const before = loadBest()
  if (score <= before) return { best: before, beaten: null }
  try {
    localStorage.setItem(KEY, String(score))
  } catch {
    // Storage is blocked: the best just isn't remembered.
  }
  return { best: score, beaten: before > 0 ? before : null }
}
