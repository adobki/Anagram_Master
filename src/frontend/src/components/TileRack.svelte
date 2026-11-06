<script lang="ts">
  import { flip } from 'svelte/animate'
  import type { Tile as TileData } from '../lib/letters'
  import { ms } from '../lib/motion'
  import Tile from './Tile.svelte'

  interface Props {
    tiles: TileData[]
    /** Ids of the tiles already in the answer. */
    picked: number[]
    onpick: (id: number) => void
  }

  let { tiles, picked, onpick }: Props = $props()

  // Tiles are as large as fits, between MIN and MAX px, in balanced rows
  // (13 letters on a phone become rows of 7 and 6, not 9 and 4).
  const GAP = 8
  const MIN = 44
  const MAX = 60
  const MAX_COLUMNS = 9

  let width = $state(0)

  const layout = $derived.by(() => {
    const count = Math.max(tiles.length, 1)
    if (!width) return { columns: Math.min(count, 7), size: 48 }
    const fit = Math.max(1, Math.min(MAX_COLUMNS, Math.floor((width + GAP) / (MIN + GAP))))
    const rows = Math.ceil(count / fit)
    const columns = Math.ceil(count / rows)
    const size = Math.min(MAX, Math.floor((width - GAP * (columns - 1)) / columns))
    return { columns, size }
  })
</script>

<div class="rack" role="group" aria-label="Letters" bind:clientWidth={width}>
  <div
    class="tiles"
    style:--size="{layout.size}px"
    style:max-width="{layout.columns * layout.size + (layout.columns - 1) * GAP}px"
  >
    {#each tiles as tile (tile.id)}
      <div animate:flip={{ duration: ms(320) }}>
        <Tile letter={tile.letter} used={picked.includes(tile.id)} onclick={() => onpick(tile.id)} />
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
    gap: 8px;
    margin-inline: auto;
    padding-bottom: 3px; /* room for the tiles' bottom edge */
  }

</style>
