/**
 * Short vibrations for feedback on phones that can (Chrome on Android; iOS
 * Safari has no Vibration API, so these do nothing there). The player can turn
 * them off in Settings; the switch starts off for people whose device asks for
 * reduced motion.
 */
import { canVibrate } from './device'
import { settings } from './settings.svelte'

function buzz(pattern: number | number[]) {
  if (!canVibrate || !settings.haptics) return
  navigator.vibrate(pattern)
}

/** A rejected word. */
export const buzzBad = () => buzz(45)

/** A cleared round: a longer, rising pattern. */
export const buzzCleared = () => buzz([70, 50, 70, 50, 160])

/** Ten seconds left in the round, if the player wants the warning. */
export const buzzWarn = () => settings.lowTimeBuzz && buzz([40, 60, 40])

/** The feel of the Vibration switch being turned on. */
export const buzzTest = () => buzz(30)
