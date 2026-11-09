/**
 * Short vibrations for feedback on phones that support them (Chrome on Android;
 * iOS Safari has no Vibration API, so these do nothing there). Skipped for
 * people who've asked for reduced motion.
 */

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')

function buzz(pattern: number | number[]) {
  if (reduced.matches || typeof navigator.vibrate !== 'function') return
  navigator.vibrate(pattern)
}

/** A rejected word. */
export const buzzBad = () => buzz(45)

/** A cleared round: a longer, rising pattern. */
export const buzzCleared = () => buzz([70, 50, 70, 50, 160])
