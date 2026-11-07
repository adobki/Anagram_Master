<script lang="ts">
  import Clock from '@lucide/svelte/icons/clock'
  import Delete from '@lucide/svelte/icons/delete'
  import Eraser from '@lucide/svelte/icons/eraser'
  import ListRestart from '@lucide/svelte/icons/list-restart'
  import Pause from '@lucide/svelte/icons/pause'
  import Pin from '@lucide/svelte/icons/pin'
  import Shuffle from '@lucide/svelte/icons/shuffle'
  import SkipForward from '@lucide/svelte/icons/skip-forward'
  import { onDestroy, onMount } from 'svelte'
  import { fade, scale } from 'svelte/transition'
  import Button from '../components/Button.svelte'
  import Dialog from '../components/Dialog.svelte'
  import FeedbackPill from '../components/FeedbackPill.svelte'
  import IconButton from '../components/IconButton.svelte'
  import Score from '../components/Score.svelte'
  import ThemeToggle from '../components/ThemeToggle.svelte'
  import Tile from '../components/Tile.svelte'
  import TileRack from '../components/TileRack.svelte'
  import Timer from '../components/Timer.svelte'
  import Tray from '../components/Tray.svelte'
  import WordList from '../components/WordList.svelte'
  import { celebrate } from '../lib/confetti'
  import { createTileDrag, type Origin, type TileDrag } from '../lib/drag.svelte'
  import { MIN_LEADERBOARD_SCORE, MIN_WORD_LENGTH, type Feedback, type GameController } from '../lib/game'
  import { shuffled, tilesOf, type Tile as TileData } from '../lib/letters'
  import { ms } from '../lib/motion'

  interface Props {
    game: GameController
    /** Called once the game is over (ended, or the last round ran out of time). */
    onend: () => void
    /** Go to the home screen; the game can be resumed from there. */
    onpause: () => void
  }

  let { game, onend, onpause }: Props = $props()

  const FEEDBACK_MS = 3000
  const BANNER_MS = 1600

  const s = $derived(game.state)
  const root = $derived(s.word ?? '')
  const rootLetters = $derived(tilesOf(root).map((tile) => tile.letter).join(''))
  const answers = $derived(s.word ? (s.words[s.word] ?? []) : [])
  const lastRound = $derived(s.round >= s.rounds_limit)

  // The rack's tiles follow the round's word; shuffling reorders them until it changes.
  let tiles = $derived(tilesOf(root))
  const inOrder = $derived(tiles.every((tile, i) => tile.id === i))
  // The word in the tray, as tile ids in order. Resets when the round's word changes.
  let picked = $derived.by((): number[] => {
    void root
    return []
  })
  const byId = $derived(new Map(tiles.map((tile) => [tile.id, tile])))
  const answer = $derived(picked.map((id) => byId.get(id)!))
  const word = $derived(answer.map((tile) => tile.letter).join(''))

  /** Keep the tray's letters after submitting, instead of clearing it. */
  let keep = $state(false)
  let feedback = $state<(Feedback & { id: number }) | null>(null)
  let latest = $state<string | null>(null)
  let shake = $state(0)
  let skipArmed = $state(false)
  let menuOpen = $state(false)
  let banner = $state<number | null>(null)

  // ── Drag and drop ────────────────────────────────────────────────────────
  let trayElement = $state<HTMLElement>()
  const drag = createTileDrag({ tray: () => trayElement, drop })
  const dragged = $derived(drag.current)
  // A tile dragged out of the tray leaves it; one dragged from the rack leaves an empty slot.
  const trayTiles = $derived(dragged?.from === 'tray' ? answer.filter((tile) => tile.id !== dragged.id) : answer)
  const emptySlots = $derived(dragged?.from === 'rack' ? [...picked, dragged.id] : picked)

  function startDrag(event: PointerEvent, tile: TileData, from: Origin) {
    if (!game.busy) drag.start(event, tile.id, tile.letter, from)
  }

  function drop(done: TileDrag) {
    if (game.busy) return
    if (done.from === 'rack') fresh()
    else rejected = false // rearranging a rejected word keeps it
    const rest = picked.filter((id) => id !== done.id)
    if (done.index < 0) {
      if (done.from === 'tray') picked = rest // dragged off the tray: removed
      return
    }
    const at = Math.min(done.index, rest.length)
    picked = [...rest.slice(0, at), done.id, ...rest.slice(at)]
  }

  // ── Timers ───────────────────────────────────────────────────────────────
  const timers = new Set<ReturnType<typeof setTimeout>>()
  function later(fn: () => void, delay: number) {
    const timer = setTimeout(() => {
      timers.delete(timer)
      fn()
    }, delay)
    timers.add(timer)
    return timer
  }

  onMount(() => {
    // Back on the game screen: if the round ran out meanwhile, the game moves on.
    game.resume().then((message) => message && say(message))
  })

  onDestroy(() => {
    timers.forEach(clearTimeout)
    game.pause()
  })

  // Announce each new round.
  let seenRound = 0
  $effect(() => {
    const round = s.round
    if (seenRound && round !== seenRound) {
      banner = round
      latest = null
      skipArmed = false
      later(() => (banner = null), BANNER_MS)
    }
    seenRound = round
  })

  $effect(() => {
    if (!s.status) onend()
  })

  // ── Building the word ────────────────────────────────────────────────────
  // After a rejected word its tiles stay up while the tray shakes; the next
  // letter from the rack (or the timeout in submit) starts a fresh word.
  let rejected = false
  function fresh() {
    if (rejected) {
      rejected = false
      picked = []
    }
  }

  function pick(id: number) {
    if (game.busy || drag.justEnded) return
    if (picked.includes(id)) return remove(id)
    fresh()
    picked = [...picked, id]
  }

  function remove(id: number) {
    if (game.busy || drag.justEnded) return
    rejected = false
    picked = picked.filter((p) => p !== id)
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
    rejected = false
    picked = picked.slice(0, -1)
  }

  function clear() {
    rejected = false
    picked = []
  }

  const shuffle = () => (tiles = shuffled(tiles))
  const restore = () => (tiles = [...tiles].sort((a, b) => a.id - b.id))

  function toggleKeep() {
    keep = !keep
    say({ tone: 'info', text: keep ? 'Letters stay in the tray after you submit' : 'The tray clears after you submit' })
  }

  let hideFeedback: ReturnType<typeof setTimeout> | undefined
  function say(next: Feedback) {
    feedback = { ...next, id: (feedback?.id ?? 0) + 1 }
    clearTimeout(hideFeedback)
    hideFeedback = later(() => (feedback = null), FEEDBACK_MS)
  }

  /** Checks that need no server: too short, the round's own word, or already played. */
  function precheck(candidate: string): Feedback | null {
    if (candidate.length < MIN_WORD_LENGTH)
      return { tone: 'info', text: `Words need at least ${MIN_WORD_LENGTH} letters` }
    if (candidate === rootLetters) return { tone: 'info', text: "That's this round's word. Make new ones from it!" }
    const earlier = answers.find(([played]) => played === candidate)
    if (earlier)
      return { tone: 'info', text: earlier[1] ? `You already found “${candidate}”` : `You already tried “${candidate}”` }
    return null
  }

  async function submit() {
    if (!word || game.busy || rejected) return
    const sent = word
    const blocked = precheck(sent)
    if (blocked) {
      say(blocked)
      shake++
      if (answers.some(([played, valid]) => valid && played === sent)) latest = sent
      return
    }
    const result = await game.submit(sent) // letter input pauses while this is in flight
    say(result)
    if (result.tone === 'good' || result.tone === 'great') {
      latest = sent
      if (result.tone === 'great') celebrate()
      if (!keep) clear()
    } else {
      shake++
      if (!keep) {
        rejected = true
        later(fresh, 450)
      }
    }
  }

  // ── Skipping and the menu ────────────────────────────────────────────────
  let disarm: ReturnType<typeof setTimeout> | undefined
  async function skip() {
    if (lastRound) return say({ tone: 'info', text: 'This is the last round: there is no next word' })
    if (game.busy) return
    // A skip costs the round, so it takes a second press to confirm.
    if (!skipArmed) {
      skipArmed = true
      disarm = later(() => (skipArmed = false), 2500)
      return
    }
    clearTimeout(disarm)
    skipArmed = false
    await game.skip()
  }

  function leave() {
    menuOpen = false
    onpause()
  }

  async function end() {
    menuOpen = false
    await game.quit()
  }

  function onkeydown(event: KeyboardEvent) {
    if (event.metaKey || event.ctrlKey || event.altKey || menuOpen) return
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
    } else if (key === 'Tab' && !event.shiftKey) {
      event.preventDefault()
      skip()
    } else if (key === 'CapsLock') {
      toggleKeep()
    } else if (key.length === 1 && /\p{L}/u.test(key)) {
      pickLetter(key.toLowerCase())
    }
  }
