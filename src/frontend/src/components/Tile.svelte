<script lang="ts">
  interface Props {
    letter: string
    /** The tile is already part of the answer being built. */
    used?: boolean
    onclick: () => void
  }

  let { letter, used = false, onclick }: Props = $props()
</script>

<button type="button" class="tile" class:used aria-pressed={used} aria-label={letter.toUpperCase()} {onclick}>
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
      0 3px 0 var(--tile-edge),
      var(--shadow-sm);
    cursor: pointer;
    user-select: none;
    touch-action: manipulation;
    transition:
      transform var(--dur-fast) var(--ease-out),
      box-shadow var(--dur-fast) var(--ease-out),
      background-color var(--dur),
      color var(--dur);
  }

  .tile:active {
    transform: translateY(2px);
    box-shadow:
      0 1px 0 var(--tile-edge),
      var(--shadow-sm);
  }

  .used {
    background: var(--surface-2);
    color: var(--text-3);
    box-shadow: inset 0 0 0 1.5px var(--line);
    transform: scale(0.9);
  }

  .used:active {
    transform: scale(0.86);
    box-shadow: inset 0 0 0 1.5px var(--line);
  }
</style>
