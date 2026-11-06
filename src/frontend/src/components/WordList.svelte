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
  }

  let { answers, goal, latest = null }: Props = $props()

  // Longest first: the impressive finds lead.
  const found = $derived(
    answers
      .filter(([, valid]) => valid)
      .map(([word]) => word)
      .sort((a, b) => b.length - a.length || a.localeCompare(b)),
  )
  const misses = $derived(answers.length - found.length)
</script>

<section class="words" aria-labelledby="words-title">
  <header>
    <h2 id="words-title">Words</h2>
    <p class="count">
      {#if misses}<span class="misses">{misses} {misses === 1 ? 'miss' : 'misses'} ·</span>{/if}
      <strong>{found.length}</strong>/{goal}
    </p>
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

  {#if found.length}
    <ul>
      {#each found as word (word)}
        <li class:latest={word === latest} animate:flip={{ duration: ms(250) }} in:scale={{ duration: ms(250), start: 0.6 }}>
          {word}
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

  .count {
    font-size: var(--text-sm);
    color: var(--text-2);
    font-variant-numeric: tabular-nums;
  }

  .count strong {
    color: var(--text);
    font-weight: 700;
  }

  .misses {
    color: var(--text-3);
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

  li {
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius-full);
    background: var(--surface-2);
    font-weight: 500;
    transition:
      background-color var(--dur-slow),
      color var(--dur-slow);
  }

  .latest {
    background: var(--good-soft);
    color: var(--good);
    font-weight: 600;
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
