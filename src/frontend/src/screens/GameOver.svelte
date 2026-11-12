<script lang="ts">
  import ArrowLeft from '@lucide/svelte/icons/arrow-left'
  import ChevronDown from '@lucide/svelte/icons/chevron-down'
  import House from '@lucide/svelte/icons/house'
  import RotateCcw from '@lucide/svelte/icons/rotate-ccw'
  import Share2 from '@lucide/svelte/icons/share-2'
  import Trophy from '@lucide/svelte/icons/trophy'
  import { onMount } from 'svelte'
  import { cubicOut } from 'svelte/easing'
  import { Tween } from 'svelte/motion'
  import { slide } from 'svelte/transition'
  import Button from '../components/Button.svelte'
  import IconButton from '../components/IconButton.svelte'
  import ScreenBar from '../components/ScreenBar.svelte'
  import SettingsButton from '../components/SettingsButton.svelte'
  import type { GameState } from '../lib/api'
  import { MIN_LEADERBOARD_SCORE } from '../lib/game'
  import { ms } from '../lib/motion'
  import { shareScore } from '../lib/share'

  interface Props {
    /** The final state of the finished game. */
    result: GameState
    /** The best score on this device, this game included. */
    best?: number
    /** The earlier best this game beat, or null if it didn't beat one. */
    beaten?: number | null
    /** A finished game opened from History, not one that just ended. */
    past?: boolean
    /** Something to say about it, such as that it ended while the player was away. */
    note?: string
    onplay: () => void
    onhome: () => void
    /** Opened from History: the top-left button goes back there instead of home. */
    onback?: () => void
    onleaderboard: () => void
  }

  let { result, best = 0, beaten = null, past = false, note = '', onplay, onhome, onback, onleaderboard }: Props = $props()

  const rounds = $derived(
    Object.entries(result.words).map(([root, answers], i) => ({
      number: i + 1,
      root,
      // Longest first, like the game screen.
      found: answers
        .filter(([, valid]) => valid)
        .map(([word]) => word)
        .sort((a, b) => b.length - a.length || a.localeCompare(b)),
      missed: answers.filter(([, valid]) => !valid).map(([word]) => word),
    })),
  )
  /** Rounds opened to show every word, right and wrong. */
  let open = $state<number[]>([])
  const toggle = (number: number) =>
    (open = open.includes(number) ? open.filter((n) => n !== number) : [...open, number])
  const totalFound = $derived(rounds.reduce((sum, round) => sum + round.found.length, 0))
  const longest = $derived(
    rounds.flatMap((round) => round.found).reduce((best, word) => (word.length > best.length ? word : best), ''),
  )
  const totalMissed = $derived(rounds.reduce((sum, round) => sum + round.missed.length, 0))
  const accuracy = $derived(
    totalFound + totalMissed ? `${Math.round((totalFound / (totalFound + totalMissed)) * 100)}%` : '—',
  )
  // The round with the most words (the earliest, if tied).
  const bestRound = $derived(
    rounds.reduce((top, round) => (round.found.length > top.found.length ? round : top), rounds[0]),
  )
  const average = $derived(rounds.length ? (totalFound / rounds.length).toFixed(1).replace(/\.0$/, '') : '0')
  const onLeaderboard = $derived(result.score >= MIN_LEADERBOARD_SCORE)

  const shown = new Tween(0, { easing: cubicOut })
  onMount(() => {
    shown.set(result.score, { duration: ms(1200) })
  })
</script>

