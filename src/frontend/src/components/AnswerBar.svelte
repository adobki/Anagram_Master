<script lang="ts">
  import { scale } from 'svelte/transition'
  import type { Tile } from '../lib/letters'
  import { ms } from '../lib/motion'

  interface Props {
    letters: Tile[]
    /** Increase to shake the bar (a rejected word or an unavailable letter). */
    shake?: number
  }

  let { letters, shake = 0 }: Props = $props()

  let word = $state<HTMLElement>()
  const text = $derived(letters.map((tile) => tile.letter).join(''))

  $effect(() => {
    if (!shake || !word) return
    word.animate(
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

<div class="answer" class:empty={!letters.length}>
  <span class="visually-hidden">{text ? `Your word: ${text}` : 'Your word is empty'}</span>
  <div class="word" bind:this={word} style:--n={Math.max(letters.length, 7)} aria-hidden="true">
    {#each letters as tile (tile.id)}
      <span class="char" in:scale={{ duration: ms(150), start: 0.4 }}>{tile.letter}</span>
    {/each}
    {#if !letters.length}<span class="placeholder">Tap or type letters</span>{/if}
    <span class="caret"></span>
  </div>
</div>

<style>
  .answer {
    container-type: inline-size;
    display: grid;
    place-items: center;
    min-height: 4rem;
    border-bottom: 2px solid var(--accent);
    transition: border-color var(--dur);
  }

  .empty {
    border-bottom-color: var(--line);
  }

  .word {
    display: flex;
    align-items: center;
    justify-content: center;
    /* Shrink long words so up to 17 letters fit on one line. */
    font-size: min(2.25rem, calc(88cqi / (var(--n) * 0.8)));
    font-weight: 800;
    line-height: 1;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .char {
    display: inline-block;
  }

  .placeholder {
    font-size: var(--text-base);
    font-weight: 500;
    letter-spacing: 0;
    text-transform: none;
    color: var(--text-3);
  }

  .caret {
    width: 2px;
    height: 1em;
    margin-left: 0.1em;
    border-radius: 1px;
    background: var(--accent);
    animation: blink 1.1s steps(1) infinite;
  }

  .empty .caret {
    order: -1;
    height: 1.25rem;
    margin: 0 var(--space-2) 0 0;
  }

  @keyframes blink {
    50% {
      opacity: 0;
    }
  }
</style>
