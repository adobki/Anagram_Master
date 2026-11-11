import confetti from 'canvas-confetti'
import { reducedMotion } from './motion'
import { settings } from './settings.svelte'

const COLORS = ['#f73f52', '#ff8a96', '#fbbf24', '#4ade80', '#60a5fa', '#c084fc', '#ffffff']

const allowed = () => settings.celebrations && !reducedMotion()

/**
 * The confetti is drawn on its own full-window canvas inside a popover, which
 * the browser puts in its "top layer". An open dialog (Settings, a menu) is in
 * the top layer too, and anything in the page, whatever its z-index, is behind
 * it; a popover shown later sits above it. So the confetti is never hidden.
 */
let layer: HTMLElement | null = null
let fire: ReturnType<typeof confetti.create> | null = null
let running = 0

function ensureLayer() {
  if (layer && fire) return { layer, fire }
  layer = document.createElement('div')
  layer.setAttribute('popover', 'manual')
  layer.setAttribute('aria-hidden', 'true')
  Object.assign(layer.style, {
    position: 'fixed',
    inset: '0',
    width: '100%',
    height: '100%',
    margin: '0',
    padding: '0',
    border: '0',
    background: 'transparent',
    overflow: 'hidden',
    pointerEvents: 'none',
  })
  const canvas = document.createElement('canvas')
  Object.assign(canvas.style, { width: '100%', height: '100%', display: 'block', pointerEvents: 'none' })
  layer.append(canvas)
  document.body.append(layer)
  fire = confetti.create(canvas, { resize: true, useWorker: false, disableForReducedMotion: false })
  return { layer, fire }
}

/** Shows the layer above everything (again, so it is the newest thing in the top layer), runs `shots`, hides it when done. */
async function show(shots: (fire: ReturnType<typeof confetti.create>) => (Promise<unknown> | null)[]) {
  const { layer, fire } = ensureLayer()
  running++
  try {
    if (layer.matches(':popover-open')) layer.hidePopover()
    layer.showPopover()
  } catch {
    // Browsers without popovers: the page's own layer is all there is.
  }
  try {
    await Promise.all(shots(fire))
  } finally {
    if (--running === 0) {
      try {
        layer.hidePopover()
      } catch {
        // Already hidden.
      }
    }
  }
}

/**
 * Confetti from both bottom corners, then a burst in the middle: the round-cleared
 * celebration. `scale` shortens how long the pieces linger (1 is the full length).
 */
function burst(scale: number) {
  const base = { colors: COLORS, ticks: Math.round(280 * scale), disableForReducedMotion: false }
  return show((fire) => [
    fire({ ...base, particleCount: 90, angle: 60, spread: 65, startVelocity: 62, origin: { x: 0, y: 0.9 } }),
    fire({ ...base, particleCount: 90, angle: 120, spread: 65, startVelocity: 62, origin: { x: 1, y: 0.9 } }),
    new Promise((resolve) =>
      setTimeout(() => {
        resolve(fire({ ...base, particleCount: 150, spread: 360, startVelocity: 38, scalar: 1.1, origin: { x: 0.5, y: 0.4 } }))
      }, 280),
    ),
  ])
}

export function celebrate() {
  if (!allowed()) return
  void burst(1)
}

/** What Settings plays when Celebrations is switched on: the real thing, over the top of Settings, gone sooner. */
export function sparkle() {
  if (reducedMotion()) return
  void burst(0.55)
}
