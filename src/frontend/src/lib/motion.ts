import { prefersReducedMotion } from 'svelte/motion'
import { settings } from './settings.svelte'

/** Whether to skip animations: the player's choice in Settings, or else the device's own setting. */
export const reducedMotion = () => settings.motion === 'reduced' || (settings.motion === 'auto' && prefersReducedMotion.current)

/** An animation duration, or 0 when motion is reduced. */
export const ms = (duration: number) => (reducedMotion() ? 0 : duration)
