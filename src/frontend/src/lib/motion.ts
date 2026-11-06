import { prefersReducedMotion } from 'svelte/motion'

/** An animation duration, or 0 when the player has asked for reduced motion. */
export const ms = (duration: number) => (prefersReducedMotion.current ? 0 : duration)
