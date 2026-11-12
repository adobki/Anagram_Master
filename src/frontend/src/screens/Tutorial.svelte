<script lang="ts">
  import GraduationCap from '@lucide/svelte/icons/graduation-cap'
  import Lightbulb from '@lucide/svelte/icons/lightbulb'
  import { onDestroy, untrack } from 'svelte'
  import Button from '../components/Button.svelte'
  import Dialog from '../components/Dialog.svelte'
  import { createTutorialGame, TUTORIAL_GOAL, TUTORIAL_ROOT } from '../lib/tutorial-game.svelte'
  import Game from './Game.svelte'

  /**
   * The practice game: the real game screen on a local controller, with a coach card above it that follows
   * what the player does. Each step moves on by itself when the player has done what it asks (the two that
   * only point something out have a Next button). "Show me a word" suggests a random valid word nobody has
   * played yet, and picks differently each run, so practice rarely uses the same words twice.
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

  type Step = 'short' | 'reuse' | 'longer' | 'wrong' | 'perfect' | 'perfect2' | 'tips' | 'practice'
  const STEPS: Step[] = ['short', 'reuse', 'longer', 'wrong', 'perfect', 'perfect2', 'tips', 'practice']
  /** Steps that only point something out: they wait for Next. The rest move on when the player has done it. */
  const INFO: Step[] = ['reuse', 'tips']
  /** Which words a hint may suggest for a step (letters in the word). */
  const HINT_LENGTHS: Partial<Record<Step, number[]>> = { short: [2, 3], longer: [4, 5], perfect: [6], perfect2: [6] }

  let step = $state(0)
  const current = $derived(STEPS[step])
  let hint = $state<string | null>(null)
  let finished = $state(false)

  const sixes = $derived(game.found.filter((word) => word.length === TUTORIAL_ROOT.length).length)
  const done: Record<Step, () => boolean> = {
    short: () => game.found.length >= 1,
    reuse: () => false,
    longer: () => game.found.some((word) => word.length >= 4),
    wrong: () => game.missed.length >= 1,
    perfect: () => sixes >= 1,
    perfect2: () => sixes >= 2,
    tips: () => false,
    practice: () => false,
  }

  // Move on as soon as the player has done what the step asks (possibly several steps at once).
  $effect(() => {
    const id = STEPS[step]
    if (!INFO.includes(id) && done[id]() && step < STEPS.length - 1) step++
  })
  // A new step starts without the last hint.
  $effect(() => {
    void step
    untrack(() => (hint = null))
  })

  const remaining = $derived(Math.max(0, TUTORIAL_GOAL - game.found.length))

  function showWord() {
    hint = current === 'wrong' ? game.nonsense() : game.suggest(HINT_LENGTHS[current])
    if (!hint) hint = game.suggest()
  }

  const TEXT: Record<Step, string> = {
    short: 'Make a short word. Tap letters (or type) to fill the tray, then press Submit.',
    reuse: 'Nice! Now tap a word in the Found list: it goes back into the tray, handy for building on it. Try it, then press Next.',
    longer: 'Longer words score more. Make a word with four or five letters.',
    wrong: "A word that isn't in the dictionary costs 2 points. Make one up on purpose and Submit it, to see.",
    perfect: 'Use all six letters for a perfect anagram: +10 on top of the word. Can you find one?',
    perfect2: "There's more than one! Find a second perfect anagram.",
    tips: 'Two helpers: Shuffle mixes the letters up when you are stuck, and Keep leaves your word in the tray after you submit, so you can add to it. Press Next when you have had a look.',
    practice: '',
  }

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
    <p class="head"><GraduationCap size="1.125rem" /> <strong>Tutorial</strong> <span>practice, nothing is saved</span></p>
    {#if current === 'practice'}
      <p class="text">
        Over to you! Make {remaining} more {remaining === 1 ? 'word' : 'words'} from <strong>{TUTORIAL_ROOT.toUpperCase()}</strong>,
        any you like. Word {TUTORIAL_GOAL} clears the round with a +50 bonus.
      </p>
    {:else}
      <p class="text">{TEXT[current]}</p>
    {/if}
    {#if hint}<p class="hint"><Lightbulb size="1rem" /> Try “<strong>{hint}</strong>”</p>{/if}
    <div class="buttons">
      {#if INFO.includes(current)}<Button size="sm" onclick={() => step++}>Next</Button>{/if}
      <Button variant="secondary" size="sm" onclick={showWord}><Lightbulb size="1rem" /> Show me a word</Button>
      <Button variant="ghost" size="sm" onclick={onleave}>Skip tutorial</Button>
    </div>
  </aside>

  <Game {game} tutorial bind:menu onend={ended} onpause={onleave} {onhelp} />
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
    padding: var(--space-3) max(env(safe-area-inset-right), var(--space-4)) var(--space-3)
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

  .head span {
    margin-left: auto;
    font-size: var(--text-xs);
    color: var(--text-3);
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
