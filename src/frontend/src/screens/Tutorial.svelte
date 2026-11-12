<script lang="ts">
  import ChevronLeft from '@lucide/svelte/icons/chevron-left'
  import ChevronRight from '@lucide/svelte/icons/chevron-right'
  import GraduationCap from '@lucide/svelte/icons/graduation-cap'
  import Lightbulb from '@lucide/svelte/icons/lightbulb'
  import { onDestroy, untrack } from 'svelte'
  import Button from '../components/Button.svelte'
  import Dialog from '../components/Dialog.svelte'
  import type { Guide, GuidePart } from '../lib/game'
  import { settings } from '../lib/settings.svelte'
  import {
    createTutorialGame,
    isTutorialWord,
    TUTORIAL_GOAL,
    TUTORIAL_ROOT,
    type Rejection,
    type Snapshot,
  } from '../lib/tutorial-game.svelte'
  import Game from './Game.svelte'

  /**
   * The practice game: the real game screen on a local controller, with a coach card above it. It is a guided tour
   * first: ten steps, each one lighting up (a flashing outline) the part to use while the rest of the screen is
   * greyed out and switched off, and a word that isn't what the step asks for is refused like a wrong word. Doing
   * what a step asks moves on by itself (a few steps wait for Next so the coach can explain). Skip does the task
   * for the player and moves on; Previous steps back and restores the game as it was. After the tour comes
   * Practice, where everything is open and the player makes the rest of the 20 words. Free play opens everything
   * at any time.
   */
  interface Props {
    /** Leave without finishing. */
    onleave: () => void
    /** Finished: go and play for real. */
    onfinish: () => void
    /** Back to How to play. */
    onhelp: () => void
  }

  let { onleave, onfinish, onhelp }: Props = $props()

  const game = createTutorialGame()
  let menu = $state<'closed' | 'button' | 'back'>('closed')
  let board = $state<ReturnType<typeof Game>>()
  let tab = $state<'found' | 'missed'>('found')

  // The tutorial turns Keep on in one step; the player's own choice comes back afterwards.
  const userKeep = settings.keepLetters
  onDestroy(() => {
    if (settings.keepLetters !== userKeep) settings.keepLetters = userKeep
  })

  // ── The steps ────────────────────────────────────────────────────────────
  type Progress = false | 'hold' | 'advance'
  interface Step {
    /** What the coach says. */
    text: string
    /** Said once the step is done and it waits for Next. */
    after?: string
    /** The parts that work (and flash, unless `focus` says otherwise). */
    parts: () => GuidePart[]
    focus?: () => GuidePart[]
    /** What still works while the step waits for Next. */
    holdParts?: GuidePart[]
    /** Refuse any word but the one the step asks for. */
    gate?: (word: string) => Rejection | null
    /** Hints: random valid words of these lengths ('nonsense' for a made-up word, null for no hints). */
    hint: number[] | 'nonsense' | null
    /** Done yet? 'advance' moves on at once, 'hold' waits for Next. */
    progress: () => Progress
    /** Skip: put the game where a player who did the task would have it. */
    fulfil: () => void
  }

  const real = (word: string) => isTutorialWord(word)
  const lettersOf = (lo: number, hi: number) => (lo === hi ? `${lo}` : `${lo} or ${hi}`)
  /** Only a real word of this length is accepted. */
  const lengthGate = (lo: number, hi: number) => (word: string) =>
    real(word) && word.length >= lo && word.length <= hi
      ? null
      : { text: `Not for this step: make a real word of ${lettersOf(lo, hi)} letters` }

  let step = $state(0)
  let hold = $state(false)
  let free = $state(false)
  let hint = $state<string | null>(null)
  let tapped = $state(false)
  let shuffled = $state(0)
  let base = $state({ found: 0, missed: 0 })
  let finished = $state(false)
  /** The game as each step began, so Previous can put it back. */
  const snaps: { game: Snapshot; keep: boolean; tab: 'found' | 'missed' }[] = []

  const foundMore = () => game.found.length > base.found
  const ALL: GuidePart[] = ['rack', 'tray', 'actions']

  const STEPS: Step[] = [
    {
      text: 'Make a short word of two or three letters. Tap letters (or type) to fill the tray, then press Submit.',
      parts: () => ALL,
      gate: lengthGate(2, 3),
      hint: [2, 3],
      progress: () => foundMore() && 'advance',
      fulfil: () => game.inject(game.suggest([2, 3]) ?? 'am', true),
    },
    {
      text: 'Nice! Now tap your word in the Found list: it goes back into the tray, handy for building on a word or fixing a typo. (You could also edit it and submit another real word.)',
      after: 'There it is in the tray again. Add letters to make a longer word, or just press Next.',
      parts: () => ['found', 'tray', 'actions'],
      focus: () => ['found'],
      holdParts: ['found', 'tray', 'actions'],
      gate: (word) => (real(word) ? null : { text: 'Not a real word. Tap a word in the Found list, or press Skip' }),
      hint: null,
      progress: () => (foundMore() ? 'advance' : tapped ? 'hold' : false),
      fulfil: () => {},
    },
    {
      text: 'Longer words score more. Make a word with four or five letters.',
      parts: () => ALL,
      gate: lengthGate(4, 5),
      hint: [4, 5],
      progress: () => foundMore() && 'advance',
      fulfil: () => game.inject(game.suggest([4, 5]) ?? 'stem', true),
    },
    {
      text: "A word that isn't in the dictionary costs 2 points. Make one up on purpose and press Submit, to see.",
      parts: () => ALL,
      gate: (word) =>
        real(word) ? { text: "That one is a real word! Make one up that isn't in the dictionary", penalty: false } : null,
      hint: 'nonsense',
      progress: () => game.missed.length > base.missed && 'advance',
      fulfil: () => game.inject(game.nonsense(), false),
    },
    {
      text: 'That word went to the Missed tab. Open it to take a look.',
      parts: () => ['tabs'],
      hint: null,
      progress: () => tab === 'missed' && 'advance',
      fulfil: () => (tab = 'missed'),
    },
    {
      text: 'There it is. Missed words stay there so you can see what went wrong. Now switch back to the Found tab.',
      parts: () => ['tabs'],
      hint: null,
      progress: () => tab === 'found' && 'advance',
      fulfil: () => (tab = 'found'),
    },
    {
      text: 'Use all six letters for a perfect anagram: +10 on top of the word. Can you find one?',
      after: 'Perfect! Every letter used earns the +10. There is more than one, as you will see.',
      parts: () => ALL,
      gate: lengthGate(6, 6),
      hint: [6],
      progress: () => foundMore() && 'hold',
      fulfil: () => game.inject(game.suggest([6]) ?? 'stream', true),
    },
    {
      text: 'Find a second, different perfect anagram.',
      parts: () => ALL,
      gate: lengthGate(6, 6),
      hint: [6],
      progress: () => foundMore() && 'advance',
      fulfil: () => game.inject(game.suggest([6]) ?? 'tamers', true),
    },
    {
      text: 'Stuck? Shuffle mixes the letters up, and Restore puts them back in order. Click them a few times to see. Submit is off for now; press Next when you are done.',
      parts: () => ['shuffle'],
      holdParts: ['shuffle'],
      hint: null,
      progress: () => shuffled >= 1 && 'hold',
      fulfil: () => {},
    },
    {
      text: 'Keep leaves your word in the tray after you submit, so you can build on it. Turn Keep on, then submit one word.',
      after: 'See how the word stayed in the tray? Handy for building longer ones. That is everything: the rest is yours.',
      parts: () => (settings.keepLetters ? ALL : ['keep']),
      gate: (word) =>
        !settings.keepLetters
          ? { text: 'Turn Keep on first', penalty: false }
          : real(word)
            ? null
            : { text: 'Not a real word. Make one from the letters' },
      hint: [2, 3, 4, 5],
      progress: () => settings.keepLetters && foundMore() && 'hold',
      fulfil: () => {
        settings.keepLetters = true
        game.inject(game.suggest([2, 3, 4, 5]) ?? 'am', true)
      },
    },
  ]
  const GUIDED = STEPS.length
  const practice = $derived(step >= GUIDED)
  const def = $derived(STEPS[step] as Step | undefined)
  const unrestricted = $derived(free || practice)

  // What the game screen is told: which parts work and which flash.
  const guide: Guide = $derived({
    enabled: unrestricted || !def ? null : new Set(hold ? (def.holdParts ?? []) : def.parts()),
    focus: unrestricted || hold || !def ? new Set() : new Set((def.focus ?? def.parts)()),
    onuse: () => (tapped = true),
    onshuffle: () => shuffled++,
  })

  // Refuse words the step doesn't ask for.
  $effect(() => {
    game.gate = unrestricted || !def ? null : (def.gate ?? null)
  })

  // Move on as soon as the player has done what the step asks.
  $effect(() => {
    if (free || finished || !def) return
    const result = def.progress()
    untrack(() => {
      if (result === 'advance') enter(step + 1)
      else if (result === 'hold' && !hold) hold = true
    })
  })

  function enter(index: number) {
    step = index
    hold = false
    hint = null
    tapped = false
    shuffled = 0
    base = { found: game.found.length, missed: game.missed.length }
    snaps[index] = { game: game.snapshot(), keep: settings.keepLetters, tab }
  }
  // The opening state, for Previous on the first move and Restart.
  untrack(() => enter(0))

  /** Skip does what the step asks (if it isn't done yet) and moves on; Next, once it is done, just moves on. */
  function forward() {
    if (def && !hold) def.fulfil()
    enter(step + 1)
  }

  function putBack(index: number) {
    const snap = snaps[index]
    game.restore(snap.game)
    settings.keepLetters = snap.keep
    tab = snap.tab
    board?.resetBoard()
  }

  function back() {
    putBack(step - 1)
    enter(step - 1)
  }

  function freePlay() {
    free = true
    hint = null
  }

  /** Back to the guide at the step the player was on, with the game as it was then. */
  function backToGuide() {
    free = false
    putBack(step)
    enter(step)
  }

  /** The pause menu's Restart: the first step, a clean board, guided again even if Free play was on. */
  function restart() {
    free = false
    game.reset()
    settings.keepLetters = userKeep
    tab = 'found'
    board?.resetBoard()
    enter(0)
  }

  // ── Hints ────────────────────────────────────────────────────────────────
  // "Show me a word" is only for when a word is wanted, and gives one at a time: it stays off until that exact word
  // has been submitted (or the step changes), so it can't be used to browse the whole word list.
  const wantsWord = $derived(unrestricted || (!!def && !hold && def.hint !== null && (step !== 9 || settings.keepLetters)))
  const canHint = $derived(wantsWord && !finished && !hint)

  function showWord() {
    if (!canHint) return
    const kind = unrestricted ? undefined : def?.hint
    hint = kind === 'nonsense' ? game.nonsense() : (game.suggest(kind ?? undefined) ?? game.suggest())
  }

  // Once the player submits the suggested word, the hint is done with.
  $effect(() => {
    if (hint && game.lastWord === hint) untrack(() => (hint = null))
  })

  const remaining = $derived(Math.max(0, TUTORIAL_GOAL - game.found.length))
  const label = $derived(free ? 'Free play' : practice ? 'Your turn' : `Step ${step + 1} of ${GUIDED}`)

  let finishTimer: ReturnType<typeof setTimeout> | undefined
  /** The game ended: with all 20 words that is the tutorial complete (after the confetti), otherwise the player left. */
  function ended() {
    if (game.found.length >= TUTORIAL_GOAL) finishTimer = setTimeout(() => (finished = true), 2200)
    else onleave()
  }
  onDestroy(() => clearTimeout(finishTimer))
