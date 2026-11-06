/**
 * The root font size in px. It grows on large screens (see styles/base.css),
 * so layout maths done in px (like tile sizes) should scale by it.
 */
class RootFontSize {
  px = $state(16)

  constructor() {
    const read = () => (this.px = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16)
    read()
    addEventListener('resize', read)
  }
}

export const rem = new RootFontSize()
