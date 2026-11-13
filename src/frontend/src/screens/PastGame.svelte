<script lang="ts">
  import ArrowRight from '@lucide/svelte/icons/arrow-right'
  import CircleStop from '@lucide/svelte/icons/circle-stop'
  import Clock from '@lucide/svelte/icons/clock'
  import ArrowLeft from '@lucide/svelte/icons/arrow-left'
  import Button from '../components/Button.svelte'
  import Dialog from '../components/Dialog.svelte'
  import IconButton from '../components/IconButton.svelte'
  import ScreenBar from '../components/ScreenBar.svelte'
  import SettingsButton from '../components/SettingsButton.svelte'
  import { MIN_LEADERBOARD_SCORE } from '../lib/game'
  import type { SavedGame } from '../lib/history.svelte'

  interface Props {
    /** A game from History that hasn't ended. */
    game: SavedGame
    /** It can be made the current game again (it has a token, or already is the current game). */
    canResume: boolean
    /** A resume or end is under way. */
    busy?: boolean
    onresume: () => void
    onend: () => Promise<void>
    onback: () => void
  }

  let { game, canResume, busy = false, onresume, onend, onback }: Props = $props()

  const info = $derived(game.state)
  const found = $derived(Object.values(info.words).flat().filter(([, valid]) => valid).map(([word]) => word))
  const longest = $derived(found.reduce((best, word) => (word.length > best.length ? word : best), ''))
  const seen = $derived(
    new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(game.savedAt),
  )

  let confirming = $state(false)
  async function end() {
    await onend()
    confirming = false
  }
</script>

<div class="screen">
  <ScreenBar>
    <IconButton label="Back" onclick={onback}><ArrowLeft size="1.25rem" /></IconButton>
    <SettingsButton />
  </ScreenBar>

  <main>
    <section class="card">
      <p class="eyebrow">Game in progress</p>
      <p class="who">{info.name}</p>
      <p class="meta">Round {info.round} of {info.rounds_limit} · {info.score} {info.score === 1 ? 'point' : 'points'}</p>

      <dl class="stats">
        <div><dt>Words</dt><dd>{found.length}</dd></div>
        <div><dt>Longest</dt><dd class="word">{longest || '—'}</dd></div>
        <div><dt>Last seen</dt><dd class="small">{seen}</dd></div>
      </dl>

      <p class="running">
        <Clock size="1rem" />
        <span>The clock keeps running while you're away. If a round's time ran out, the next one waits for you: press Next round when you resume.</span>
      </p>

      {#if canResume}
        <Button size="lg" block disabled={busy} onclick={onresume}>Resume <ArrowRight size="1.25rem" /></Button>
        <Button variant="ghost" size="sm" block disabled={busy} onclick={() => (confirming = true)}>
          <CircleStop size="1rem" /> End this game
        </Button>
      {:else}
        <p class="sub">This game was started before History existed, so it can't be resumed from here.</p>
      {/if}
    </section>
  </main>
</div>

<Dialog bind:open={confirming} title="End this game?">
  <p>
    It's on round {info.round} of {info.rounds_limit} with {info.score}
    {info.score === 1 ? 'point' : 'points'}. It can't be resumed once it's ended.
    {#if info.score >= MIN_LEADERBOARD_SCORE}
      Your score goes on the leaderboard.
    {:else}
      Scores under {MIN_LEADERBOARD_SCORE} aren't saved.
    {/if}
  </p>
  {#snippet actions()}
    <Button variant="secondary" onclick={() => (confirming = false)}>Keep it</Button>
    <Button disabled={busy} onclick={end}>End game</Button>
  {/snippet}
</Dialog>

<style>
  main {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    width: 100%;
    max-width: 26rem;
    margin: 0 auto;
    padding-block: var(--space-4) var(--space-6);
  }

  .card {
    display: grid;
    gap: var(--space-4);
    padding: var(--space-5);
    border: 1px solid color-mix(in srgb, var(--accent) 35%, var(--line));
    border-radius: var(--radius-xl);
    background: var(--surface);
    box-shadow: var(--shadow-md);
  }

  .eyebrow {
    font-size: var(--text-xs);
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--accent);
  }

  .who {
    font-size: var(--text-xl);
    font-weight: 700;
    line-height: 1.2;
  }

  .meta,
  .sub {
    font-size: var(--text-sm);
    color: var(--text-2);
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-2);
    text-align: center;
  }

  .stats div {
    padding: var(--space-3) var(--space-2);
    border-radius: var(--radius-md);
    background: var(--surface-2);
  }

  dt {
    font-size: var(--text-xs);
    color: var(--text-3);
  }

  dd {
    font-size: var(--text-lg);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  dd.word {
    overflow: hidden;
    font-size: var(--text-sm);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  dd.small {
    font-size: var(--text-xs);
  }

  .running {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: start;
    gap: var(--space-2);
    padding-top: var(--space-3);
    border-top: 1px solid var(--line);
    font-size: var(--text-sm);
    color: var(--text-2);
  }

  .running :global(svg) {
    margin-top: 0.15rem;
    color: var(--warn);
  }
</style>
