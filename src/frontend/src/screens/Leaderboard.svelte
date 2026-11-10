<script lang="ts">
  import ArrowLeft from '@lucide/svelte/icons/arrow-left'
  import RotateCw from '@lucide/svelte/icons/rotate-cw'
  import Trophy from '@lucide/svelte/icons/trophy'
  import { fly } from 'svelte/transition'
  import Button from '../components/Button.svelte'
  import IconButton from '../components/IconButton.svelte'
  import SettingsButton from '../components/SettingsButton.svelte'
  import { api, type ScoreEntry } from '../lib/api'
  import { MIN_LEADERBOARD_SCORE } from '../lib/game'
  import { ms } from '../lib/motion'

  interface Props {
    /** A just-finished game to highlight, if it made the board. */
    mine?: { name: string; score: number } | null
    onback: () => void
    onplay: () => void
  }

  let { mine = null, onback, onplay }: Props = $props()

  let request = $state(api.scores())
  const reload = () => (request = api.scores())

  const day = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
  const when = (date: string) => {
    const parsed = new Date(date)
    return Number.isNaN(parsed.getTime()) ? '' : day.format(parsed)
  }
  // Highlight only the first entry that matches the player's game.
  const mineIndex = (scores: ScoreEntry[]) =>
    mine ? scores.findIndex(([score, name]) => score === mine.score && name === mine.name) : -1
</script>

<div class="screen">
  <header class="bar">
    <IconButton label="Back" onclick={onback}><ArrowLeft size="1.25rem" /></IconButton>
    <h1>Leaderboard</h1>
    <SettingsButton />
  </header>

  <main>
    {#await request}
      <ol class="board loading" aria-label="Loading scores">
        {#each { length: 8 } as _, i (i)}<li class="skeleton"></li>{/each}
      </ol>
    {:then scores}
      {#if scores.length}
        {@const highlight = mineIndex(scores)}
        <ol class="board">
          {#each scores as [score, name, date], i (i)}
            <li
              class:gold={i === 0}
              class:silver={i === 1}
              class:bronze={i === 2}
              class:mine={i === highlight}
              in:fly={{ y: 12, duration: ms(260), delay: ms(Math.min(i, 10) * 35) }}
            >
              <span class="rank">{i + 1}</span>
              <span class="who">
                <span class="name">{name}{#if i === highlight}<span class="you">You</span>{/if}</span>
                <span class="date">{when(date)}</span>
              </span>
              <span class="score">{score}</span>
            </li>
          {/each}
        </ol>
      {:else}
        <div class="empty">
          <Trophy size="2.5rem" />
          <p>No scores yet. Score {MIN_LEADERBOARD_SCORE} or more in a game to be the first.</p>
        </div>
      {/if}
    {:catch}
      <div class="empty">
        <p>Couldn't load the leaderboard.</p>
        <Button variant="secondary" onclick={reload}><RotateCw size="1.125rem" /> Try again</Button>
      </div>
    {/await}
  </main>

  <footer>
    <Button size="lg" block onclick={onplay}>Play</Button>
  </footer>
</div>

<style>
  .bar {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
  }

  .bar > :global(:last-child) {
    justify-self: end;
  }

  h1 {
    font-size: var(--text-lg);
    font-weight: 700;
  }

  main,
  footer {
    width: 100%;
    max-width: 30rem;
    margin: 0 auto;
  }

  main {
    flex: 1;
    padding-block: var(--space-4) var(--space-6);
  }

  .board {
    display: grid;
    gap: var(--space-2);
    padding: 0;
    list-style: none;
  }

  li {
    display: grid;
    grid-template-columns: 2.25rem minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--surface);
  }

  .rank {
    display: grid;
    place-items: center;
    width: 2.25rem;
    height: 2.25rem;
    border-radius: var(--radius-full);
    background: var(--surface-2);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: var(--text-2);
  }

  .gold .rank {
    background: #f5b301;
    color: #3d2c00;
  }

  .silver .rank {
    background: #b8bec9;
    color: #22262e;
  }

  .bronze .rank {
    background: #d08a4e;
    color: #35200e;
  }

  .who {
    display: grid;
    min-width: 0;
  }

  .name {
    overflow: hidden;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .date {
    font-size: var(--text-xs);
    color: var(--text-3);
  }

  .score {
    font-size: var(--text-xl);
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }

  .mine {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 8%, var(--surface));
  }

  .you {
    margin-left: var(--space-2);
    padding: 0.05rem 0.5rem;
    border-radius: var(--radius-full);
    background: var(--primary);
    color: var(--on-primary);
    font-size: var(--text-xs);
    font-weight: 700;
  }

  .skeleton {
    height: 3.75rem;
    animation: pulse 1.2s ease-in-out infinite;
  }

  @keyframes pulse {
    50% {
      opacity: 0.45;
    }
  }

  .empty {
    display: grid;
    justify-items: center;
    gap: var(--space-4);
    padding: var(--space-12) var(--space-4);
    text-align: center;
    color: var(--text-2);
  }

  .empty :global(svg) {
    color: var(--text-3);
  }

  footer {
    position: sticky;
    bottom: 0;
    padding-top: var(--space-6);
    background: linear-gradient(transparent, var(--bg) 35%);
  }
</style>
