import confetti from 'canvas-confetti'
import { prefersReducedMotion } from 'svelte/motion'

const COLORS = ['#f73f52', '#ff8a96', '#fbbf24', '#4ade80', '#60a5fa', '#c084fc', '#ffffff']

/** Confetti from both bottom corners, then a burst in the middle: the round-cleared celebration. */
export function celebrate() {
  if (prefersReducedMotion.current) return
  const base = { colors: COLORS, ticks: 280, zIndex: 100, disableForReducedMotion: true }
  confetti({ ...base, particleCount: 90, angle: 60, spread: 65, startVelocity: 62, origin: { x: 0, y: 0.9 } })
  confetti({ ...base, particleCount: 90, angle: 120, spread: 65, startVelocity: 62, origin: { x: 1, y: 0.9 } })
  setTimeout(() => {
    confetti({ ...base, particleCount: 150, spread: 360, startVelocity: 38, scalar: 1.1, origin: { x: 0.5, y: 0.4 } })
  }, 280)
}
