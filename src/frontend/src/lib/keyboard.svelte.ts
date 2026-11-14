/**
 * Keeps the field being typed in above the on-screen keyboard, when the page is full screen.
 *
 * In a browser tab Android Chrome handles this itself: the keyboard shrinks the visible area and the browser scrolls
 * the field into it. In full screen (the Fullscreen API, or the installed app launched full screen by its manifest)
 * Android doesn't resize anything for the keyboard, so the keyboard simply covers the lower part of the page and the
 * browser doesn't scroll to the field. So, only while full screen is on:
 *   1. the keyboard's height is found, from the VirtualKeyboard API where there is one (Chrome on Android), else
 *      from the visual viewport shrinking;
 *   2. it is put in the `--kb` CSS variable, which App.svelte uses as bottom padding, so the scrolling area ends
 *      where the keyboard begins;
 *   3. the focused field is scrolled into the middle of what is left.
 * If neither signal reports a keyboard shortly after a field gets focus (the browser says nothing in full screen),
 * a keyboard of about 42% of the screen is assumed, which is enough room to lift any field clear of it.
 * Outside full screen nothing here does anything, so the browser's own behaviour is left alone.
 */
import { touchFirst } from './device'
import { fullscreen } from './fullscreen.svelte'

type VirtualKeyboard = EventTarget & { overlaysContent: boolean; boundingRect: DOMRectReadOnly }

const root = document.documentElement
const virtualKeyboard = (navigator as Navigator & { virtualKeyboard?: VirtualKeyboard }).virtualKeyboard
/** If no keyboard has been reported this long after a field got focus, one is assumed. */
const ASSUME_AFTER_MS = 400
const ASSUMED_SHARE = 0.42

/** The kinds of field that bring up a keyboard. */
const TEXT_FIELD =
  'textarea, [contenteditable=""], [contenteditable="true"], input:not([type]), ' +
  'input:is([type=text],[type=email],[type=tel],[type=search],[type=url],[type=password],[type=number])'
const focusedField = () => {
  const element = document.activeElement
  return element instanceof HTMLElement && element.matches(TEXT_FIELD) ? element : null
}

let height = 0
let assumed = false

function reveal() {
  const field = focusedField()
  if (!field) return
  // After the padding has been applied and the layout has settled.
  requestAnimationFrame(() => requestAnimationFrame(() => field.scrollIntoView({ block: 'center', behavior: 'smooth' })))
}

function set(px: number, guess = false) {
  px = Math.max(0, Math.round(px))
  assumed = guess && px > 0
  if (px === height) return
  height = px
  if (px) root.style.setProperty('--kb', `${px}px`)
  else root.style.removeProperty('--kb')
  if (px) reveal()
}

function start() {
  const stops: (() => void)[] = []
  const listen = (target: EventTarget, type: string, handler: EventListener, options?: AddEventListenerOptions) => {
    target.addEventListener(type, handler, options)
    stops.push(() => target.removeEventListener(type, handler, options))
  }

  // 1. The keyboard's height. Overlaying lets us place the content ourselves, and the browser then reports the keyboard.
  if (virtualKeyboard) {
    virtualKeyboard.overlaysContent = true
    stops.push(() => (virtualKeyboard.overlaysContent = false))
    listen(virtualKeyboard, 'geometrychange', () => set(virtualKeyboard.boundingRect.height))
  }
  // Without that API, the keyboard shows as the visual viewport getting shorter than the window.
  const visual = window.visualViewport
  if (visual && !virtualKeyboard) {
    listen(visual, 'resize', () => {
      const covered = innerHeight - visual.height - visual.offsetTop
      if (covered > 80) set(covered)
      else if (!assumed) set(0) // an assumed height stays until the field loses focus
    })
  }

  // 2. A field got focus and nothing said a keyboard is up: assume one, if this is a touch device.
  let timer: ReturnType<typeof setTimeout> | undefined
  listen(
    document,
    'focusin',
    () => {
      clearTimeout(timer)
      if (!focusedField()) return
      if (height) return reveal()
      timer = setTimeout(() => {
        if (touchFirst && focusedField() && !height) set(innerHeight * ASSUMED_SHARE, true)
      }, ASSUME_AFTER_MS)
    },
    { capture: true },
  )
  listen(
    document,
    'focusout',
    () => {
      clearTimeout(timer)
      // Moving between fields keeps the keyboard; leaving them all lets it go (a reported height says so itself).
      setTimeout(() => {
        if (!focusedField() && assumed) set(0)
      }, 150)
    },
    { capture: true },
  )

  return () => {
    clearTimeout(timer)
    for (const stop of stops) stop()
    set(0)
  }
}

$effect.root(() => {
  $effect(() => {
    if (fullscreen.supported && fullscreen.active) return start()
  })
})
