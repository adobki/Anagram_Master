/** A letter tile. `id` is its position in the root word, so it survives shuffles. */
export interface Tile {
  id: number
  letter: string
}

/**
 * The playable letters of a root word, lowercased, one tile each.
 *
 * Anything that isn't a letter is dropped. The word list has entries such as
 * "brother-german" and "shepherd's-purse", and their `-` and `'` never become
 * tiles or reach an answer. The server checks answers against the full root,
 * and any answer made from these tiles uses a subset of its characters, so
 * nothing is lost. Once the word list is cleaned, this filter does nothing.
 */
export function tilesOf(word: string): Tile[] {
  return [...word.toLowerCase()].filter((char) => /\p{L}/u.test(char)).map((letter, id) => ({ id, letter }))
}

/** A shuffled copy (Fisher–Yates) that differs from the input whenever it can. */
export function shuffled<T>(items: readonly T[]): T[] {
  const out = [...items]
  if (out.length < 2) return out
  do {
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[out[i], out[j]] = [out[j], out[i]]
    }
  } while (out.every((item, i) => item === items[i]))
  return out
}
