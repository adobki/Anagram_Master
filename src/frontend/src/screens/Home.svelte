<script lang="ts">
  import ArrowRight from '@lucide/svelte/icons/arrow-right'
  import CircleQuestionMark from '@lucide/svelte/icons/circle-question-mark'
  import CircleStop from '@lucide/svelte/icons/circle-stop'
  import Clock from '@lucide/svelte/icons/clock'
  import LogOut from '@lucide/svelte/icons/log-out'
  import HistoryIcon from '@lucide/svelte/icons/rotate-ccw-clock'
  import Info from '@lucide/svelte/icons/info'
  import MessageSquare from '@lucide/svelte/icons/message-square'
  import Play from '@lucide/svelte/icons/play'
  import Plus from '@lucide/svelte/icons/plus'
  import WifiOff from '@lucide/svelte/icons/wifi-off'
  import Trophy from '@lucide/svelte/icons/trophy'
  import { onMount } from 'svelte'
  import { flip } from 'svelte/animate'
  import { cubicInOut } from 'svelte/easing'
  import logo from '../assets/logo.png'
  import Button from '../components/Button.svelte'
  import IconButton from '../components/IconButton.svelte'
  import Download from '@lucide/svelte/icons/download'
  import GraduationCap from '@lucide/svelte/icons/graduation-cap'
  import X from '@lucide/svelte/icons/x'
  import Dialog from '../components/Dialog.svelte'
  import QuickGuide from '../components/QuickGuide.svelte'
  import TextField from '../components/TextField.svelte'
  import ScreenBar from '../components/ScreenBar.svelte'
  import SettingsButton from '../components/SettingsButton.svelte'
  import type { GameState } from '../lib/api'
  import { fullscreen } from '../lib/fullscreen.svelte'
  import { MAX_ACTIVE } from '../lib/history.svelte'
  import { network } from '../lib/network.svelte'
  import { MIN_LEADERBOARD_SCORE } from '../lib/game'
  import { reducedMotion } from '../lib/motion'
  import { guide } from '../lib/guide.svelte'
  import { install } from '../lib/install.svelte'
  import { player } from '../lib/player.svelte'
  import { toasts } from '../lib/toast.svelte'

  interface Props {
    /** A game in progress that can be resumed, if any. */
    saved: GameState | null
    /** Whether the server has said yet if there is a saved game. */
    lookup?: 'loading' | 'ready' | 'failed'
    onretry?: () => void
    /** The best score on this device; 0 until a game has been played. */
    best?: number
    /** Seconds left in the saved game's round. Its clock keeps running. */
    timeLeft?: number
    /** Games have been played on this device, so History has something to show. */
    hasHistory?: boolean
    /** The saved game can be come back to once another is started (it has a resume token). */
    canReturn?: boolean
    onstart: (name: string) => void
    /** Ends the saved game (saving its score if it's 10+) and shows how it went. */
    onabandon: () => Promise<void>
    oncontinue: () => void
    onhistory: () => void
    ontutorial: () => void
    onleaderboard: () => void
    onhelp: () => void
    onabout: () => void
    onfeedback: () => void
  }

  let {
    saved,
    lookup = 'ready',
    onretry,
    best = 0,
    timeLeft = 0,
    hasHistory = false,
    canReturn = true,
    onstart,
    onabandon,
    oncontinue,
    onhistory,
    ontutorial,
    onleaderboard,
    onhelp,
    onabout,
    onfeedback,
  }: Props = $props()

  const clock = $derived(`${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}`)

  // After a few seconds of waiting, say why it may be slow (a sleeping server).
  let slow = $state(false)
  $effect(() => {
    slow = false
    if (lookup !== 'loading') return
    const timer = setTimeout(() => (slow = true), 4000)
    return () => clearTimeout(timer)
  })

  /** The New game dialog, shown over a game in progress. */
  let creating = $state(false)
  let confirming = $state(false)
  let ending = $state(false)
  async function abandon() {
    ending = true
    await onabandon()
    ending = false
    confirming = false
  }

  // The name is shared with Settings (lib/player.svelte.ts), which saves it as it's typed.
  let tried = $state(false)
  const error = $derived(tried && !player.valid ? 'Use at least 3 characters.' : undefined)

  function start(event: SubmitEvent) {
    event.preventDefault()
    tried = true
    if (!player.valid) return
    // The name is kept as it's typed. First, show the guide (once, or every time if the player wants it).
    if (guide.due) return void (showGuide = true)
    onstart(player.trimmed)
  }

  let showGuide = $state(false)
  /** However the guide is left, it counts as seen. */
  function leaveGuide(next: () => void) {
    guide.markSeen()
    showGuide = false
    next()
  }

  /**
   * Exit: leave full screen and close the window. A page can only close a window it opened (an installed app's
   * window usually counts); otherwise the browser refuses, and the player is told they can close it themselves.
   */
  async function exit() {
    await fullscreen.leave()
    window.close()
    setTimeout(() => toasts.show('You can close this window now.', 4000), 400)
  }

  /** Start a new game while another is running (it stays resumable from History). */
  function startAnyway() {
    tried = true
    if (!player.valid) return
    creating = false
    onstart(player.trimmed)
  }

  // Hero tiles spell MASTER, then glide into its anagrams (STREAM, TAMERS).
  const LETTERS = ['m', 'a', 's', 't', 'e', 'r']
  const ORDERS = [
    [0, 1, 2, 3, 4, 5],
    [2, 3, 5, 4, 1, 0],
    [3, 1, 0, 4, 5, 2],
  ]
  let step = $state(0)
  const order = $derived(ORDERS[step % ORDERS.length])
  onMount(() => {
    const timer = setInterval(() => {
      if (!reducedMotion()) step++
    }, 2800)
    return () => clearInterval(timer)
  })
