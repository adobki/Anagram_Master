<script lang="ts">
  import CircleQuestionMark from '@lucide/svelte/icons/circle-question-mark'
  import Clock from '@lucide/svelte/icons/clock'
  import Delete from '@lucide/svelte/icons/delete'
  import Eraser from '@lucide/svelte/icons/eraser'
  import ListRestart from '@lucide/svelte/icons/list-restart'
  import Eye from '@lucide/svelte/icons/eye'
  import Pause from '@lucide/svelte/icons/pause'
  import Pin from '@lucide/svelte/icons/pin'
  import SettingsIcon from '@lucide/svelte/icons/settings'
  import Shuffle from '@lucide/svelte/icons/shuffle'
  import SkipForward from '@lucide/svelte/icons/skip-forward'
  import { onDestroy, onMount, untrack } from 'svelte'
  import { fade, scale } from 'svelte/transition'
  import Button from '../components/Button.svelte'
  import Dialog from '../components/Dialog.svelte'
  import FeedbackPill from '../components/FeedbackPill.svelte'
  import IconButton from '../components/IconButton.svelte'
  import Score from '../components/Score.svelte'
  import SettingsButton from '../components/SettingsButton.svelte'
  import Tile from '../components/Tile.svelte'
  import TileRack from '../components/TileRack.svelte'
  import Timer from '../components/Timer.svelte'
  import Tray from '../components/Tray.svelte'
  import WordList from '../components/WordList.svelte'
  import { celebrate } from '../lib/confetti'
  import { createTileDrag, type Origin, type TileDrag } from '../lib/drag.svelte'
  import {
    MIN_LEADERBOARD_SCORE,
    MIN_WORD_LENGTH,
    recapText,
    type Feedback,
    type GameController,
    type Guide,
    type GuidePart,
  } from '../lib/game'
  import { holdScreen } from '../lib/awake'
  import { buzzBad, buzzCleared, buzzWarn } from '../lib/haptics'
  import { shuffled, tilesOf, type Tile as TileData } from '../lib/letters'
  import { ms } from '../lib/motion'
  import { sound } from '../lib/sound.svelte'
  import { settings } from '../lib/settings.svelte'
  import { ui } from '../lib/ui.svelte'

  interface Props {
    game: GameController
    /** Called once the game is over (ended, or the last round ran out of time). */
    onend: () => void
    /** Go to the home screen; the game can be resumed from there. */
    onpause: () => void
    /** Open How to play; the game can be resumed from there too. */
    onhelp: () => void
    /**
     * The "Take a break?" menu. 'button' means the player opened it; 'back'
     * means the device's back button did (App.svelte), so pressing back again
     * goes home.
     */
    menu: 'closed' | 'button' | 'back'
    /** The practice game: no skipping, and the menu talks about practice. */
    tutorial?: boolean
    /** The guided tutorial's restrictions: which parts work, which flash. */
    guide?: Guide
    /** The tutorial's "start again" (the menu offers it instead of Go home). */
    onreset?: () => void
    /** Which word list shows (Found or Missed); bindable for the tutorial. */
    wordTab?: 'found' | 'missed'
  }

  let { game, onend, onpause, onhelp, menu = $bindable(), tutorial = false, guide, onreset, wordTab = $bindable('found') }: Props = $props()

  /** A part works (always, outside the guided tutorial). */
  const on = (part: GuidePart) => !guide?.enabled || guide.enabled.has(part)
  /** A part is being pointed at. */
  const hot = (part: GuidePart) => !!guide?.focus.has(part)

  /** Empty the tray and put the letters back in order (the tutorial, when it steps back or starts again). */
  export function resetBoard() {
    picked = []
    tiles = tilesOf(root)
  }

  const FEEDBACK_MS = 3000
  /** Seconds the "time's up" countdown runs before the next round starts by itself. */
  const COUNTDOWN_S = 5
  /** Seconds into a round before Skip unlocks (unless the player turned that off). */
  const SKIP_COOLDOWN_S = 5
  const BANNER_MS = 1600
  const RECAP_MS = 2600 // longer when the banner also carries the last round's recap

  const s = $derived(game.state)
  const root = $derived(s.word ?? '')
  const rootLetters = $derived(tilesOf(root).map((tile) => tile.letter).join(''))
  const answers = $derived(s.word ? (s.words[s.word] ?? []) : [])
  const lastRound = $derived(s.round >= s.rounds_limit)
  /** A shortcut's name for a tooltip, unless the keyboard is off. */
  const key = (name: string) => (settings.keyboardOff ? '' : ` (${name})`)

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

  let feedback = $state<(Feedback & { id: number }) | null>(null)
  let latest = $state<string | null>(null)
  let shake = $state(0)
  let skipArmed = $state(false)

  // ── The end of a round ───────────────────────────────────────────────────
  // When a round's time runs out, the game waits (the server doesn't move on by itself). Depending on the
  // setting it counts down to the next round, starts it straight away, or waits for a tap. Nothing is lost
  // while it waits, so it is also a safe moment for a break.
  /** The player ended the round with Skip: the same panel as a time-up, with the clock still running. */
  let endedEarly = $state(false)
  const roundUp = $derived(s.status && !lastRound && (game.timeLeft <= 0 || endedEarly))
  /** What the round achieved, for the panel's one-line summary (the same wording as the new-round banner). */
  const summary = $derived(
    recapText({ round: s.round, words: answers.filter(([, valid]) => valid).length, points: game.roundPoints }),
  )
  /** The chime, countdown or straight-on advance have been started for this round end. */
  let announced = false
  /** Seconds left in the countdown, or null when it isn't running (waiting for a tap). */
  let upCount = $state<number | null>(null)
  /** The clock was seen running in this round, so it ran out while the player was here (not while they were away). */
  let sawClock = false
  let upTimer: ReturnType<typeof setInterval> | undefined
  let advancing = false
  /** The player hid the panel to look back over the round: the board shows, but a tap on the inputs brings it back. */
  let reviewing = $state(false)
  const panel = $derived(roundUp && !reviewing)
  /** The root word, in order, for the tray to show while the round is over. */
  const rootTiles = $derived(tilesOf(root))

  function review() {
    stopCountdown()
    reviewing = true
  }

  /** A tap outside the panel does what the player chose in Settings. */
  function tapOutside() {
    if (settings.roundTap === 'advance') void advance()
    else review()
  }

  async function advance() {
    if (advancing || !roundUp) return
    advancing = true
    stopCountdown()
    try {
      await game.skip()
    } finally {
      advancing = false
    }
  }

  function stopCountdown() {
    clearInterval(upTimer)
    upTimer = undefined
    upCount = null
  }

  function startCountdown() {
    upCount = COUNTDOWN_S
    upTimer = setInterval(() => {
      // The countdown waits while a menu or Settings is open on top of it.
      if (menu !== 'closed' || ui.settingsOpen || upCount === null) return
      upCount -= 1
      if (upCount <= 0) void advance()
    }, 1000)
  }

  $effect(() => {
    const up = roundUp
    const left = game.timeLeft
    untrack(() => {
      if (!up) {
        stopCountdown()
        reviewing = false
        announced = false
        if (left > 0) sawClock = true
        return
      }
      // Once per round end (the clock may still be ticking after an early end, which re-runs this).
      if (announced || advancing) return
      announced = true
      sound.roundup()
      if (settings.roundEnd === 'instant') void advance()
      else if (settings.roundEnd === 'countdown' && sawClock) startCountdown()
    })
  })
  // A new round starts a new clock.
  $effect(() => {
    void s.round
    untrack(() => {
      sawClock = game.timeLeft > 0
      endedEarly = false
    })
  })

  /** "Take a break": the countdown stops, and the overlay waits for a tap. */
  function takeBreak() {
    stopCountdown()
    menu = 'button'
  }

  /** The first seconds of a round, when Skip is locked (if the player kept that on). */
  const cooling = $derived(settings.skipCooldown && game.timeLeft > 0 && s.time_limit - game.timeLeft < SKIP_COOLDOWN_S)
  const coolLeft = $derived(Math.ceil(SKIP_COOLDOWN_S - (s.time_limit - game.timeLeft)))
  let banner = $state<number | null>(null)
  let recap = $state<string | null>(null)

  // ── Drag and drop ────────────────────────────────────────────────────────
  let trayElement = $state<HTMLElement>()
  const drag = createTileDrag({ tray: () => trayElement, drop })
  const dragged = $derived(drag.current)
  // A tile dragged out of the tray leaves it; one dragged from the rack leaves an empty slot.
  const trayTiles = $derived(dragged?.from === 'tray' ? answer.filter((tile) => tile.id !== dragged.id) : answer)
  const emptySlots = $derived(dragged?.from === 'rack' ? [...picked, dragged.id] : picked)

  function startDrag(event: PointerEvent, tile: TileData, from: Origin) {
    drag.start(event, tile.id, tile.letter, from)
  }

  function drop(done: TileDrag) {
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

  // The controller this screen was opened with. App may clear its `game`
  // before this component is destroyed, so keep our own reference.
  const controller = untrack(() => game)

  onMount(() => {
    // Back on the game screen: if the round ran out meanwhile, the game moves on.
    controller.resume().then((message) => message && say(message))
  })

  onDestroy(() => {
    timers.forEach(clearTimeout)
    controller.pause()
  })

  // Announce each new round.
  let seenRound = 0
  $effect(() => {
    const round = s.round
    if (seenRound && round !== seenRound) {
      const summary = untrack(() => game.lastRound)
      banner = round
      recap = summary ? recapText(summary) : null
      latest = null
      skipArmed = false
      later(() => (banner = null), recap ? RECAP_MS : BANNER_MS)
    }
    seenRound = round
  })

  // Countdown: a beep for each of the last ten seconds. It remembers the last
  // second it beeped for, so a clock resync can't beep twice.
  let beeped = 0
  $effect(() => {
    const time = game.timeLeft
    untrack(() => {
      if (time > 10 || time < 1) beeped = 0
      else if (time !== beeped && s.status) {
        beeped = time
        sound.countdown(time)
      }
    })
  })

  // Keep the phone's audio output awake, so the start of a word sound isn't lost.
  $effect(() => {
    if (settings.sound) return sound.hold()
  })

  // Keep the screen from sleeping while this screen is showing (if the player wants that).
  $effect(() => {
    if (settings.keepAwake) return holdScreen()
  })

  // One buzz as the clock ticks from 11 to 10. Resuming at 10 or less doesn't buzz.
  let lastTime = Infinity
  $effect(() => {
    const time = game.timeLeft
    untrack(() => {
      if (time === 10 && lastTime === 11) buzzWarn()
      lastTime = time
    })
  })

  $effect(() => {
    if (!s.status) onend()
  })

  // ── Building the word ────────────────────────────────────────────────────
  // Input stays live while a word is being checked, so the next one can be
  // typed straight away.
  function pick(id: number) {
    if (drag.justEnded) return
    if (picked.includes(id)) return remove(id)
    picked = [...picked, id]
  }

  function remove(id: number) {
    if (drag.justEnded) return
    picked = picked.filter((p) => p !== id)
  }

  function pickLetter(letter: string) {
    const tile = tiles.find((t) => t.letter === letter && !picked.includes(t.id))
    if (tile) picked = [...picked, tile.id]
    else shake++
  }

  /** Tapped a word in the list: put its letters in the tray, replacing what's there. */
  function useWord(word: string) {
    if (roundUp) {
      reviewing = false // reviewing: a tap on a word brings the panel back
      return
    }
    if (!on('found')) return
    const free = new Set(tiles.map((tile) => tile.id))
    const ids: number[] = []
    for (const letter of word) {
      const tile = tiles.find((t) => t.letter === letter && free.has(t.id))
      if (!tile) return
      free.delete(tile.id)
      ids.push(tile.id)
    }
    picked = ids
    guide?.onuse?.()
  }

  const undo = () => (picked = picked.slice(0, -1))
  const clear = () => (picked = [])
  const shuffle = () => {
    tiles = shuffled(tiles)
    guide?.onshuffle?.()
  }
  const restore = () => {
    tiles = [...tiles].sort((a, b) => a.id - b.id)
    guide?.onshuffle?.()
  }

  function toggleKeep() {
    settings.keepLetters = !settings.keepLetters
    say({
      tone: 'info',
      text: settings.keepLetters ? 'Letters stay in the tray after you submit' : 'The tray clears after you submit',
    })
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
    if (!word || game.busy || roundUp || !on('actions')) return
    const sent = word
    const blocked = precheck(sent)
    if (blocked) {
      say(blocked)
      shake++
      buzzBad()
      if (answers.some(([played, valid]) => valid && played === sent)) latest = sent
      return
    }
    if (!settings.keepLetters) clear() // cleared at once, so the next word can be typed while this one is checked
    const result = await game.submit(sent)
    say(result)
    if (result.tone === 'good' || result.tone === 'great') {
      latest = sent
      if (result.tone === 'great') {
        celebrate()
        buzzCleared()
        sound.cleared()
      } else sound.word(sent.length)
    } else {
      shake++
      buzzBad()
      if (result.tone === 'bad') sound.wrong() // a message like "already played" stays quiet
    }
  }

  // ── Skipping and the menu ────────────────────────────────────────────────
  let disarm: ReturnType<typeof setTimeout> | undefined
  async function skip() {
    if (tutorial) return
    if (lastRound) return say({ tone: 'info', text: 'This is the last round: there is no next word' })
    if (game.busy || roundUp) return
    if (cooling) return say({ tone: 'info', text: `Skip unlocks in ${coolLeft} s` })
    // A skip costs the round, so it takes a second press to confirm.
    if (settings.confirmSkip && !skipArmed) {
      skipArmed = true
      disarm = later(() => (skipArmed = false), 2500)
      return
    }
    clearTimeout(disarm)
    skipArmed = false
    // The round ends here (the panel offers the next one); the server only moves on when that is chosen.
    endedEarly = true
  }

  function leave() {
    menu = 'closed'
    onpause()
  }

  async function end() {
    menu = 'closed'
    await game.quit()
  }

  // Both close the menu first, so one tap later the player is back on the board.
  function help() {
    menu = 'closed'
    onhelp()
  }

  function openSettings() {
    menu = 'closed'
    ui.settingsOpen = true
  }

  function onkeydown(event: KeyboardEvent) {
    // Not with on-screen controls only, nor while a dialog is open (the pause menu, Settings): its own controls take the keys.
    if (event.metaKey || event.ctrlKey || event.altKey || settings.keyboardOff || document.querySelector('dialog[open]')) return
    if (event.target instanceof HTMLInputElement) return
    const { key } = event
    // A round that ran out waits for Enter or Space; nothing else does anything meanwhile.
    if (roundUp) {
      if (key === 'Enter' || key === ' ') {
        event.preventDefault()
        if (reviewing) reviewing = false
        else void advance()
      }
      return
    }
    // In the guided tutorial a key only works where its on-screen control does.
    if (key === 'Enter') {
      event.preventDefault()
      if (on('actions')) submit()
    } else if (key === 'Backspace') {
      event.preventDefault()
      if (on('tray')) undo()
    } else if (key === 'Escape') {
      if (on('tray')) clear()
    } else if (key === ' ') {
      event.preventDefault()
      if (on('shuffle')) shuffle()
    } else if (key === 'Tab' && !event.shiftKey) {
      event.preventDefault()
      skip()
    } else if (key === 'CapsLock') {
      if (on('keep')) toggleKeep()
    } else if (key.length === 1 && /\p{L}/u.test(key)) {
      if (on('rack')) pickLetter(key.toLowerCase())
    }
  }
</script>

<svelte:window {onkeydown} />

<div class="game">
  <header class="top">
    <IconButton label="Pause or end the game" onclick={() => (menu = 'button')}><Pause size="1.375rem" /></IconButton>
    <div class="round">
      <span>Round <strong>{s.round}</strong> of {s.rounds_limit}</span>
      <span class="round-bar"><span style:width="{(s.round / s.rounds_limit) * 100}%"></span></span>
    </div>
    <SettingsButton />
  </header>

  <div class="board">
    <div class="stats">
      <Timer time={game.timeLeft} limit={s.time_limit} />
      {#if tutorial}<span></span>{:else}<Button
        variant="secondary"
        size="sm"
        class="skip {skipArmed ? 'armed' : ''}"
        disabled={lastRound || game.busy || roundUp || cooling}
        title={lastRound
          ? 'This is the last round'
          : cooling
            ? `Skip unlocks in ${coolLeft} s`
            : `Skip to the next word${key('Tab')}`}
        onclick={skip}
      >
        <SkipForward size="1rem" />
        {skipArmed ? 'Tap again to end this round' : 'Skip word'}
      </Button>{/if}
      <Score score={s.score} />
    </div>

    <div class="found" class:guide-hot={hot('found')} class:guide-off={!on('found') && !on('tabs')} inert={!on('found') && !on('tabs')}>
      <WordList
        {answers}
        goal={s.rounds_limit}
        {latest}
        onuse={useWord}
        bind:tab={wordTab}
        locked={!on('found')}
        tabsLocked={!on('tabs')}
        flashTabs={hot('tabs')}
      />
    </div>

    <div class="play">
      <div class="stage">
        {#if banner}
          <div class="banner" aria-hidden="true" in:scale={{ duration: ms(350), start: 0.6 }} out:fade={{ duration: ms(250) }}>
            <div class="head">
              <span>Round</span>
              <strong>{banner}</strong>
            </div>
            {#if recap}<p class="recap">{recap}</p>{/if}
          </div>
        {/if}
        <FeedbackPill {feedback} />
      </div>
      <div class="inputs">
        <div class:guide-hot={hot('tray')} class:guide-off={!on('tray')} inert={!on('tray')}>
          <Tray
            tiles={panel ? rootTiles : roundUp ? [] : trayTiles}
          slide={roundUp}
            {shake}
            target={!!dragged && dragged.index >= 0}
            onremove={roundUp ? () => {} : remove}
            ondrag={(event, tile) => startDrag(event, tile, 'tray')}
            bind:element={trayElement}
          />
        </div>
        <div class="lower">
          <div class:guide-hot={hot('rack')} class:guide-off={!on('rack')} inert={!on('rack')}>
            <TileRack
              {tiles}
              used={emptySlots}
              onpick={pick}
              ondrag={(event, tile) => startDrag(event, tile, 'rack')}
            />
          </div>

          <div class="controls">
            <div class="tools">
              <Button
                variant="ghost"
                size="sm"
                class={hot('shuffle') ? 'guide-hot' : ''}
                title={`Shuffle the letters${key('Space')}`}
                disabled={!on('shuffle')}
                onclick={shuffle}
              >
                <Shuffle size="1.125rem" /><span class="label">Shuffle</span>
              </Button>
              <Button variant="ghost" size="sm" title="Put the letters back in order" disabled={inOrder || !on('shuffle')} class={hot('shuffle') ? 'guide-hot' : ''} onclick={restore}>
                <ListRestart size="1.125rem" /><span class="label">Restore</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                class="{settings.keepLetters ? 'on' : ''} {hot('keep') ? 'guide-hot' : ''}"
                disabled={!on('keep')}
                aria-pressed={settings.keepLetters}
                title={`Keep the letters after submitting${key('Caps Lock')}`}
                onclick={toggleKeep}
              >
                <Pin size="1.125rem" /><span class="label">Keep</span>
              </Button>
            </div>
            <div class="actions" class:guide-hot={hot('actions')} class:guide-off={!on('actions')} inert={!on('actions')}>
              <IconButton variant="filled" label={`Clear the word${key('Esc')}`} disabled={!picked.length} onclick={clear}>
                <Eraser size="1.375rem" />
              </IconButton>
              <Button size="lg" class="submit" disabled={!word || game.busy} onclick={submit}>Submit</Button>
              <IconButton variant="filled" label={`Delete the last letter${key('Backspace')}`} disabled={!picked.length} onclick={undo}>
                <Delete size="1.375rem" />
              </IconButton>
            </div>
          </div>

          {#if !settings.keyboardOff}
            <p class="hints">
              Type letters · <kbd>Enter</kbd> submit · <kbd>⌫</kbd> delete · <kbd>Esc</kbd> clear · <kbd>Space</kbd> shuffle ·
              <kbd>Tab</kbd> skip · <kbd>Caps Lock</kbd> keep
            </p>
          {/if}

          {#if panel}
            <div class="roundup" role="group" aria-label="Round over" transition:fade={{ duration: ms(200) }}>
              <p class="eyebrow">{game.timeLeft > 0 ? 'Round ended' : "Time's up"}</p>
              <p class="summary">{summary}</p>
              <p class="count" aria-live="polite">
                {#if upCount !== null}Next round in <strong>{Math.max(upCount, 0)}</strong>{:else}Ready when you are{/if}
              </p>
              <Button onclick={advance}>Next round</Button>
              <div class="up-actions">
                <Button variant="secondary" size="sm" onclick={takeBreak}>Take a break</Button>
                <Button variant="secondary" size="sm" onclick={review}><Eye size="1rem" /> Review round</Button>
              </div>
            </div>
          {/if}
        </div>
        {#if reviewing}
          <button type="button" class="shield" aria-label="Round over: show the options to go on" onclick={() => (reviewing = false)}>
            <span>Round over · tap to continue</span>
          </button>
        {/if}
      </div>
    </div>

    {#if panel}
      <button type="button" class="catch" aria-label={settings.roundTap === 'advance' ? 'Start the next round' : 'Hide the panel to review the round'} onclick={tapOutside}></button>
    {/if}
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

  <!--
    Esc and the device's back button dismiss the menu. If the menu came from a
    back press, dismissing it with another one means "go home".
  -->
  <Dialog
    bind:open={() => menu !== 'closed', (open) => !open && (menu = 'closed')}
    oncancel={() => menu === 'back' && onpause()}
    title="Take a break?"
  >
    <div class="note">
      <Clock size="1.25rem" />
      {#if tutorial}
        <p>
          <strong>This is practice.</strong> There's no clock and nothing is saved. Restart goes back to the first step of
          the guide, and you can leave whenever you like.
        </p>
      {:else if roundUp}
        <p>
          <strong>This round is over,</strong> so this is a safe moment for a break. Nothing is lost: the next
          round starts when you come back and tap.
        </p>
      {:else}
        <p>
          <strong>The clock keeps running.</strong> Rounds can't be paused, to prevent cheating. It's best to take your
          break when the round ends. If time runs out while you're away, the next round simply waits for you.
        </p>
      {/if}
    </div>
    {#snippet actions()}
      <Button variant="secondary" onclick={() => (menu = 'closed')}>Keep playing</Button>
      {#if tutorial}
        <Button onclick={() => ((menu = 'closed'), onreset?.())}>Restart the tutorial</Button>
      {:else}
        <Button onclick={leave}>Go home</Button>
      {/if}
      <Button variant="ghost" size="sm" onclick={help}><CircleQuestionMark size="1.125rem" /> How to play</Button>
      <Button variant="ghost" size="sm" onclick={openSettings}><SettingsIcon size="1.125rem" /> Settings</Button>
      <div class="span end">
        <Button variant="ghost" block onclick={end}>{tutorial ? 'Leave the tutorial' : 'End game'}</Button>
        <p>
          {#if tutorial}
            Practice scores aren't kept.
          {:else if s.score >= MIN_LEADERBOARD_SCORE}
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
    height: var(--view-h, 100dvh);
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

  .inputs,
  .lower {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  /* The round-end panel sits over the letters, tools and Submit, with the board above it left alone. */
  .roundup {
    position: absolute;
    inset: 0;
    z-index: 22;
    display: grid;
    align-content: center;
    justify-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    border: 1px solid var(--line);
    border-radius: var(--radius-xl);
    background: var(--surface);
    box-shadow: var(--shadow-lg);
    text-align: center;
    overflow: auto;
  }

  .eyebrow {
    font-size: var(--text-xs);
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--accent);
  }

  .summary {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--text);
  }

  .count {
    color: var(--text-2);
  }

  .count strong {
    color: var(--text);
    font-size: var(--text-lg);
    font-variant-numeric: tabular-nums;
  }

  .up-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--space-2);
  }

  /* A tap outside the panel (setting): over the whole board, the word list included, under the panel only. */
  .catch {
    grid-area: 1 / 1 / -1 / -1;
    position: relative;
    z-index: 20;
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: pointer;
  }

  /* Reviewing: the inputs look normal, but a tap on any of them brings the panel back. */
  .shield {
    position: absolute;
    inset: 0;
    z-index: 20;
    display: grid;
    place-items: center;
    border: 0;
    background: transparent;
    cursor: pointer;
  }

  .shield span {
    padding: var(--space-1) var(--space-4);
    border: 1px solid var(--line);
    border-radius: var(--radius-full);
    background: var(--surface);
    box-shadow: var(--shadow-md);
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--text-2);
  }

  /* The new round's number, front and centre above the tray, stacked over
     any message so both stay readable (a cleared round shows both). */
  .banner {
    position: absolute;
    left: 50%;
    bottom: calc(100% + var(--space-2));
    z-index: 5;
    display: grid;
    justify-items: center;
    gap: var(--space-2);
    padding: var(--space-4) var(--space-8);
    border: 1px solid var(--line);
    border-radius: 2.5rem;
    background: var(--surface);
    box-shadow: var(--shadow-lg);
    translate: -50% 0;
    white-space: nowrap;
    pointer-events: none;
  }

  .banner .head {
    display: flex;
    align-items: center;
    gap: var(--space-4);
  }

  .banner .recap {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--text-2);
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
