<script lang="ts">
  import { flip } from 'svelte/animate'
  import type { Tile as TileData } from '../lib/letters'
  import { ms } from '../lib/motion'
  import { rem } from '../lib/rem.svelte'
  import Tile from './Tile.svelte'

  interface Props {
    tiles: TileData[]
    /** Ids drawn as empty slots: in the tray, or being dragged. */
    used: number[]
    /** Tap: add the tile to the tray, or take it back out. */
    onpick: (id: number) => void
    /** Pointer down on a free tile: it may become a drag. */
    ondrag: (event: PointerEvent, tile: TileData) => void
  }

  let { tiles, used, onpick, ondrag }: Props = $props()

  // Tiles are as large as fits, in balanced rows (13 letters on a phone
  // become rows of 7 and 6, not 9 and 4). The rack may take up to HEIGHT of
  // the screen's height, so short phones get smaller tiles rather than
  // pushing Submit off screen, but never below FLOOR. Sizes are in rem so the
  // rack grows with the rest of the UI on big screens.
  const GAP = 0.5
  const MIN = 2.75 // preferred smallest, for choosing the columns
  const MAX = 3.75
  const FLOOR = 2.25
  const HEIGHT = 0.26
  const MAX_COLUMNS = 9

  let width = $state(0)
  let viewportHeight = $state(800)

  const layout = $derived.by(() => {
    const gap = GAP * rem.px
    const count = Math.max(tiles.length, 1)
    if (!width) return { columns: Math.min(count, 7), size: 3 * rem.px, gap }
    const fit = Math.max(1, Math.min(MAX_COLUMNS, Math.floor((width + gap) / (MIN * rem.px + gap))))
    const rows = Math.ceil(count / fit)
    const columns = Math.ceil(count / rows)
    const byWidth = (width - gap * (columns - 1)) / columns
    const byHeight = (viewportHeight * HEIGHT - gap * (rows - 1)) / rows
    const size = Math.floor(Math.max(FLOOR * rem.px, Math.min(MAX * rem.px, byWidth, byHeight)))
    return { columns, size, gap }
  })
</script>

<svelte:window bind:innerHeight={viewportHeight} />

<div class="rack" role="group" aria-label="Letters" bind:clientWidth={width}>
  <div
    class="tiles"
    style:--size="{layout.size}px"
    style:gap="{layout.gap}px"
    style:max-width="{layout.columns * layout.size + (layout.columns - 1) * layout.gap}px"
  >
    {#each tiles as tile (tile.id)}
      <div animate:flip={{ duration: ms(320) }}>
        <Tile
          letter={tile.letter}
          used={used.includes(tile.id)}
          aria-pressed={used.includes(tile.id)}
          onclick={() => onpick(tile.id)}
          onpointerdown={(event) => {
            if (!used.includes(tile.id)) ondrag(event, tile)
          }}
        />
      </div>
    {/each}
  </div>
</div>

<style>
  .rack {
    width: 100%;
  }

  .tiles {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    margin-inline: auto;
    padding-bottom: 0.1875rem; /* room for the tiles' bottom edge */
  }
</style>
