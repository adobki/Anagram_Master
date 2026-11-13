<script lang="ts">
  import ArrowLeft from '@lucide/svelte/icons/arrow-left'
  import Clock from '@lucide/svelte/icons/clock'
  import GraduationCap from '@lucide/svelte/icons/graduation-cap'
  import Hand from '@lucide/svelte/icons/hand'
  import Keyboard from '@lucide/svelte/icons/keyboard'
  import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard'
  import Sparkles from '@lucide/svelte/icons/sparkles'
  import Target from '@lucide/svelte/icons/target'
  import Trophy from '@lucide/svelte/icons/trophy'
  import Button from '../components/Button.svelte'
  import IconButton from '../components/IconButton.svelte'
  import InterfaceMap from '../components/InterfaceMap.svelte'
  import ScreenBar from '../components/ScreenBar.svelte'
  import SettingsButton from '../components/SettingsButton.svelte'
  import { touchFirst } from '../lib/device'
  import { MIN_LEADERBOARD_SCORE, MIN_WORD_LENGTH } from '../lib/game'
  import { settings } from '../lib/settings.svelte'

  interface Props {
    onback: () => void
    onplay: () => void
    /** Opens the practice game. */
    ontutorial: () => void
  }

  let { onback, onplay, ontutorial }: Props = $props()
</script>

