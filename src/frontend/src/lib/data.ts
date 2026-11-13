/**
 * Everything the app keeps on this device. When a module starts saving
 * something new in localStorage, add its key here, so "Clear my data" removes it.
 * (The saved game is not here: it lives on the server, behind a cookie.)
 */
const KEYS = ['am-name', 'am-best', 'am-settings', 'am-theme', 'am-scores', 'am-games', 'am-guide', 'am-install', 'am-feedback']

/** Forgets the name, best score and settings, then reloads so every screen starts fresh. */
export function clearMyData() {
  for (const key of KEYS) {
    try {
      localStorage.removeItem(key)
    } catch {
      // Storage is blocked: there is nothing saved to clear.
    }
  }
  location.reload()
}
