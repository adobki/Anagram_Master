/** The last player name used, remembered on this device to prefill the home screen. */

const KEY = 'am-name'
const MAX_LENGTH = 15

export function loadName(): string {
  try {
    return (localStorage.getItem(KEY) ?? '').slice(0, MAX_LENGTH)
  } catch {
    return ''
  }
}

export function saveName(name: string) {
  try {
    localStorage.setItem(KEY, name)
  } catch {
    // Storage is blocked (e.g. private mode): the name just isn't remembered.
  }
}
