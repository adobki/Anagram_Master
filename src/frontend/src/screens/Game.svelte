<script lang="ts">
  import Delete from '@lucide/svelte/icons/delete'
  import Shuffle from '@lucide/svelte/icons/shuffle'
  import SkipForward from '@lucide/svelte/icons/skip-forward'
  import X from '@lucide/svelte/icons/x'
  import { onDestroy } from 'svelte'
  import { fade, scale } from 'svelte/transition'
  import AnswerBar from '../components/AnswerBar.svelte'
  import Button from '../components/Button.svelte'
  import Dialog from '../components/Dialog.svelte'
  import FeedbackPill from '../components/FeedbackPill.svelte'
  import IconButton from '../components/IconButton.svelte'
  import Score from '../components/Score.svelte'
  import TileRack from '../components/TileRack.svelte'
  import Timer from '../components/Timer.svelte'
  import WordList from '../components/WordList.svelte'
  import { MIN_LEADERBOARD_SCORE, type Feedback, type GameController } from '../lib/game'
  import { shuffled, tilesOf } from '../lib/letters'
  import { ms } from '../lib/motion'

  interface Props {
    game: GameController
    /** Called once the game is over (quit, or the last round ran out of time). */
    onend: () => void
  }

  let { game, onend }: Props = $props()

  const s = $derived(game.state)
  const root = $derived(s.word ?? '')
  const answers = $derived(s.word ? (s.words[s.word] ?? []) : [])
  const lastRound = $derived(s.round >= s.rounds_limit)

  // The tiles follow the round's word; shuffling reorders them until it changes.
  let tiles = $derived(tilesOf(root))
  // The answer being built, as tile ids in tap order. Resets when the word changes.
  let picked = $derived.by((): number[] => {
    void root
    return []
  })
  const answer = $derived(picked.map((id) => tiles.find((tile) => tile.id === id)!))
  const word = $derived(answer.map((tile) => tile.letter).join(''))

  let feedback = $state<(Feedback & { id: number }) | null>(null)
  let latest = $state<string | null>(null)
  let shake = $state(0)
  let skipArmed = $state(false)
  let confirmEnd = $state(false)
  let banner = $state<number | null>(null)

  const timers = new Set<ReturnType<typeof setTimeout>>()
  function later(fn: () => void, delay: number) {
    const timer = setTimeout(() => {
      timers.delete(timer)
      fn()
    }, delay)
    timers.add(timer)
    return timer
  }
  onDestroy(() => timers.forEach(clearTimeout))

  // Announce each new round.
  let seenRound = 0
  $effect(() => {
    const round = s.round
    if (seenRound && round !== seenRound) {
      banner = round
      latest = null
      skipArmed = false
      later(() => (banner = null), 1100)
    }
    seenRound = round
  })

  $effect(() => {
    if (!s.status) onend()
  })

  // After a rejected word, its letters stay up while the bar shakes; the next
  // letter (or the timeout below) starts a fresh word.
  let rejected = false
  function fresh() {
    if (rejected) {
      rejected = false
      picked = []
    }
  }

  function pick(id: number) {
    if (game.busy) return
    fresh()
    picked = picked.includes(id) ? picked.filter((p) => p !== id) : [...picked, id]
  }

  function pickLetter(letter: string) {
    if (game.busy) return
    fresh()
    const tile = tiles.find((t) => t.letter === letter && !picked.includes(t.id))
    if (tile) picked = [...picked, tile.id]
    else shake++
  }

  function undo() {
    if (game.busy) return
    if (rejected) fresh()
    else picked = picked.slice(0, -1)
  }

  const clear = () => (picked = [])
  const shuffle = () => (tiles = shuffled(tiles))

  let hideFeedback: ReturnType<typeof setTimeout> | undefined
  function say(next: Feedback) {
    feedback = { ...next, id: (feedback?.id ?? 0) + 1 }
    clearTimeout(hideFeedback)
    hideFeedback = later(() => (feedback = null), 1800)
  }

  async function submit() {
    if (!word || game.busy || rejected) return
    const sent = word
    const result = await game.submit(sent) // letter input pauses while this is in flight
    say(result)
    if (result.tone === 'good') {
      latest = sent
      clear()
    } else {
      shake++
      rejected = true
      later(fresh, 450)
    }
  }

  let disarm: ReturnType<typeof setTimeout> | undefined
  async function skip() {
    // A skip costs the round, so it takes a second tap to confirm.
    if (!skipArmed) {
      skipArmed = true
      disarm = later(() => (skipArmed = false), 2500)
      return
    }
    clearTimeout(disarm)
    skipArmed = false
    await game.skip()
  }

  async function end() {
    confirmEnd = false
    await game.quit()
  }

  function onkeydown(event: KeyboardEvent) {
    if (event.metaKey || event.ctrlKey || event.altKey || confirmEnd) return
    if (event.target instanceof HTMLInputElement) return
    const { key } = event
    if (key === 'Enter') {
      event.preventDefault()
      submit()
    } else if (key === 'Backspace') {
      event.preventDefault()
      undo()
    } else if (key === 'Escape') {
      clear()
    } else if (key === ' ') {
      event.preventDefault()
      shuffle()
    } else if (key.length === 1 && /\p{L}/u.test(key)) {
      pickLetter(key.toLowerCase())
    }
  }
