/**
 * The leaderboard, with the last list that loaded kept on this device. The
 * screen shows the kept list at once, then refreshes it, and still shows it
 * (with a note) if the refresh fails or the device is offline.
 */
import { api, type ScoreEntry } from './api'

const KEY = 'am-scores'

interface Kept {
  scores: ScoreEntry[]
  savedAt: number
}

function load(): Kept | null {
  try {
    const kept = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    return kept && Array.isArray(kept.scores) && typeof kept.savedAt === 'number' ? kept : null
  } catch {
    return null
  }
}

function save(kept: Kept) {
  try {
    localStorage.setItem(KEY, JSON.stringify(kept))
  } catch {
    // Storage is blocked or full: the list just isn't kept.
  }
}

class Scores {
  #kept = load()
  /** The newest list we have: null until one has ever loaded on this device. */
  list = $state<ScoreEntry[] | null>(this.#kept?.scores ?? null)
  /** When that list was fetched (ms since 1970). */
  savedAt = $state<number | null>(this.#kept?.savedAt ?? null)
  status = $state<'idle' | 'refreshing' | 'failed'>('idle')

  async refresh() {
    if (this.status === 'refreshing') return
    this.status = 'refreshing'
    try {
      const scores = await api.scores()
      this.list = scores
      this.savedAt = Date.now()
      save({ scores, savedAt: this.savedAt })
      this.status = 'idle'
    } catch {
      this.status = 'failed'
    }
  }
}

export const scores = new Scores()
