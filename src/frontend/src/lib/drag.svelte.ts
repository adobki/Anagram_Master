/**
 * Drag and drop for letter tiles, built on pointer events so it works the
 * same with touch and mouse (the HTML drag-and-drop API doesn't fire on touch
 * screens). Tiles can be dragged from the rack into the tray at any position,
 * moved within the tray, or dragged out of the tray to remove them.
 *
 * A press that moves less than THRESHOLD px stays a tap (a normal click).
 */

export type Origin = 'rack' | 'tray'

export interface TileDrag {
  id: number
  letter: string
  from: Origin
  /** Top-left of the floating tile, in viewport px. */
  x: number
  y: number
  size: number
  /** Where the tile would land in the tray, or -1 when it isn't over the tray. */
  index: number
  /** The insertion marker, in viewport px. */
  caret: { x: number; y: number; height: number } | null
}

interface Options {
  /** The tray element. Its tiles must carry a data-tray-tile attribute. */
  tray: () => HTMLElement | undefined
  /** Called when a drag ends over the page (not when it is cancelled). */
  drop: (drag: TileDrag) => void
}

const THRESHOLD = 6 // px of movement before a press becomes a drag
const REACH = 28 // px around the tray that still count as over it

export function createTileDrag({ tray, drop }: Options) {
  let current = $state<TileDrag | null>(null)
  let endedAt = 0

  function locate(x: number, y: number): Pick<TileDrag, 'index' | 'caret'> {
    const element = tray()
    if (!element) return { index: -1, caret: null }
    const box = element.getBoundingClientRect()
    if (x < box.left - REACH || x > box.right + REACH || y < box.top - REACH || y > box.bottom + REACH) {
      return { index: -1, caret: null }
    }
    const rects = [...element.querySelectorAll('[data-tray-tile]')].map((tile) => tile.getBoundingClientRect())
    if (!rects.length) {
      return { index: 0, caret: { x: box.left + box.width / 2, y: box.top + box.height * 0.2, height: box.height * 0.6 } }
    }
    // Insert next to the nearest tile, on whichever side the pointer is.
    let nearest = 0
    let best = Infinity
    rects.forEach((r, i) => {
      const distance = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2))
      if (distance < best) {
        best = distance
        nearest = i
      }
    })
    const r = rects[nearest]
    const after = x > r.left + r.width / 2
    return {
      index: nearest + (after ? 1 : 0),
      caret: { x: after ? r.right + 3 : r.left - 3, y: r.top, height: r.height },
    }
  }

  /** Call from a tile's pointerdown handler. */
  function start(event: PointerEvent, id: number, letter: string, from: Origin) {
    if (!event.isPrimary || event.button !== 0) return
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    const { pointerId, clientX: startX, clientY: startY } = event
    const offsetX = startX - rect.left
    const offsetY = startY - rect.top
    let dragging = false

    function move(e: PointerEvent) {
      if (e.pointerId !== pointerId) return
      if (!dragging) {
        if (Math.hypot(e.clientX - startX, e.clientY - startY) < THRESHOLD) return
        dragging = true
      }
      e.preventDefault()
      current = {
        id, letter, from, size: rect.width,
        x: e.clientX - offsetX,
        y: e.clientY - offsetY,
        ...locate(e.clientX, e.clientY),
      }
    }

    function finish(e: PointerEvent) {
      if (e.pointerId !== pointerId) return
      removeEventListener('pointermove', move)
      removeEventListener('pointerup', finish)
      removeEventListener('pointercancel', finish)
      if (!dragging || !current) return
      const done = current
      current = null
      endedAt = performance.now()
      if (e.type === 'pointerup') drop(done)
    }

    addEventListener('pointermove', move, { passive: false })
    addEventListener('pointerup', finish)
    addEventListener('pointercancel', finish)
  }

  return {
    /** The drag in progress, if any. */
    get current() {
      return current
    },
    start,
    /** True just after a drag ends, so the click that may follow it can be ignored. */
    get justEnded() {
      return performance.now() - endedAt < 250
    },
  }
}
