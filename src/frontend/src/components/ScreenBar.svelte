<script lang="ts">
  import { onMount, type Snippet } from 'svelte'

  /**
   * The bar across the top of a screen: back button, title, gear.
   *
   * Scrolling down, it goes away with the page, as it always did. Scrolling
   * back up, it comes straight back, wherever the player is on the page, so
   * the controls are never a long scroll away from the top.
   *
   * It is a sticky element whose `top` is either 0 (shown) or minus its own
   * height (away). Away, it sits just above the window and moves with the page
   * until then, which is exactly how a plain bar behaves; the browser does that
   * part, so there is no jitter to fix. Only a change of direction in the
   * scrolling flips it, and then it slides.
   */
  let { children }: { children: Snippet } = $props()

  /** Scrolling up this far brings the bar back, and scrolling down this far sends it away (in px). */
  const SHOW_AFTER = 8
  const HIDE_AFTER = 24

  let bar = $state<HTMLElement>()
  let height = $state(0)
  /** Parked above the top edge. It's in its natural place at the top of the page either way. */
  let away = $state(true)
  /** Not at the very top of the page, so content passes under the bar and it needs a backdrop. */
  let lifted = $state(false)

  onMount(() => {
    const scroller = bar?.closest<HTMLElement>('.scroller') // App.svelte: the only thing that scrolls
    if (!scroller) return
    let last = scroller.scrollTop
    let anchor = last // where the current direction began
    let direction = 0 // 1 down, -1 up

    function onscroll() {
      const top = scroller!.scrollTop
      lifted = top > 1
      if (top <= 0) {
        // The top of the page: the bar is in its own place whether it's shown or away. Start the next scroll down afresh.
        away = true
        last = anchor = 0
        direction = 0
        return
      }
      const delta = top - last
      last = top
      if (delta === 0) return
      const next = delta > 0 ? 1 : -1
      if (next !== direction) {
        direction = next
        anchor = top
      }
      const travelled = Math.abs(top - anchor)
      if (direction < 0 && travelled >= SHOW_AFTER) away = false
      // Near the top, scrolling down just carries the bar off with the page, as a plain bar would, so no wait.
      else if (direction > 0 && (travelled >= HIDE_AFTER || top < height)) away = true
    }

    scroller.addEventListener('scroll', onscroll, { passive: true })
    return () => scroller.removeEventListener('scroll', onscroll)
  })
</script>

<!-- Tabbing into the bar while it is off screen brings it back, so a keyboard user never lands on something unseen. -->
<header
  class="bar"
  class:lifted
  bind:this={bar}
  bind:offsetHeight={height}
  style:top="{away ? -height : 0}px"
  onfocusin={() => {
    if (bar && bar.getBoundingClientRect().bottom <= 1) away = false
  }}
>
  {@render children()}
</header>

<style>
  .bar {
    position: sticky;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: space-between;
    /* Reach out over the screen's own padding (styles/base.css), so the bar spans the whole width and covers the
       notch area when it sits over the content. Its contents stay exactly where they were. */
    margin: calc(-1 * var(--pad-top, 0px)) calc(-1 * var(--pad-end, 0px)) 0 calc(-1 * var(--pad-start, 0px));
    padding: var(--pad-top, 0px) var(--pad-end, 0px) 0 var(--pad-start, 0px);
    transition:
      top var(--dur) var(--ease-out),
      background-color var(--dur),
      box-shadow var(--dur);
  }

  /* Over the content: see-through enough to keep the page's glow, with the content blurred behind it. */
  .bar.lifted {
    background: color-mix(in srgb, var(--bg) 72%, transparent);
    -webkit-backdrop-filter: blur(12px);
    backdrop-filter: blur(12px);
    box-shadow: 0 1px 0 var(--line);
  }
</style>