</script>

<svelte:window {onkeydown} />

<div class="game">
  <header class="top">
    <IconButton label="End game" onclick={() => (confirmEnd = true)}><X size={22} /></IconButton>
    <div class="round">
      <span>Round <strong>{s.round}</strong> of {s.rounds_limit}</span>
      <span class="round-bar"><span style:width="{(s.round / s.rounds_limit) * 100}%"></span></span>
    </div>
    <Button
      variant={skipArmed ? 'secondary' : 'ghost'}
      size="sm"
      class={skipArmed ? 'armed' : ''}
      disabled={lastRound || game.busy}
      title={lastRound ? 'There is no next word in the last round' : undefined}
      onclick={skip}
    >
      {skipArmed ? 'Tap to skip' : 'Skip'}
      <SkipForward size={16} />
    </Button>
  </header>

  <div class="board">
    <div class="stats">
      <Timer time={game.timeLeft} limit={s.time_limit} />
      <span class="player"><span class="avatar" aria-hidden="true">{s.name.charAt(0)}</span>{s.name}</span>
      <Score score={s.score} />
    </div>

    <div class="found">
      <WordList {answers} goal={s.rounds_limit} {latest} />
    </div>

    <div class="play">
      <FeedbackPill {feedback} />
      <AnswerBar letters={answer} {shake} />
      <TileRack {tiles} {picked} onpick={pick} />
      <div class="actions">
        <IconButton variant="filled" label="Shuffle letters" onclick={shuffle}><Shuffle size={22} /></IconButton>
        <Button size="lg" class="submit" disabled={!word || game.busy} onclick={submit}>Submit</Button>
        <IconButton variant="filled" label="Delete last letter" disabled={!picked.length} onclick={undo}>
          <Delete size={22} />
        </IconButton>
      </div>
      <p class="hints">Type to play · <kbd>Enter</kbd> submit · <kbd>Space</kbd> shuffle · <kbd>Esc</kbd> clear</p>
    </div>
  </div>

  {#if banner}
    <div class="banner" aria-hidden="true">
      <p in:scale={{ duration: ms(350), start: 0.7 }} out:fade={{ duration: ms(200) }}>
        <span>Round</span>{banner}
      </p>
    </div>
  {/if}

  <Dialog bind:open={confirmEnd} title="End this game?">
    <p>
      {#if s.score >= MIN_LEADERBOARD_SCORE}
        Your {s.score} points will go on the leaderboard.
      {:else}
        Scores under {MIN_LEADERBOARD_SCORE} aren't saved, so this game will be discarded.
      {/if}
    </p>
    {#snippet actions()}
      <Button variant="secondary" onclick={() => (confirmEnd = false)}>Keep playing</Button>
      <Button onclick={end}>End game</Button>
    {/snippet}
  </Dialog>
</div>

<style>
  .game {
    display: flex;
    flex-direction: column;
    height: 100dvh;
    padding-bottom: max(env(safe-area-inset-bottom), var(--space-4));
  }

  .top {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: var(--space-2);
    padding: max(env(safe-area-inset-top), var(--space-2)) max(env(safe-area-inset-right), var(--space-3))
      var(--space-2) max(env(safe-area-inset-left), var(--space-3));
  }

  .top > :global(:last-child) {
    justify-self: end;
  }

  .top :global(.armed) {
    color: var(--warn);
    border-color: var(--warn);
  }

  .round {
    display: grid;
    justify-items: center;
    gap: 6px;
    font-size: var(--text-sm);
    color: var(--text-2);
  }

  .round strong {
    color: var(--text);
  }

  .round-bar {
    width: 7rem;
    height: 4px;
    border-radius: var(--radius-full);
    background: var(--surface-2);
    overflow: hidden;
  }

  .round-bar span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: var(--accent);
    transition: width var(--dur-slow) var(--ease-out);
  }

  .board {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-areas: 'stats' 'found' 'play';
    grid-template-rows: auto minmax(6.5rem, 1fr) auto;
    gap: var(--space-3);
    width: 100%;
    max-width: 34rem;
    margin-inline: auto;
    padding: 0 max(env(safe-area-inset-right), var(--space-4)) 0 max(env(safe-area-inset-left), var(--space-4));
  }

  .stats {
    grid-area: stats;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }

  .player {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
    font-weight: 600;
    color: var(--text-2);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .avatar {
    display: grid;
    place-items: center;
    flex: none;
    width: 1.75rem;
    height: 1.75rem;
    border-radius: var(--radius-full);
    background: var(--primary);
    color: var(--on-primary);
    font-size: var(--text-sm);
    font-weight: 700;
    text-transform: uppercase;
  }

  .found {
    grid-area: found;
    min-height: 0;
  }

  .play {
    grid-area: play;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .actions {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: var(--space-3);
    margin-top: var(--space-1);
  }

  .hints {
    display: none;
    font-size: var(--text-xs);
    text-align: center;
    color: var(--text-3);
  }

  kbd {
    padding: 0 0.35em;
    border: 1px solid var(--line);
    border-radius: 0.3rem;
    background: var(--surface);
    font: inherit;
    font-weight: 600;
  }

  @media (hover: hover) and (pointer: fine) {
    .hints {
      display: block;
    }
  }

  .banner {
    position: fixed;
    inset: 0;
    z-index: 10;
    display: grid;
    place-items: center;
    pointer-events: none;
  }

  .banner p {
    display: grid;
    justify-items: center;
    padding: var(--space-5) var(--space-10);
    border: 1px solid var(--line);
    border-radius: var(--radius-xl);
    background: var(--surface);
    box-shadow: var(--shadow-lg);
    font-size: var(--text-4xl);
    font-weight: 800;
    line-height: 1;
  }

  .banner span {
    margin-bottom: var(--space-2);
    font-size: var(--text-sm);
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--accent);
  }

  /* Tablets and desktops in landscape: words beside the board. */
  @media (min-width: 52rem) and (orientation: landscape) {
    .board {
      max-width: 66rem;
      grid-template-areas: 'stats found' 'play found';
      grid-template-columns: minmax(0, 1fr) minmax(16rem, 22rem);
      grid-template-rows: auto 1fr;
      column-gap: var(--space-10);
      padding-bottom: var(--space-4);
    }

    .play {
      justify-content: safe center;
    }
  }

  /* Short landscape screens (phones on their side): play area on the left,
     clock, score and words on the right, so Submit stays on screen. */
  @media (max-height: 34rem) and (orientation: landscape) {
    .top {
      padding-block: var(--space-1) 0;
    }

    .board {
      max-width: none;
      grid-template-areas: 'play stats' 'play found';
      grid-template-columns: minmax(0, 1fr) minmax(14rem, 20rem);
      grid-template-rows: auto 1fr;
      column-gap: var(--space-6);
      overflow-y: auto;
    }

    .play {
      justify-content: safe center;
      gap: var(--space-2);
    }

    .play :global(.answer) {
      min-height: 3rem;
    }

    .player,
    .hints {
      display: none;
    }
  }
</style>