<div class="screen">
  <ScreenBar>
    <IconButton label="Back" onclick={onback}><ArrowLeft size="1.25rem" /></IconButton>
    <h1>How to play</h1>
    <SettingsButton />
  </ScreenBar>

  <main>
    <section class="wide">
      <h2><Target size="1.25rem" /> The goal</h2>
      <p>
        Each round deals you a long word, the root word. Make as many words as you can from its letters, each letter used once, before
        the two-minute clock runs out. There are 20 rounds.
      </p>
      <p class="example">
        From <strong>MASTER</strong>: stream, tamers, mast, team, art, me…
      </p>
    </section>

    <section class="wide">
      <h2><LayoutDashboard size="1.25rem" /> The game screen</h2>
      <InterfaceMap />
    </section>

    <section class="try">
      <h2><GraduationCap size="1.25rem" /> Try it first</h2>
      <p>
        A short practice game with the real controls: no clock, nothing saved, and a coach beside you. You'll make words,
        reuse them, meet the bonus for using every letter, and finish by forming the rest on your own.
      </p>
      <Button variant="secondary" onclick={ontutorial}>Play the tutorial</Button>
    </section>

    <section>
      <h2><Sparkles size="1.25rem" /> Scoring</h2>
      <ul>
        <li><strong>Longer words score more:</strong> up to 10 points, by how much of the round's word they use.</li>
        <li><strong>+10</strong> for a word that uses every letter.</li>
        <li><strong>+50</strong> for finding 20 words in a round, which also ends the round: press Next round to go on.</li>
        <li><strong>−2</strong> for a word that isn't in the dictionary.</li>
        <li>Words need at least {MIN_WORD_LENGTH} letters. Repeats and the round's own word don't count, and don't cost you.</li>
      </ul>
    </section>

    <section>
      <h2><Hand size="1.25rem" /> Playing</h2>
      <ul>
        <li>Tap letters, or drag them into the tray in any order. Tap a tile in the tray to take it back.</li>
        <li><strong>Shuffle</strong> the letters for a fresh look; <strong>Restore</strong> puts them back.</li>
        <li><strong>Keep</strong> leaves your letters in the tray after you submit, to build on a word.</li>
        <li>
          <strong>Skip word</strong> ends the round at no cost and stops its clock, and the same panel as when time runs out lets you
          go on to the next one. It asks you to tap twice, unless you turn that off in Settings.
        </li>
      </ul>
    </section>

    <!-- With on-screen controls only: hidden on a phone or tablet, greyed out (and labelled) elsewhere. -->
    {#if !(settings.keyboardOff && touchFirst)}
      <section class="keys" class:off={settings.keyboardOff}>
        <h2><Keyboard size="1.25rem" /> Keyboard{settings.keyboardOff ? ' (disabled)' : ''}</h2>
        {#if settings.keyboardOff}<p class="off-note">Switched off by On-screen controls only, in Settings.</p>{/if}
        <dl>
          <div><dt>Letters</dt><dd>add to the tray</dd></div>
          <div><dt><kbd>Enter</kbd></dt><dd>submit</dd></div>
          <div><dt><kbd>Backspace</kbd></dt><dd>delete the last letter</dd></div>
          <div><dt><kbd>Esc</kbd></dt><dd>clear the tray</dd></div>
          <div><dt><kbd>Space</kbd></dt><dd>shuffle</dd></div>
          <div><dt><kbd>Tab</kbd> <kbd>Tab</kbd></dt><dd>skip the word</dd></div>
          <div><dt><kbd>Caps Lock</kbd></dt><dd>keep letters after submitting</dd></div>
        </dl>
      </section>
    {/if}

    <section>
      <h2><Clock size="1.25rem" /> The clock</h2>
      <p>
        The clock runs on the server, so it never stops during a round, even when you leave the game. That's to prevent
        cheating. A round ends when its time runs out, when you skip it, or when you find its 20th word, and the game
        never moves on behind your back: a panel shows how the round went, with a ten-second countdown to the next
        one. Press Next round to go on sooner, or tap the panel to stop the countdown and take your time (Settings can
        switch the countdown off altogether). That's a safe moment for a break, and the best time to leave. Press
        Review round, or tap outside the panel, to look back over the round's words before going on.
      </p>
    </section>

    <section>
      <h2><Trophy size="1.25rem" /> The leaderboard</h2>
      <p>
        End a game, or finish all 20 rounds, with {MIN_LEADERBOARD_SCORE} points or more and your score goes on the
        leaderboard.
      </p>
    </section>
  </main>

  <footer>
    <Button size="lg" block onclick={onplay}>Got it, let's play</Button>
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
    max-width: 34rem;
    margin: 0 auto;
  }

  main {
    flex: 1;
    display: grid;
    gap: var(--space-3);
    padding-block: var(--space-4) var(--space-6);
  }

  /* A computer or a wide window: two columns of cards, with the game screen map across both. */
  @media (min-width: 56rem) {
    main {
      max-width: 66rem;
      grid-template-columns: 1fr 1fr;
      align-items: start;
    }

    .wide {
      grid-column: 1 / -1;
    }
  }

  section {
    display: grid;
    gap: var(--space-3);
    padding: var(--space-5);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--surface);
    color: var(--text-2);
  }

  h2 {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-base);
    font-weight: 700;
    color: var(--text);
  }

  h2 :global(svg) {
    color: var(--accent);
  }

  strong {
    color: var(--text);
  }

  ul {
    display: grid;
    gap: var(--space-2);
    padding-left: var(--space-5);
  }

  .example {
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-md);
    background: var(--surface-2);
    font-size: var(--text-sm);
  }

  /* On-screen controls only, on a device that has a keyboard: shown, but greyed out. */
  .keys.off {
    opacity: 0.5;
  }

  .off-note {
    font-size: var(--text-sm);
    color: var(--text-2);
  }

  dl {
    display: grid;
    gap: var(--space-2);
    margin: 0;
  }

  dl div {
    display: grid;
    grid-template-columns: 9rem 1fr;
    gap: var(--space-3);
  }

  dt {
    font-weight: 600;
    color: var(--text);
  }

  dd {
    margin: 0;
  }

  kbd {
    padding: 0 0.35em;
    border: 1px solid var(--line);
    border-radius: 0.3rem;
    background: var(--surface-2);
    font: inherit;
    font-size: var(--text-sm);
  }

  footer {
    position: sticky;
    bottom: 0;
    z-index: 5; /* above the page content, below the top bar, toasts and dialogs */
    padding-top: var(--space-6);
    background: linear-gradient(transparent, var(--bg) 35%);
  }
</style>
