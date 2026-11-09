<script lang="ts">
  import { flip } from 'svelte/animate'
  import { scale } from 'svelte/transition'
  import type { Answer } from '../lib/api'
  import { ms } from '../lib/motion'

  interface Props {
    /** This round's answers, valid or not. */
    answers: Answer[]
    /** Valid words that clear the round with a bonus. */
    goal: number
    /** The word just found, highlighted until the next one. */
    latest?: string | null
    /** A word was tapped: the game puts it in the tray. */
    onuse?: (word: string) => void
  }

  let { answers, goal, latest = null, onuse }: Props = $props()

  // Longest first: the impressive finds lead.
  const found = $derived(
    answers
      .filter(([, valid]) => valid)
      .map(([word]) => word)
      .sort((a, b) => b.length - a.length || a.localeCompare(b)),
  )
  // Most recent miss first.
  const missed = $derived(
    answers
      .filter(([, valid]) => !valid)
      .map(([word]) => word)
      .reverse(),
  )

  // Found words or misses; the choice carries over between rounds. A round
  // with no misses always shows the found words.
  let chosen = $state<'found' | 'missed'>('found')
  const view = $derived(missed.length ? chosen : 'found')
  const shown = $derived(view === 'found' ? found : missed)
</script>

<section class="words" aria-labelledby="words-title">
  <header>
    <h2 id="words-title">Words</h2>
    <div class="tabs" role="group" aria-label="Which words to show">
      <button type="button" class:on={view === 'found'} aria-pressed={view === 'found'} onclick={() => (chosen = 'found')}>
        Found <strong>{found.length}</strong>/{goal}
      </button>
      <button
        type="button"
        class:on={view === 'missed'}
        aria-pressed={view === 'missed'}
        disabled={!missed.length}
        onclick={() => (chosen = 'missed')}
      >
        Missed <strong>{missed.length}</strong>
      </button>
    </div>
  </header>
  <div
    class="progress"
    role="progressbar"
    aria-label="Words towards the round bonus"
    aria-valuemin={0}
    aria-valuemax={goal}
    aria-valuenow={found.length}
  >
    <span style:width="{Math.min(1, found.length / goal) * 100}%"></span>
  </div>

  {#if shown.length}
    <ul>
      {#each shown as word (word)}
        <li animate:flip={{ duration: ms(250) }} in:scale={{ duration: ms(250), start: 0.6 }}>
          <button
            type="button"
            class:latest={view === 'found' && word === latest}
            class:miss={view === 'missed'}
            title="Add “{word}” to the tray"
            onclick={() => onuse?.(word)}
          >
            {word}
          </button>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="empty">Longer words score more. Find {goal} to clear the round for a +50 bonus.</p>
  {/if}
</section>

<style>
  .words {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    padding: var(--space-4);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--surface);
    box-shadow: var(--shadow-sm);
  }

  header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-3);
  }

  h2 {
    font-size: var(--text-sm);
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--text-3);
  }

  .tabs {
    display: flex;
    gap: 2px;
    padding: 2px;
    border-radius: var(--radius-full);
    background: var(--surface-2);
    font-size: var(--text-sm);
    font-variant-numeric: tabular-nums;
  }

  .tabs button {
    padding: 0.125rem var(--space-3);
    border: 0;
    border-radius: var(--radius-full);
    background: transparent;
    color: var(--text-3);
    cursor: pointer;
    transition:
      background-color var(--dur-fast, 150ms),
      color var(--dur-fast, 150ms);
  }

  .tabs button strong {
    font-weight: 700;
  }

  .tabs button.on {
    background: var(--surface);
    color: var(--text);
    box-shadow: var(--shadow-sm);
  }

  .tabs button:disabled {
    opacity: 0.5;
    cursor: default;
  }

  .progress {
    height: 4px;
    margin-top: var(--space-2);
    border-radius: var(--radius-full);
    background: var(--surface-2);
    overflow: hidden;
  }

  .progress span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: var(--good);
    transition: width var(--dur-slow) var(--ease-out);
  }

  ul {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    gap: var(--space-2);
    margin-top: var(--space-3);
    padding: 0;
    list-style: none;
  }

  li button {
    padding: var(--space-1) var(--space-3);
    border: 0;
    border-radius: var(--radius-full);
    background: var(--surface-2);
    font-weight: 500;
    cursor: pointer;
    transition:
      background-color var(--dur-slow),
      color var(--dur-slow);
  }

  li button:active {
    background: var(--line);
  }

  li button.latest {
    background: var(--good-soft);
    color: var(--good);
    font-weight: 600;
  }

  li button.miss {
    color: var(--text-3);
    text-decoration: line-through;
    text-decoration-thickness: 1px;
  }

  .empty {
    margin: auto;
    padding: var(--space-4) var(--space-2);
    max-width: 18rem;
    font-size: var(--text-sm);
    text-align: center;
    color: var(--text-3);
  }
</style>
