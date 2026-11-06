<script lang="ts">
  import House from '@lucide/svelte/icons/house'
  import RotateCcw from '@lucide/svelte/icons/rotate-ccw'
  import Trophy from '@lucide/svelte/icons/trophy'
  import { onMount } from 'svelte'
  import { cubicOut } from 'svelte/easing'
  import { Tween } from 'svelte/motion'
  import Button from '../components/Button.svelte'
  import IconButton from '../components/IconButton.svelte'
  import ThemeToggle from '../components/ThemeToggle.svelte'
  import type { GameState } from '../lib/api'
  import { MIN_LEADERBOARD_SCORE } from '../lib/game'
  import { ms } from '../lib/motion'

  interface Props {
    /** The final state of the finished game. */
    result: GameState
    onplay: () => void
    onhome: () => void
    onleaderboard: () => void
  }

  let { result, onplay, onhome, onleaderboard }: Props = $props()

  const rounds = $derived(
    Object.entries(result.words).map(([root, answers], i) => ({
      number: i + 1,
      root,
      found: answers.filter(([, valid]) => valid).map(([word]) => word),
    })),
  )
  const totalFound = $derived(rounds.reduce((sum, round) => sum + round.found.length, 0))
  const longest = $derived(
    rounds.flatMap((round) => round.found).reduce((best, word) => (word.length > best.length ? word : best), ''),
  )
  const onLeaderboard = $derived(result.score >= MIN_LEADERBOARD_SCORE)

  const shown = new Tween(0, { easing: cubicOut })
  onMount(() => {
    shown.set(result.score, { duration: ms(1200) })
  })
</script>

<div class="screen">
  <header class="bar">
    <IconButton label="Home" onclick={onhome}><House size={20} /></IconButton>
    <ThemeToggle />
  </header>

  <main>
    <section class="hero">
      <p class="eyebrow">Game over</p>
      <h1>Well played, {result.name}</h1>
      <p class="final">
        <span class="number">{Math.round(shown.current)}</span>
        <span class="unit">points</span>
      </p>
      <p class="badge" class:on={onLeaderboard}>
        {#if onLeaderboard}
          <Trophy size={16} /> Saved to the leaderboard
        {:else}
          Score {MIN_LEADERBOARD_SCORE} or more to make the leaderboard
        {/if}
      </p>
    </section>

    <dl class="stats">
      <div><dt>Rounds</dt><dd>{result.round}</dd></div>
      <div><dt>Words</dt><dd>{totalFound}</dd></div>
      <div><dt>Longest</dt><dd class="word">{longest || '—'}</dd></div>
    </dl>

    <section class="recap" aria-labelledby="recap-title">
      <h2 id="recap-title">Round by round</h2>
      <ol>
        {#each rounds as round (round.number)}
          <li>
            <span class="n">{round.number}</span>
            <span class="detail">
              <span class="root">{round.root}</span>
              <span class="list">{round.found.join(', ') || 'No words'}</span>
            </span>
            <span class="count">{round.found.length}</span>
          </li>
        {/each}
      </ol>
    </section>
  </main>

  <footer>
    <Button size="lg" block onclick={onplay}><RotateCcw size={20} /> Play again</Button>
    <Button variant="secondary" size="lg" block onclick={onleaderboard}><Trophy size={20} /> Leaderboard</Button>
  </footer>
</div>

<style>
  .bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  main,
  footer {
    width: 100%;
    max-width: 30rem;
    margin: 0 auto;
  }

  main {
    flex: 1;
    display: grid;
    align-content: start;
    gap: var(--space-6);
    padding-block: var(--space-4) var(--space-6);
  }

  .hero {
    display: grid;
    justify-items: center;
    gap: var(--space-2);
    text-align: center;
  }

  .eyebrow {
    font-size: var(--text-xs);
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--accent);
  }

  h1 {
    font-size: var(--text-2xl);
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .final {
    display: grid;
    justify-items: center;
    margin-top: var(--space-2);
    line-height: 1;
  }

  .number {
    font-size: 5rem;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.04em;
    background: linear-gradient(180deg, var(--text), color-mix(in srgb, var(--text) 55%, var(--accent)));
    background-clip: text;
    -webkit-background-clip: text;
    color: transparent;
  }

  .unit {
    margin-top: var(--space-1);
    font-size: var(--text-sm);
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--text-3);
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    margin-top: var(--space-3);
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-full);
    background: var(--surface-2);
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--text-2);
  }

  .badge.on {
    background: var(--good-soft);
    color: var(--good);
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-3);
    margin: 0;
  }

  .stats div {
    display: grid;
    gap: var(--space-1);
    padding: var(--space-4) var(--space-3);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--surface);
    text-align: center;
    min-width: 0;
  }

  dt {
    font-size: var(--text-xs);
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-3);
  }

  dd {
    margin: 0;
    font-size: var(--text-2xl);
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    line-height: 1.2;
  }

  dd.word {
    overflow: hidden;
    font-size: var(--text-lg);
    line-height: 2.1rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .recap h2 {
    margin-bottom: var(--space-3);
    font-size: var(--text-sm);
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--text-3);
  }

  ol {
    padding: 0;
    list-style: none;
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--surface);
    overflow: hidden;
  }

  li {
    display: grid;
    grid-template-columns: 1.75rem minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
  }

  li + li {
    border-top: 1px solid var(--line);
  }

  .n {
    font-size: var(--text-sm);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: var(--text-3);
  }

  .detail {
    display: grid;
    min-width: 0;
  }

  .root {
    font-weight: 600;
  }

  .list {
    overflow: hidden;
    font-size: var(--text-sm);
    color: var(--text-3);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .count {
    min-width: 2rem;
    padding: 0.125rem var(--space-2);
    border-radius: var(--radius-full);
    background: var(--surface-2);
    font-size: var(--text-sm);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    text-align: center;
  }

  footer {
    position: sticky;
    bottom: 0;
    display: grid;
    gap: var(--space-3);
    padding-top: var(--space-6);
    background: linear-gradient(transparent, var(--bg) 35%);
  }
</style>