</script>

<div class="screen">
  <ScreenBar>
    <IconButton label="Exit" onclick={exit}><LogOut size="1.25rem" /></IconButton>
    <SettingsButton />
  </ScreenBar>

  <main>
    <section class="hero">
      <div class="deco" aria-hidden="true">
        {#each order as id (id)}
          <span class="deco-tile" class:hot={id === 0} style:--i={id} animate:flip={{ duration: 700, easing: cubicInOut }}>
            {LETTERS[id]}
          </span>
        {/each}
      </div>
      <h1><img src={logo} alt="Anagram Master" width="580" height="150" /></h1>
      <p class="tagline">Twenty rounds, two minutes each.<br />How many words can you make?</p>
      {#if best}<p class="best"><Trophy size="1rem" /> Your best: <strong>{best}</strong></p>{/if}
    </section>

    {#if lookup === 'loading'}
      <section class="card wait" role="status" aria-live="polite">
        <span class="spinner" aria-hidden="true"></span>
        <p><strong>Checking for a saved game…</strong></p>
        {#if slow}<p class="sub">Still trying. The server may be waking up.</p>{/if}
      </section>
    {:else if lookup === 'failed' && !hasHistory}
      <section class="card wait" role="status" aria-live="polite">
        <WifiOff size="1.75rem" />
        <p><strong>{network.online ? "Can't reach the server" : "You're offline"}</strong></p>
        <p class="sub">We need to check for a saved game before you can start. We'll keep trying.</p>
        <div class="down-actions">
          <Button variant="secondary" onclick={onretry}>Try again</Button>
          <Button onclick={ontutorial}><GraduationCap size="1.125rem" /> Play the tutorial</Button>
        </div>
        <p class="sub">The tutorial works without a connection.</p>
      </section>
    {:else if saved}
      <section class="card resume" aria-label="Game in progress">
        <div class="resume-head">
          <div>
            <p class="eyebrow">Game in progress</p>
            <p class="who">{saved.name}</p>
            <p class="meta">Round {saved.round} of {saved.rounds_limit} · {saved.score} points</p>
          </div>
          <Button onclick={oncontinue}>Continue <ArrowRight size="1.125rem" /></Button>
        </div>
        <p class="running" class:out={!timeLeft} role="timer">
          <Clock size="1rem" />
          {#if timeLeft}
            <span>
              <strong>{clock}</strong> left in this round. The clock keeps running while you're away, so it's best to
              go back and finish the round first.
            </span>
          {:else}
            <span>Round {saved.round} completed. Continue to start the next round.</span>
          {/if}
        </p>
        <div class="tools">
          <Button variant="ghost" size="sm" onclick={() => (confirming = true)}><CircleStop size="1rem" /> End game</Button>
          <Button variant="secondary" size="sm" onclick={() => (creating = true)}><Plus size="1rem" /> New</Button>
          <Button variant="secondary" size="sm" disabled={!hasHistory} onclick={onhistory}>
            <HistoryIcon size="1rem" /> History
          </Button>
        </div>
      </section>
    {:else}
    <form class="card" onsubmit={start} novalidate>
      {#if lookup === 'failed'}
        <!-- Past games are stored on this device, so History still works; only starting or resuming needs the server. -->
        <div class="down" role="status" aria-live="polite">
          <WifiOff size="1.25rem" />
          <div>
            <p><strong>{network.online ? "Can't reach the server" : "You're offline"}</strong></p>
            <p class="sub">Playing needs a connection, but your History is right here. We'll keep trying.</p>
            <div class="down-actions">
              <Button variant="secondary" size="sm" onclick={onretry}>Try again</Button>
              <Button size="sm" type="button" onclick={ontutorial}><GraduationCap size="1rem" /> Play the tutorial</Button>
            </div>
          </div>
        </div>
      {/if}
      <TextField
        label="Your name"
        placeholder="e.g. Ada"
        maxlength={15}
        autocomplete="nickname"
        autocapitalize="words"
        enterkeyhint="go"
        spellcheck="false"
        bind:value={player.name}
        {error}
        disabled={lookup === 'failed'}
        hint="3–15 characters. It appears on the leaderboard."
      />
      <Button type="submit" size="lg" block disabled={lookup === 'failed'}>
        <Play size="1.25rem" />
        Start game
      </Button>
      <Button variant="ghost" block disabled={!hasHistory} onclick={onhistory}>
        <HistoryIcon size="1.125rem" /> History
      </Button>
    </form>
    {/if}

    {#if install.nudge}
      <aside class="install" aria-label="Install the app">
        <Download size="1.25rem" />
        <p>
          <strong>Play it as an app.</strong> Full screen, no browser bars, one tap from your home screen.
        </p>
        <Button size="sm" onclick={() => install.start()}>Install</Button>
        <IconButton label="Not now" onclick={() => install.snooze()}><X size="1.125rem" /></IconButton>
      </aside>
    {/if}
  </main>

  <QuickGuide
    bind:open={showGuide}
    onstart={() => leaveGuide(() => onstart(player.trimmed))}
    ontutorial={() => leaveGuide(ontutorial)}
    onhelp={() => leaveGuide(onhelp)}
  />

  {#if saved}
    <Dialog bind:open={confirming} title="End this game?">
      <p>
        You're on round {saved.round} of {saved.rounds_limit} with {saved.score}
        {saved.score === 1 ? 'point' : 'points'}. It can't be resumed once it's ended.
        {#if saved.score >= MIN_LEADERBOARD_SCORE}
          Your score goes on the leaderboard.
        {:else}
          Scores under {MIN_LEADERBOARD_SCORE} aren't saved.
        {/if}
      </p>
      {#snippet actions()}
        <Button variant="secondary" onclick={() => (confirming = false)}>Keep playing</Button>
        <Button disabled={ending} onclick={abandon}>End game</Button>
      {/snippet}
    </Dialog>

    <Dialog bind:open={creating} title="Start a new game?">
      <p class="advice">
        You still have a game in progress: round {saved.round} of {saved.rounds_limit}, {saved.score}
        {saved.score === 1 ? 'point' : 'points'}. Finish it first, so its score can reach the leaderboard.
        {#if canReturn}
          If you start another, you can come back to it from History (up to {MAX_ACTIVE} games at a time).
        {:else}
          It was started before History existed, so it can't be resumed once you start another.
        {/if}
      </p>
      <TextField
        label="Your name"
        maxlength={15}
        autocomplete="nickname"
        autocapitalize="words"
        enterkeyhint="go"
        spellcheck="false"
        bind:value={player.name}
        {error}
        hint="3–15 characters. It appears on the leaderboard."
        onkeydown={(event) => event.key === 'Enter' && startAnyway()}
      />
      {#snippet actions()}
        <Button variant="secondary" onclick={() => (creating = false)}>Keep my game</Button>
        <Button onclick={startAnyway}>Start anyway</Button>
      {/snippet}
    </Dialog>
  {/if}

  <footer>
    <Button variant="ghost" onclick={onleaderboard}><Trophy size="1.125rem" /> Leaderboard</Button>
    <Button variant="ghost" onclick={onhelp}><CircleQuestionMark size="1.125rem" /> How to play</Button>
    <Button variant="ghost" onclick={onfeedback}><MessageSquare size="1.125rem" /> Send feedback</Button>
    <Button variant="ghost" onclick={onabout}><Info size="1.125rem" /> About</Button>
  </footer>
</div>

<style>
  .wait {
    display: grid;
    justify-items: center;
    gap: var(--space-3);
    min-height: 13rem;
    align-content: center;
    text-align: center;
    color: var(--text-2);
  }

  .wait strong {
    color: var(--text);
  }

  .sub {
    font-size: var(--text-sm);
  }

  .down-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--space-2);
  }

  /* The notice inside the (blocked) form, when the server can't be reached but History is still there. */
  .down {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-md);
    background: var(--warn-soft);
    color: var(--text-2);
  }

  .down > :global(svg) {
    margin-top: 0.15rem;
    color: var(--warn);
  }

  .down strong {
    color: var(--text);
  }

  .down .down-actions {
    justify-content: flex-start;
    margin-top: var(--space-2);
  }

  .tools {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: var(--space-2);
  }

  .advice {
    margin-bottom: var(--space-3);
    padding: var(--space-3);
    border-radius: var(--radius-md);
    background: var(--warn-soft);
    font-size: var(--text-sm);
  }

  .spinner {
    width: 1.75rem;
    height: 1.75rem;
    border: 3px solid var(--surface-2);
    border-top-color: var(--accent, currentColor);
    border-radius: 50%;
    animation: spin 0.9s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Reduced motion, from the device or from Settings: a still dotted ring. */
  @media (prefers-reduced-motion: reduce) {
    :global(:root:not([data-motion='full'])) .spinner {
      animation: none;
      border-top-color: var(--surface-2);
      border-style: dotted;
    }
  }

  :global(:root[data-motion='reduced']) .spinner {
    animation: none;
    border-top-color: var(--surface-2);
    border-style: dotted;
  }


  main {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: var(--space-5);
    width: 100%;
    max-width: 26rem;
    margin: 0 auto;
    padding-block: var(--space-4) var(--space-6);
  }

  .hero {
    display: grid;
    justify-items: center;
    gap: var(--space-4);
    margin-bottom: var(--space-2);
    text-align: center;
  }

  /* Full width with a centred image: a percentage-width image in a shrink-to-fit heading can sit off-centre. */
  h1 {
    width: 100%;
  }

  h1 img {
    width: min(100%, 19rem);
    height: auto;
    margin-inline: auto;
  }

  .tagline {
    font-size: var(--text-lg);
    line-height: 1.45;
    color: var(--text-2);
  }

  .best {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-4);
    border-radius: var(--radius-full);
    background: var(--surface-2);
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--text-2);
  }

  .best :global(svg) {
    color: var(--warn);
  }

  .best strong {
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }

  .deco {
    display: flex;
    gap: var(--space-2);
    margin-bottom: var(--space-1);
  }

  .deco-tile {
    display: grid;
    place-items: center;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 0.65rem;
    background: linear-gradient(var(--tile-sheen), transparent) var(--tile);
    color: var(--tile-text);
    font-size: 1.15rem;
    font-weight: 700;
    text-transform: uppercase;
    box-shadow:
      0 3px 0 var(--tile-edge),
      var(--shadow-sm);
    rotate: calc((var(--i) - 2.5) * 3deg);
    animation: bob 3.2s ease-in-out infinite;
    animation-delay: calc(var(--i) * -0.55s);
  }

  .hot {
    background: var(--primary);
    color: var(--on-primary);
    box-shadow: 0 3px 0 color-mix(in srgb, var(--primary) 60%, black);
  }

  @keyframes bob {
    50% {
      translate: 0 -5px;
    }
  }

  .card {
    padding: var(--space-5);
    border: 1px solid var(--line);
    border-radius: var(--radius-xl);
    background: var(--surface);
    box-shadow: var(--shadow-md);
  }

  form {
    display: grid;
    gap: var(--space-2);
  }

  .resume {
    display: grid;
    gap: var(--space-4);
    border-color: color-mix(in srgb, var(--accent) 35%, var(--line));
  }

  .resume-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
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

  .running strong {
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }

  .running.out :global(svg) {
    color: var(--accent);
  }

  .eyebrow {
    font-size: var(--text-xs);
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--accent);
  }

  .who {
    margin-top: var(--space-1);
    font-size: var(--text-xl);
    font-weight: 700;
    line-height: 1.2;
  }

  .meta {
    font-size: var(--text-sm);
    color: var(--text-2);
  }

  footer {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--space-2);
  }

  .install {
    display: grid;
    grid-template-columns: auto 1fr auto auto;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-3) var(--space-3) var(--space-4);
    border: 1px solid var(--line);
    border-radius: var(--radius-xl);
    background: color-mix(in srgb, var(--accent) 6%, var(--surface));
    font-size: var(--text-sm);
    color: var(--text-2);
  }

  .install > :global(svg) {
    color: var(--accent);
  }

  .install strong {
    color: var(--text);
  }
</style>
