/**
 * Everything the app keeps on this device. When a module starts saving
 * something new in localStorage, add its key here, so "Clear my data" removes it.
 * (The games themselves live on the server. Clearing ends the ones in progress there, through `lib/ending.ts`,
 * whose own list `am-ending` is left out of KEYS on purpose: it has to outlive the clear.)
 */
import { endGamesLater } from './ending'
import { games } from './history.svelte'

const KEYS = ['am-name', 'am-best', 'am-settings', 'am-theme', 'am-scores', 'am-games', 'am-guide', 'am-install', 'am-feedback', 'am-tickets', 'am-installed']

/**
 * Forgets everything kept on this device, then reloads so every screen starts fresh. The games in progress would
 * be left open on the server with no way back to them, so they are ended quietly (now, or once there is a
 * connection). A game with no token (started before tokens were kept) can't be ended this way.
 */
export function clearMyData() {
  endGamesLater(games.list.filter((game) => !game.over && game.token).map((game) => game.token!))
  for (const key of KEYS) {
    try {
      localStorage.removeItem(key)
    } catch {
      // Storage is blocked: there is nothing saved to clear.
    }
  }
  location.reload()
}
