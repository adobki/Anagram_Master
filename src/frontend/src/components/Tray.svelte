<script lang="ts">
  import { flip } from 'svelte/animate'
  import { scale } from 'svelte/transition'
  import type { Tile as TileData } from '../lib/letters'
  import { ms } from '../lib/motion'
  import { rem } from '../lib/rem.svelte'
  import Tile from './Tile.svelte'

  interface Props {
    /** The word being built, as tiles in order. */
    tiles: TileData[]
    /** Increase to shake the tray (a rejected or blocked word). */
    shake?: number
    /** A dragged tile is over the tray: highlight it as a drop target. */
    target?: boolean
    /** Tap on a tile: take it back out. */
    onremove: (id: number) => void
    /** Pointer down on a tile: it may become a drag. */
    ondrag: (event: PointerEvent, tile: TileData) => void
    /** The tray element, for drop hit-testing. */
    element?: HTMLElement
  }

  let {
    tiles,
    shake = 0,
    target = false,
    onremove,
    ondrag,
    element = $bindable(),
  }: Props = $props()

  // Tiles shrink to keep a word on one line, down to MIN, then wrap.
  const GAP = 0.375
  const MIN = 1.75
  const MAX = 3

  let width = $state(0)
  const size = $derived.by(() => {
    const count = Math.max(tiles.length, 1)
    const fit = width ? (width - GAP * rem.px * (count - 1)) / count : MAX * rem.px
    return Math.floor(Math.max(MIN * rem.px, Math.min(MAX * rem.px, fit)))
  })

  let row = $state<HTMLElement>()
  $effect(() => {
    if (!shake || !row) return
    row.animate(
      [
        { transform: 'translateX(0)' },
        { transform: 'translateX(-9px)' },
        { transform: 'translateX(8px)' },
        { transform: 'translateX(-6px)' },
        { transform: 'translateX(4px)' },
        { transform: 'translateX(0)' },
      ],
      { duration: ms(380), easing: 'cubic-bezier(.36,.07,.19,.97)' },
    )
  })
</script>

<div
  class="tray"
  class:empty={!tiles.length}
  class:target
  role="group"
  aria-label="Your word"
  bind:this={element}
  bind:clientWidth={width}
>
  <div class="row" bind:this={row} style:--size="{size}px" style:gap="{GAP}rem">
    {#each tiles as tile (tile.id)}
      <div animate:flip={{ duration: ms(200) }} in:scale={{ duration: ms(160), start: 0.5 }}>
        <Tile
          letter={tile.letter}
          data-tray-tile=""
          aria-label="Remove {tile.letter.toUpperCase()}"
          onclick={() => onremove(tile.id)}
          onpointerdown={(event) => ondrag(event, tile)}
        />
      </div>
    {/each}
    {#if !tiles.length}<span class="placeholder">Tap, drag or type letters</span>{/if}
  </div>
</div>

<style>
  .tray {
    display: grid;
    place-items: center;
    min-height: 4.25rem;
    padding: var(--space-2) 0;
    border-bottom: 2px solid var(--accent);
    border-radius: var(--radius-md) var(--radius-md) 0 0;
    transition:
      border-color var(--dur),
      background-color var(--dur);
  }

  .empty {
    border-bottom-color: var(--line);
  }

  .target {
    border-bottom-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 8%, transparent);
  }

  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    padding-bottom: 0.1875rem;
  }

  .placeholder {
    font-weight: 500;
    color: var(--text-3);
  }

</style>
