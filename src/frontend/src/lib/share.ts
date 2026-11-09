import { toasts } from './toast.svelte'

/** Shares a score with the phone's share sheet, or copies the message where there isn't one. */
export async function shareScore(score: number, name: string) {
  const url = location.origin + '/'
  const text = `${name} scored ${score} ${score === 1 ? 'point' : 'points'} in Anagram Master. Can you beat that?`
  try {
    if (typeof navigator.share === 'function') {
      await navigator.share({ title: 'Anagram Master', text, url })
    } else {
      await navigator.clipboard.writeText(`${text} ${url}`)
      toasts.show('Copied to the clipboard')
    }
  } catch (error) {
    // Closing the share sheet is not an error.
    if (!(error instanceof DOMException && error.name === 'AbortError')) toasts.show("Couldn't share your score")
  }
}