<div class="screen">
  <ScreenBar>
    {#if onback}
      <IconButton label="Back" onclick={onback}><ArrowLeft size="1.25rem" /></IconButton>
    {:else}
      <IconButton label="Home" onclick={onhome}><House size="1.25rem" /></IconButton>
    {/if}
    <SettingsButton />
  </ScreenBar>

  <main>
    <section class="hero">
      <p class="eyebrow">{past ? 'Past game' : 'Game over'}</p>
      <h1>{past ? result.name : `Well played, ${result.name}`}</h1>
      {#if note}<p class="note">{note}</p>{/if}
      <p class="final">
        <span class="number">{Math.round(shown.current)}</span>
        <span class="unit">points</span>
      </p>
      <p class="badge" class:on={onLeaderboard}>
        {#if onLeaderboard}
          <Trophy size="1rem" /> Saved to the leaderboard
        {:else}
          Score {MIN_LEADERBOARD_SCORE} or more to make the leaderboard
        {/if}
      </p>
      {#if beaten}
        <p class="badge on"><Trophy size="1rem" /> New personal best! It was {beaten}</p>
      {:else if best > result.score}
        <p class="badge">Your best: {best}</p>
      {/if}
      {#if result.score > 0}
        <Button variant="ghost" size="sm" onclick={() => shareScore(result.score, result.name)}>
          <Share2 size="1rem" /> Share your score
        </Button>
      {/if}
    </section>

    <dl class="stats">
      <div><dt>Rounds</dt><dd>{result.round}</dd></div>
      <div><dt>Words</dt><dd>{totalFound}</dd></div>
      <div><dt>Longest</dt><dd class="word">{longest || '—'}</dd></div>
      <div><dt>Accuracy</dt><dd>{accuracy}</dd></div>
      <div>
        <dt>Best round</dt>
        <dd>{bestRound && bestRound.found.length ? `#${bestRound.number}` : '—'}</dd>
        {#if bestRound && bestRound.found.length}<span class="sub">{bestRound.found.length} words</span>{/if}
      </div>
      <div><dt>Per round</dt><dd>{average}</dd></div>
    </dl>

    <section class="recap" aria-labelledby="recap-title">
      <h2 id="recap-title">Round by round</h2>
      <ol>
        {#each rounds as round (round.number)}
          {@const expanded = open.includes(round.number)}
          {@const panel = `round-${round.number}`}
          <li>
            <button type="button" class="row" aria-expanded={expanded} aria-controls={panel} onclick={() => toggle(round.number)}>
              <span class="n">{round.number}</span>
              <span class="detail">
                <span class="root">{round.root}</span>
                {#if !expanded}<span class="list">{round.found.join(', ') || 'No words'}</span>{/if}
              </span>
              <span class="count">{round.found.length}</span>
              <ChevronDown class="chevron {expanded ? 'open' : ''}" size="1.125rem" />
            </button>
            {#if expanded}
              <div class="all" id={panel} transition:slide={{ duration: ms(200) }}>
                {#if round.found.length || round.missed.length}
                  {#if round.found.length}
                    <p class="group">Found · {round.found.length}</p>
                    <ul class="chips">
                      {#each round.found as word (word)}<li>{word}</li>{/each}
                    </ul>
                  {/if}
                  {#if round.missed.length}
                    <p class="group">Missed · {round.missed.length}</p>
                    <ul class="chips miss">
                      {#each round.missed as word (word)}<li>{word}</li>{/each}
                    </ul>
                  {/if}
                {:else}
                  <p class="group">You didn't try any words this round.</p>
                {/if}
              </div>
            {/if}
          </li>
        {/each}
      </ol>
    </section>
  </main>

  <footer>
    <Button size="lg" block onclick={onplay}><RotateCcw size="1.25rem" /> {past ? 'New game' : 'Play again'}</Button>
    <Button variant="secondary" size="lg" block onclick={onleaderboard}><Trophy size="1.25rem" /> Leaderboard</Button>
  </footer>
</div>

<style>

  .note {
    font-size: var(--text-sm);
    color: var(--text-2);
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
    /* The tight spacing leaves the last digit hanging past the box, and the
       gradient is clipped to the box, so pad it back in. */
    padding-inline: 0.06em;
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

  .sub {
    margin-top: -0.25rem;
    font-size: var(--text-xs);
    color: var(--text-3);
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

  ol > li + li {
    border-top: 1px solid var(--line);
  }

  .row {
    display: grid;
    grid-template-columns: 1.75rem minmax(0, 1fr) auto auto;
    align-items: center;
    gap: var(--space-3);
    width: 100%;
    padding: var(--space-3) var(--space-4);
    border: 0;
    background: transparent;
    text-align: left;
    cursor: pointer;
  }

  .row:active {
    background: var(--surface-2);
  }

  .row :global(.chevron) {
    color: var(--text-3);
    transition: rotate var(--dur) var(--ease-out);
  }

  .row :global(.chevron.open) {
    rotate: 180deg;
  }

  .all {
    padding: 0 var(--space-4) var(--space-4) calc(var(--space-4) + 1.75rem + var(--space-3));
  }

  .group {
    margin-top: var(--space-2);
    font-size: var(--text-xs);
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-3);
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-top: var(--space-2);
    padding: 0;
    list-style: none;
  }

  .chips li {
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius-full);
    background: var(--surface-2);
    font-size: var(--text-sm);
    font-weight: 500;
  }

  .chips.miss li {
    color: var(--text-3);
    text-decoration: line-through;
    text-decoration-thickness: 1px;
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