</script>

<svelte:window {onkeydown} />

<div class="game">
  <header class="top">
    <IconButton label="Pause or end the game" onclick={() => (menuOpen = true)}><Pause size="1.375rem" /></IconButton>
    <div class="round">
      <span>Round <strong>{s.round}</strong> of {s.rounds_limit}</span>
      <span class="round-bar"><span style:width="{(s.round / s.rounds_limit) * 100}%"></span></span>
    </div>
    <ThemeToggle />
  </header>

  <div class="board">
    <div class="stats">
      <Timer time={game.timeLeft} limit={s.time_limit} />
      <Button
        variant="secondary"
        size="sm"
        class="skip {skipArmed ? 'armed' : ''}"
        disabled={lastRound || game.busy}
        title={lastRound ? 'This is the last round' : 'Skip to the next word (Tab)'}
        onclick={skip}
      >
        <SkipForward size="1rem" />
        {skipArmed ? 'Tap again to skip' : 'Skip word'}
      </Button>
      <Score score={s.score} />
    </div>

    <div class="found">
      <WordList {answers} goal={s.rounds_limit} {latest} />
    </div>

    <div class="play">
      <div class="stage">
        {#if banner}
          <div class="banner" aria-hidden="true" in:scale={{ duration: ms(350), start: 0.6 }} out:fade={{ duration: ms(250) }}>
            <span>Round</span>
            <strong>{banner}</strong>
          </div>
        {/if}
        <FeedbackPill {feedback} />
      </div>
      <Tray
          tiles={trayTiles}
          {shake}
          target={!!dragged && dragged.index >= 0}
          onremove={remove}
          ondrag={(event, tile) => startDrag(event, tile, 'tray')}
          bind:element={trayElement}
        />
      <TileRack
        {tiles}
        used={emptySlots}
        onpick={pick}
        ondrag={(event, tile) => startDrag(event, tile, 'rack')}
      />

      <div class="controls">
        <div class="tools">
          <Button variant="ghost" size="sm" title="Shuffle the letters (Space)" onclick={shuffle}>
            <Shuffle size="1.125rem" /><span class="label">Shuffle</span>
          </Button>
          <Button variant="ghost" size="sm" title="Put the letters back in order" disabled={inOrder} onclick={restore}>
            <ListRestart size="1.125rem" /><span class="label">Restore</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            class={keep ? 'on' : ''}
            aria-pressed={keep}
            title="Keep the letters after submitting (Caps Lock)"
            onclick={toggleKeep}
          >
            <Pin size="1.125rem" /><span class="label">Keep</span>
          </Button>
        </div>
        <div class="actions">
          <IconButton variant="filled" label="Clear the word (Esc)" disabled={!picked.length} onclick={clear}>
            <Eraser size="1.375rem" />
          </IconButton>
          <Button size="lg" class="submit" disabled={!word || game.busy} onclick={submit}>Submit</Button>
          <IconButton variant="filled" label="Delete the last letter (Backspace)" disabled={!picked.length} onclick={undo}>
            <Delete size="1.375rem" />
          </IconButton>
        </div>
      </div>

      <p class="hints">
        Type letters · <kbd>Enter</kbd> submit · <kbd>⌫</kbd> delete · <kbd>Esc</kbd> clear · <kbd>Space</kbd> shuffle ·
        <kbd>Tab</kbd> skip · <kbd>Caps Lock</kbd> keep
      </p>
    </div>
  </div>

  {#if dragged}
    <div
      class="floating"
      style:left="{dragged.x}px"
      style:top="{dragged.y}px"
      style:--size="{dragged.size}px"
      aria-hidden="true"
    >
      <Tile letter={dragged.letter} lifted tabindex={-1} />
    </div>
    {#if dragged.caret}
      <span
        class="insert"
        style:left="{dragged.caret.x - 1.5}px"
        style:top="{dragged.caret.y}px"
        style:height="{dragged.caret.height}px"
        aria-hidden="true"
      ></span>
    {/if}
  {/if}

  <Dialog bind:open={menuOpen} title="Take a break?">
    <div class="note">
      <Clock size="1.25rem" />
      <p>
        <strong>The clock keeps running.</strong> Rounds are timed on the server, so they can't be paused. If time runs
        out while you're away, the next round starts when you come back.
      </p>
    </div>
    {#snippet actions()}
      <Button variant="secondary" onclick={() => (menuOpen = false)}>Keep playing</Button>
      <Button onclick={leave}>Go home</Button>
      <div class="span end">
        <Button variant="ghost" block onclick={end}>End game</Button>
        <p>
          {#if s.score >= MIN_LEADERBOARD_SCORE}
            Your {s.score} points go on the leaderboard.
          {:else}
            Scores under {MIN_LEADERBOARD_SCORE} aren't saved.
          {/if}
        </p>
      </div>
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

  .round {
    display: grid;
    justify-items: center;
    gap: 0.375rem;
    font-size: var(--text-sm);
    color: var(--text-2);
  }

  .round strong {
    color: var(--text);
  }

  .round-bar {
    width: 7rem;
    height: 0.25rem;
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
    grid-template-rows: auto minmax(6rem, 1fr) auto;
    gap: var(--space-3);
    width: 100%;
    max-width: 34rem;
    margin-inline: auto;
    padding: 0 max(env(safe-area-inset-right), var(--space-4)) 0 max(env(safe-area-inset-left), var(--space-4));
    overflow-y: auto; /* last resort on very short screens: Submit stays reachable */
  }

  .stats {
    grid-area: stats;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }

  .stats :global(.armed) {
    color: var(--warn);
    border-color: var(--warn);
    background: var(--warn-soft);
  }

  .found {
    grid-area: found;
    min-height: 0;
  }

  .play {
    grid-area: play;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .stage {
    position: relative;
  }

  /* The new round's number, front and centre above the tray, stacked over
     any message so both stay readable (a cleared round shows both). */
  .banner {
    position: absolute;
    left: 50%;
    bottom: calc(100% + var(--space-2));
    z-index: 5;
    display: flex;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-4) var(--space-8);
    border: 1px solid var(--line);
    border-radius: var(--radius-full);
    background: var(--surface);
    box-shadow: var(--shadow-lg);
    translate: -50% 0;
    white-space: nowrap;
    pointer-events: none;
  }

  .banner span {
    font-size: var(--text-lg);
    font-weight: 700;
    line-height: 1;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--accent);
  }

  .banner strong {
    font-size: 3.375rem;
    font-weight: 800;
    line-height: 1;
  }

  .controls {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .tools {
    display: flex;
    justify-content: center;
    gap: var(--space-1);
  }

  .tools :global(.on) {
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 12%, transparent);
  }

  .actions {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: var(--space-3);
  }

  .hints {
    display: none;
    margin-top: var(--space-1);
    font-size: var(--text-xs);
    line-height: 2;
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

  .floating {
    position: fixed;
    z-index: 40;
    pointer-events: none;
  }

  .insert {
    position: fixed;
    z-index: 39;
    width: 3px;
    border-radius: 2px;
    background: var(--accent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 25%, transparent);
    pointer-events: none;
  }

  .note {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--space-3);
    padding: var(--space-4);
    border-radius: var(--radius-md);
    background: var(--warn-soft);
    color: var(--text);
    font-size: var(--text-sm);
  }

  .note :global(svg) {
    color: var(--warn);
  }

  .note strong {
    color: var(--warn);
  }

  .end {
    display: grid;
    gap: var(--space-1);
    padding-top: var(--space-3);
    border-top: 1px solid var(--line);
    text-align: center;
  }

  .end :global(.btn) {
    color: var(--warn);
  }

  .end p {
    font-size: var(--text-xs);
    color: var(--text-3);
  }

  /* Tablets and desktops in landscape: words beside the board, which is
     centred vertically between the empty rows. */
  @media (min-width: 52rem) and (orientation: landscape) {
    .board {
      max-width: 66rem;
      grid-template-areas: '. found' 'stats found' 'play found' '. found';
      grid-template-columns: minmax(0, 1fr) minmax(16rem, 22rem);
      grid-template-rows: 1fr auto auto 1fr;
      column-gap: var(--space-10);
      row-gap: var(--space-4);
      padding-bottom: var(--space-4);
    }
  }

  /* Short portrait screens (e.g. 375×667): the message pill floats over the
     bottom edge of the words panel instead of taking a row of its own. */
  @media (max-height: 45rem) and (orientation: portrait) {
    .stage {
      z-index: 4;
      height: 0;
    }

    .stage :global(.slot) {
      position: absolute;
      inset: auto 0 var(--space-1);
    }

    .banner {
      bottom: 3rem;
    }
  }

  /* Short landscape screens (phones on their side): play area on the left,
     clock, score and words on the right, and one row of controls. */
  @media (max-height: 34rem) and (orientation: landscape) {
    .top {
      padding-block: var(--space-1) 0;
    }

    .board {
      max-width: none;
      grid-template-areas: 'play stats' 'play found';
      grid-template-columns: minmax(0, 1fr) minmax(15rem, 20rem);
      grid-template-rows: auto 1fr;
      column-gap: var(--space-6);
      overflow-y: auto;
    }

    .play {
      justify-content: safe center;
    }

    .controls {
      flex-direction: row;
      align-items: center;
    }

    .actions {
      flex: 1;
    }

    .tools :global(.label),
    .hints {
      display: none;
    }
  }
</style>
