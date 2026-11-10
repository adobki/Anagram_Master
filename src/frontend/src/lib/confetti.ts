import confetti from 'canvas-confetti'
import { prefersReducedMotion } from 'svelte/motion'
import { settings } from './settings.svelte'

const COLORS = ['#f73f52', '#ff8a96', '#fbbf24', '#4ade80', '#60a5fa', '#c084fc', '#ffffff']

const allowed = () => settings.celebrations && !prefersReducedMotion.current

/** Confetti from both bottom corners, then a burst in the middle: the round-cleared celebration. */
export function celebrate() {
  if (!allowed()) return
  const base = { colors: COLORS, ticks: 280, zIndex: 100, disableForReducedMotion: true }
  confetti({ ...base, particleCount: 90, angle: 60, spread: 65, startVelocity: 62, origin: { x: 0, y: 0.9 } })
  confetti({ ...base, particleCount: 90, angle: 120, spread: 65, startVelocity: 62, origin: { x: 1, y: 0.9 } })
  setTimeout(() => {
    confetti({ ...base, particleCount: 150, spread: 360, startVelocity: 38, scalar: 1.1, origin: { x: 0.5, y: 0.4 } })
  }, 280)
}

/**
 * A small burst for when Celebrations is switched on in Settings. It goes off
 * on the left, where the app stays visible beside the fly-out.
 */
export function sparkle() {
  if (prefersReducedMotion.current) return
  confetti({
    colors: COLORS,
    particleCount: 40,
    spread: 70,
    startVelocity: 30,
    ticks: 160,
    zIndex: 100,
    disableForReducedMotion: true,
    origin: { x: 0.25, y: 0.6 },
  })
}
