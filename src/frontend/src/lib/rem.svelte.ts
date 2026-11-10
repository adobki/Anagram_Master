/**
 * The root font size in px. It grows on large screens (see styles/base.css),
 * so layout maths done in px (like tile sizes) should scale by it.
 */
class RootFontSize {
  px = $state(16)

  constructor() {
    this.refresh()
    addEventListener('resize', () => this.refresh())
  }

  /** Measure again, after something other than the window size changed it (the text size setting). */
  refresh() {
    this.px = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
  }
}

export const rem = new RootFontSize()
