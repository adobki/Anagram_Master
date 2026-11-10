/**
 * The player's name, remembered on this device. The API only takes a name when
 * a game starts, so this is the name the next game will use. It is saved
 * whenever it is a valid name; while a draft is too short, the last valid name
 * stays saved.
 */

const KEY = 'am-name'
export const MIN_NAME_LENGTH = 3
export const MAX_NAME_LENGTH = 15

function load(): string {
  try {
    return (localStorage.getItem(KEY) ?? '').slice(0, MAX_NAME_LENGTH)
  } catch {
    return ''
  }
}

function save(name: string) {
  try {
    localStorage.setItem(KEY, name)
  } catch {
    // Storage is blocked (e.g. private mode): the name just isn't remembered.
  }
}

class Player {
  #name = $state(load())

  /** What's in the name field right now. It can be too short while someone types. */
  get name() {
    return this.#name
  }
  set name(value: string) {
    this.#name = value.slice(0, MAX_NAME_LENGTH)
    if (this.valid) save(this.trimmed)
  }

  get trimmed() {
    return this.#name.trim()
  }

  get valid() {
    return this.trimmed.length >= MIN_NAME_LENGTH
  }
}

export const player = new Player()
