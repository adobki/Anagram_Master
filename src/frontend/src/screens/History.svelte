<script lang="ts">
  import ArrowLeft from '@lucide/svelte/icons/arrow-left'
  import Check from '@lucide/svelte/icons/check'
  import Play from '@lucide/svelte/icons/play'
  import RotateCcwClock from '@lucide/svelte/icons/rotate-ccw-clock'
  import { fly } from 'svelte/transition'
  import Button from '../components/Button.svelte'
  import IconButton from '../components/IconButton.svelte'
  import ScreenBar from '../components/ScreenBar.svelte'
  import SettingsButton from '../components/SettingsButton.svelte'
  import { games, startedAt } from '../lib/history.svelte'
  import { ms } from '../lib/motion'

  interface Props {
    /** Open a game's page (its results, or its stats and a Resume button). */
    onopen: (id: string) => void
    /** Make a game that isn't over the current one again. */
    onresume: (id: string) => void
    onback: () => void
    onplay: () => void
  }

  let { onopen, onresume, onback, onplay }: Props = $props()

  const day = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
  const when = (created: string) => {
    const date = startedAt(created)
    return date ? day.format(date) : ''
  }
</script>

<div class="screen">
  <ScreenBar>
    <IconButton label="Back" onclick={onback}><ArrowLeft size="1.25rem" /></IconButton>
    <h1>Your games</h1>
    <SettingsButton />
  </ScreenBar>

  <main>
    {#if games.list.length}
      <ol class="board">
        {#each games.list as game, i (game.id)}
          <li class:live={!game.over} in:fly={{ y: 12, duration: ms(260), delay: ms(Math.min(i, 10) * 35) }}>
            <span class="badge" aria-hidden="true">
              {#if game.over}<Check size="1.125rem" />{:else}<Play size="1.125rem" />{/if}
            </span>
            <button type="button" class="open" onclick={() => onopen(game.id)}>
              <span class="name">{game.state.name}</span>
              <span class="meta">
                {#if game.over}
                  {when(game.state.created_at)} · finished
                {:else}
                  Round {game.state.round} of {game.state.rounds_limit} · in progress
                {/if}
              </span>
            </button>
            <span class="end">
              <span class="score">{game.state.score}</span>
              {#if !game.over && game.token}
                <Button size="sm" onclick={() => onresume(game.id)}>Resume</Button>
              {/if}
            </span>
          </li>
        {/each}
      </ol>
    {:else}
      <div class="empty">
        <RotateCcwClock size="2.5rem" />
        <p>No games yet. The games you play on this device show up here.</p>
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

  li.live {
    border-color: color-mix(in srgb, var(--accent) 35%, var(--line));
  }

  .badge {
    display: grid;
    place-items: center;
    width: 2.25rem;
    height: 2.25rem;
    border-radius: var(--radius-full);
    background: var(--surface-2);
    color: var(--text-2);
  }

  .live .badge {
    background: var(--primary);
    color: var(--on-primary);
  }

  .open {
    display: grid;
    min-width: 0;
    padding: var(--space-1) 0;
    border: 0;
    background: transparent;
    font: inherit;
    text-align: left;
    color: inherit;
    cursor: pointer;
    touch-action: manipulation;
  }

  .name {
    overflow: hidden;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .meta {
    font-size: var(--text-xs);
    color: var(--text-3);
  }

  .end {
    display: grid;
    justify-items: end;
    gap: var(--space-1);
  }

  .score {
    font-size: var(--text-xl);
    font-weight: 800;
    font-variant-numeric: tabular-nums;
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
