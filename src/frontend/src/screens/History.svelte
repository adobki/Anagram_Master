<script lang="ts">
  import ArrowLeft from '@lucide/svelte/icons/arrow-left'
  import Check from '@lucide/svelte/icons/check'
  import ChevronDown from '@lucide/svelte/icons/chevron-down'
  import Play from '@lucide/svelte/icons/play'
  import RotateCcwClock from '@lucide/svelte/icons/rotate-ccw-clock'
  import Search from '@lucide/svelte/icons/search'
  import X from '@lucide/svelte/icons/x'
  import { fly } from 'svelte/transition'
  import Button from '../components/Button.svelte'
  import IconButton from '../components/IconButton.svelte'
  import Segmented from '../components/Segmented.svelte'
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

  type Show = 'all' | 'active' | 'finished'
  type Order = 'newest' | 'oldest' | 'score' | 'name'
  let show = $state<Show>('all')
  let order = $state<Order>('newest')
  let query = $state('')

  const SORTS: { value: Order; label: string }[] = [
    { value: 'newest', label: 'Newest first' },
    { value: 'oldest', label: 'Oldest first' },
    { value: 'score', label: 'Highest score' },
    { value: 'name', label: 'Name A to Z' },
  ]

  // The list is kept newest first, so that is its own order; the others sort a copy.
  const shown = $derived.by(() => {
    const needle = query.trim().toLowerCase()
    const list = games.list.filter(
      (g) =>
        (show === 'all' || (show === 'active' ? !g.over : g.over)) &&
        (!needle || g.state.name.toLowerCase().includes(needle)),
    )
    if (order === 'oldest') return list.reverse()
    if (order === 'score') return list.sort((a, b) => b.state.score - a.state.score)
    if (order === 'name') return list.sort((a, b) => a.state.name.localeCompare(b.state.name))
    return list
  })
  const filtering = $derived(show !== 'all' || query.trim() !== '')
  const clearFilters = () => {
    show = 'all'
    query = ''
  }
  const activeCount = $derived(games.list.filter((g) => !g.over).length)

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
    {#if games.list.length > 1}
      <div class="tools">
        <Segmented
          label="Show"
          hideLabel
          bind:value={show}
          options={[
            { value: 'all', label: `All ${games.list.length}` },
            { value: 'active', label: `Active ${activeCount}` },
            { value: 'finished', label: `Finished ${games.list.length - activeCount}` },
          ]}
        />
        <div class="find">
          <label class="search">
            <Search size="1rem" aria-hidden="true" />
            <input type="text" placeholder="Find a name" aria-label="Find a game by name" bind:value={query} autocomplete="off" spellcheck="false" />
            {#if query}
              <button type="button" class="clear" aria-label="Clear the search" onclick={() => (query = '')}><X size="0.875rem" /></button>
            {/if}
          </label>
          <label class="sort">
            <span class="sr">Sort by</span>
            <select bind:value={order}>
              {#each SORTS as sort (sort.value)}<option value={sort.value}>{sort.label}</option>{/each}
            </select>
            <ChevronDown size="1rem" aria-hidden="true" />
          </label>
        </div>
      </div>
    {/if}
    {#if games.list.length && !shown.length}
      <div class="empty">
        <Search size="2.5rem" />
        <p>No games match.</p>
        <Button variant="secondary" onclick={clearFilters}>Show all games</Button>
      </div>
    {:else if games.list.length}
      <ol class="board">
        {#each shown as game, i (game.id)}
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

  .tools {
    display: grid;
    gap: var(--space-2);
    margin-bottom: var(--space-3);
  }

  .find {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--space-2);
  }

  /* The same soft pill as the Show choices above, so they read as one control. */
  .search,
  .sort {
    position: relative;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-height: 2.75rem;
    padding: 0 var(--space-4);
    border-radius: var(--radius-full);
    background: var(--surface-2);
    color: var(--text-2);
  }

  .search:focus-within,
  .sort:focus-within {
    box-shadow: 0 0 0 3px rgb(247 63 82 / 0.18);
  }

  .search input,
  .sort select {
    min-width: 0;
    border: 0;
    outline: none;
    background: transparent;
    font: inherit;
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--text);
  }

  .search input {
    flex: 1;
  }

  .search input::placeholder {
    color: var(--text-3);
  }

  .sort select {
    appearance: none;
    padding-right: var(--space-5);
    cursor: pointer;
  }

  .sort :global(svg) {
    position: absolute;
    right: var(--space-3);
    pointer-events: none;
  }

  .clear {
    display: grid;
    place-items: center;
    width: 1.5rem;
    height: 1.5rem;
    padding: 0;
    border: 0;
    border-radius: var(--radius-full);
    background: var(--surface);
    color: var(--text-2);
    cursor: pointer;
  }

  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
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
