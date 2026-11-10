<script lang="ts">
  import ArrowRight from '@lucide/svelte/icons/arrow-right'
  import CircleQuestionMark from '@lucide/svelte/icons/circle-question-mark'
  import Clock from '@lucide/svelte/icons/clock'
  import Info from '@lucide/svelte/icons/info'
  import Play from '@lucide/svelte/icons/play'
  import RotateCcw from '@lucide/svelte/icons/rotate-ccw'
  import Trophy from '@lucide/svelte/icons/trophy'
  import { onMount } from 'svelte'
  import { flip } from 'svelte/animate'
  import { cubicInOut } from 'svelte/easing'
  import { prefersReducedMotion } from 'svelte/motion'
  import logo from '../assets/logo.png'
  import Button from '../components/Button.svelte'
  import Dialog from '../components/Dialog.svelte'
  import TextField from '../components/TextField.svelte'
  import ThemeToggle from '../components/ThemeToggle.svelte'
  import type { GameState } from '../lib/api'
  import { MIN_LEADERBOARD_SCORE } from '../lib/game'
  import { loadName, saveName } from '../lib/player'

  interface Props {
    /** A game in progress that can be resumed, if any. */
    saved: GameState | null
    /** The best score on this device; 0 until a game has been played. */
    best?: number
    /** Seconds left in the saved game's round. Its clock keeps running. */
    timeLeft?: number
    onstart: (name: string) => void
    /** Ends the saved game (saving its score if it's 10+). */
    onabandon: () => Promise<void>
    oncontinue: () => void
    onleaderboard: () => void
    onhelp: () => void
    onabout: () => void
  }

  let { saved, best = 0, timeLeft = 0, onstart, onabandon, oncontinue, onleaderboard, onhelp, onabout }: Props = $props()

  const clock = $derived(`${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}`)

  let confirming = $state(false)
  let ending = $state(false)
  async function abandon() {
    ending = true
    await onabandon()
    ending = false
    confirming = false
  }

  let name = $state(loadName())
  let tried = $state(false)
  const trimmed = $derived(name.trim())
  const error = $derived(tried && trimmed.length < 3 ? 'Use at least 3 characters.' : undefined)

  function start(event: SubmitEvent) {
    event.preventDefault()
    tried = true
    if (trimmed.length < 3) return
    saveName(trimmed)
    onstart(trimmed)
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
      if (!prefersReducedMotion.current) step++
    }, 2800)
    return () => clearInterval(timer)
  })
</script>

<div class="screen">
  <header class="bar">
    <span></span>
    <ThemeToggle />
  </header>

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

    {#if saved}
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
            <span><strong>{clock}</strong> left in this round. The clock keeps running while you're away.</span>
          {:else}
            <span>This round's time is up. The next round starts when you continue.</span>
          {/if}
        </p>
        <Button variant="ghost" size="sm" block onclick={() => (confirming = true)}>
          <RotateCcw size="1rem" /> End this game and start over
        </Button>
      </section>
    {:else}
    <form class="card" onsubmit={start} novalidate>
      <TextField
        label="Your name"
        placeholder="e.g. Ada"
        maxlength={15}
        autocomplete="nickname"
        autocapitalize="words"
        enterkeyhint="go"
        spellcheck="false"
        bind:value={name}
        {error}
        hint="3–15 characters. It appears on the leaderboard."
      />
      <Button type="submit" size="lg" block>
        <Play size="1.25rem" />
        Start game
      </Button>
    </form>
    {/if}
  </main>

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
  {/if}

  <footer>
    <Button variant="ghost" onclick={onleaderboard}><Trophy size="1.125rem" /> Leaderboard</Button>
    <Button variant="ghost" onclick={onhelp}><CircleQuestionMark size="1.125rem" /> How to play</Button>
    <Button variant="ghost" onclick={onabout}><Info size="1.125rem" /> About</Button>
  </footer>
</div>

<style>
  .bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
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
</style>
