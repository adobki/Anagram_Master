<script lang="ts">
  import ArrowLeft from '@lucide/svelte/icons/arrow-left'
  import RotateCw from '@lucide/svelte/icons/rotate-cw'
  import Trophy from '@lucide/svelte/icons/trophy'
  import WifiOff from '@lucide/svelte/icons/wifi-off'
  import { onMount } from 'svelte'
  import { fly } from 'svelte/transition'
  import Button from '../components/Button.svelte'
  import IconButton from '../components/IconButton.svelte'
  import ScreenBar from '../components/ScreenBar.svelte'
  import SettingsButton from '../components/SettingsButton.svelte'
  import type { ScoreEntry } from '../lib/api'
  import { MIN_LEADERBOARD_SCORE } from '../lib/game'
  import { ms } from '../lib/motion'
  import { network } from '../lib/network.svelte'
  import { scores } from '../lib/scores.svelte'

  interface Props {
    /** A just-finished game to highlight, if it made the board. */
    mine?: { name: string; score: number } | null
    onback: () => void
    onplay: () => void
  }

  let { mine = null, onback, onplay }: Props = $props()

  // Show what was kept from last time at once, and refresh it.
  onMount(() => void scores.refresh())
  // Back online after a failed refresh: try again by itself.
  let wasOnline = network.online
  $effect(() => {
    const online = network.online
    if (online && !wasOnline && scores.status === 'failed') void scores.refresh()
    wasOnline = online
  })

  const day = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
  const when = (date: string) => {
    const parsed = new Date(date)
    return Number.isNaN(parsed.getTime()) ? '' : day.format(parsed)
  }
  const stamp = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
  const kept = $derived(scores.savedAt ? stamp.format(scores.savedAt) : '')
  const problem = $derived(network.online ? "Couldn't refresh the leaderboard." : "You're offline.")

  // Highlight only the first entry that matches the player's game.
  const mineIndex = (list: ScoreEntry[]) =>
    mine ? list.findIndex(([score, name]) => score === mine.score && name === mine.name) : -1
</script>

<div class="screen">
  <ScreenBar>
    <IconButton label="Back" onclick={onback}><ArrowLeft size="1.25rem" /></IconButton>
    <h1>Leaderboard</h1>
    <SettingsButton />
  </ScreenBar>

  <main>
    {#if scores.list}
      {#if scores.status === 'refreshing'}
        <p class="note" role="status"><span class="spinner" aria-hidden="true"></span> Refreshing…</p>
      {:else if scores.status === 'failed'}
        <div class="note warn" role="status">
          <WifiOff size="1rem" />
          <span>{problem} Showing scores from {kept}.</span>
          <button type="button" class="retry" onclick={() => scores.refresh()}>Try again</button>
        </div>
      {/if}
      {#if scores.list.length}
        {@const highlight = mineIndex(scores.list)}
        <ol class="board">
          {#each scores.list as [score, name, date], i (i)}
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
    {:else if scores.status === 'failed'}
      <div class="empty">
        <WifiOff size="2.5rem" />
        <p>{problem} The leaderboard hasn't been loaded on this device yet.</p>
        <Button variant="secondary" onclick={() => scores.refresh()}><RotateCw size="1.125rem" /> Try again</Button>
      </div>
    {:else}
      <div class="empty" role="status" aria-live="polite">
        <span class="spinner big" aria-hidden="true"></span>
        <p><strong>Loading the leaderboard…</strong></p>
      </div>
    {/if}
  </main>

  <footer>
    <Button size="lg" block onclick={onplay}>Play</Button>
  </footer>
</div>

<style>
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

  .note {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-3);
    font-size: var(--text-sm);
    color: var(--text-2);
  }

  .note.warn {
    padding: var(--space-3);
    border-radius: var(--radius-md);
    background: var(--warn-soft);
    color: var(--text);
  }

  .note.warn :global(svg) {
    flex: none;
    color: var(--warn);
  }

  .retry {
    margin-left: auto;
    padding: var(--space-1) var(--space-2);
    border: 0;
    background: transparent;
    font: inherit;
    font-weight: 700;
    color: var(--accent);
    cursor: pointer;
  }

  .spinner {
    width: 0.875rem;
    height: 0.875rem;
    border: 2px solid var(--surface-2);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.9s linear infinite;
  }

  .spinner.big {
    width: 1.75rem;
    height: 1.75rem;
    border-width: 3px;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
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
    z-index: 5; /* above the page content, below the top bar, toasts and dialogs */
    padding-top: var(--space-6);
    background: linear-gradient(transparent, var(--bg) 35%);
  }
</style>
