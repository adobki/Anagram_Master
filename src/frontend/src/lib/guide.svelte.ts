/**
 * The quick guide shown before a player's first game (the interface map, with
 * a way into the tutorial and How to play). Whether it has been seen is one
 * flag, `am-guide`; a missing value means "not seen", which also covers
 * everyone who had the app before the guide existed. Settings can switch on
 * showing it before every game.
 */
import { settings } from './settings.svelte'

const KEY = 'am-guide'

function load(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

class Guide {
  seen = $state(load())

  /** Show it before this game: it hasn't been seen yet, or the player asked for it every time. */
  get due() {
    return !this.seen || settings.alwaysGuide
  }

  /** Whichever way the player gets past it (tutorial, help, or just starting) counts as seen. */
  markSeen() {
    this.seen = true
    try {
      localStorage.setItem(KEY, '1')
    } catch {
      // Storage is blocked: it will show again next visit.
    }
  }
}

export const guide = new Guide()