</script>

<div class="tutorial">
  <aside class="coach" aria-live="polite">
    <p class="head">
      <GraduationCap size="1.125rem" /> <strong>Tutorial</strong>
      {#if free}
        <Button variant="ghost" size="sm" class="mode" onclick={backToGuide}>Back to the guide</Button>
      {:else if !practice}
        <Button variant="ghost" size="sm" class="mode" onclick={freePlay}>Free play</Button>
      {/if}
      <span class="step">{label}</span>
    </p>
    {#if free}
      <p class="text">
        Free play: everything is open, so make words however you like. {remaining} more
        {remaining === 1 ? 'word' : 'words'} from <strong>{TUTORIAL_ROOT.toUpperCase()}</strong> to clear the round with a +50
        bonus.
      </p>
    {:else if practice}
      <p class="text">
        Over to you! Make {remaining} more {remaining === 1 ? 'word' : 'words'} from <strong>{TUTORIAL_ROOT.toUpperCase()}</strong>,
        any you like. Word {TUTORIAL_GOAL} clears the round with a +50 bonus.
      </p>
    {:else if def}
      <p class="text">{hold && def.after ? def.after : def.text}</p>
    {/if}
    {#if hint}<p class="hint"><Lightbulb size="1rem" /> Try “<strong>{hint}</strong>”</p>{/if}
    <div class="buttons">
      {#if !free && step > 0}
        <Button variant="secondary" size="sm" onclick={back}><ChevronLeft size="1rem" /> Previous</Button>
      {/if}
      {#if !free && !practice}
        <Button variant={hold ? 'primary' : 'secondary'} size="sm" onclick={forward}>
          {hold ? 'Next' : 'Skip'} <ChevronRight size="1rem" />
        </Button>
      {/if}
      <Button variant="secondary" size="sm" disabled={!canHint} onclick={showWord}>
        <Lightbulb size="1rem" /> Show me a word
      </Button>
    </div>
  </aside>

  <Game
    bind:this={board}
    {game}
    tutorial
    {guide}
    onreset={restart}
    bind:wordTab={tab}
    bind:menu
    onend={ended}
    onpause={onleave}
    {onhelp}
  />
</div>

<Dialog bind:open={finished} title="You've got it!" oncancel={onhelp}>
  <p>
    That's all {TUTORIAL_GOAL} words and the +50 round bonus. A real game is twenty rounds like that, two minutes each.
    Go and play for real!
  </p>
  {#snippet actions()}
    <Button variant="secondary" onclick={onhelp}>Back to How to play</Button>
    <Button onclick={onfinish}>Start a real game</Button>
  {/snippet}
</Dialog>

<style>
  .tutorial {
    display: flex;
    flex-direction: column;
    height: var(--view-h, 100dvh);
  }

  /* The real game fills what the coach leaves. */
  .tutorial :global(.game) {
    flex: 1;
    min-height: 0;
    height: auto;
  }

  .coach {
    display: grid;
    gap: var(--space-2);
    padding: var(--space-2) max(env(safe-area-inset-right), var(--space-4)) var(--space-2)
      max(env(safe-area-inset-left), var(--space-4));
    border-bottom: 1px solid var(--line);
    background: color-mix(in srgb, var(--accent) 7%, var(--surface));
    font-size: var(--text-sm);
  }

  .head {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--accent);
  }

  .head strong {
    margin-right: auto;
  }

  .head :global(.mode) {
    min-height: 0;
    padding: 0 var(--space-3);
    height: 1.75rem;
    font-size: var(--text-xs);
  }

  .head .step {
    font-size: var(--text-sm);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: var(--text);
  }

  .text {
    line-height: 1.4;
    color: var(--text);
  }

  .hint {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--text-2);
  }

  .hint strong {
    color: var(--text);
  }

  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
</style>
