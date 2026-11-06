<script lang="ts">
  import type { HTMLButtonAttributes } from 'svelte/elements'

  interface Props extends HTMLButtonAttributes {
    letter: string
    /** Drawn as an empty slot: the tile is in the tray, or being dragged. */
    used?: boolean
    /** Drawn picked up, for the copy that follows the pointer during a drag. */
    lifted?: boolean
  }

  let { letter, used = false, lifted = false, ...rest }: Props = $props()
</script>

<button type="button" class="tile" class:used class:lifted aria-label={letter.toUpperCase()} {...rest}>
  {letter}
</button>

<style>
  .tile {
    display: grid;
    place-items: center;
    width: var(--size, 3rem);
    height: var(--size, 3rem);
    padding: 0;
    border: 0;
    border-radius: calc(var(--size, 3rem) * 0.26);
    background: linear-gradient(var(--tile-sheen), transparent) var(--tile);
    color: var(--tile-text);
    font-size: calc(var(--size, 3rem) * 0.46);
    font-weight: 700;
    line-height: 1;
    text-transform: uppercase;
    box-shadow:
      0 0.1875rem 0 var(--tile-edge),
      var(--shadow-sm);
    cursor: grab;
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
    touch-action: none; /* the page must not scroll while a tile is dragged */
    transition:
      transform var(--dur-fast) var(--ease-out),
      box-shadow var(--dur-fast) var(--ease-out),
      background-color var(--dur),
      color var(--dur);
  }

  .tile:active {
    transform: translateY(0.125rem);
    box-shadow:
      0 0.0625rem 0 var(--tile-edge),
      var(--shadow-sm);
  }

  .used {
    background: var(--surface-2);
    color: var(--text-3);
    box-shadow: inset 0 0 0 1.5px var(--line);
    transform: scale(0.9);
    cursor: pointer;
  }

  .used:active {
    transform: scale(0.86);
    box-shadow: inset 0 0 0 1.5px var(--line);
  }

  .lifted,
  .lifted:active {
    transform: scale(1.12) rotate(-4deg);
    box-shadow:
      0 0.1875rem 0 var(--tile-edge),
      var(--shadow-lg);
    cursor: grabbing;
  }
</style>
