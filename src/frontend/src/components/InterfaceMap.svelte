<script lang="ts">
  import Delete from '@lucide/svelte/icons/delete'
  import Eraser from '@lucide/svelte/icons/eraser'
  import ListRestart from '@lucide/svelte/icons/list-restart'
  import Pause from '@lucide/svelte/icons/pause'
  import Pin from '@lucide/svelte/icons/pin'
  import SettingsIcon from '@lucide/svelte/icons/settings'
  import Shuffle from '@lucide/svelte/icons/shuffle'
  import SkipForward from '@lucide/svelte/icons/skip-forward'
  import type { Answer } from '../lib/api'
  import { tilesOf } from '../lib/letters'
  import { settings } from '../lib/settings.svelte'
  import Button from './Button.svelte'
  import IconButton from './IconButton.svelte'
  import Score from './Score.svelte'
  import TileRack from './TileRack.svelte'
  import Timer from './Timer.svelte'
  import Tray from './Tray.svelte'
  import WordList from './WordList.svelte'

  /**
   * A picture of the game screen, made from the real parts with sample data, so it always matches what the
   * player will see (theme, text size and all). Numbered pins mark each part; the list below says what each does.
   * Nothing in the picture can be pressed.
   */
  let { legend = true, extras = true }: { legend?: boolean; extras?: boolean } = $props()

  const letters = tilesOf('master')
  const answers: Answer[] = [
    ['stream', true],
    ['tamers', true],
    ['mast', true],
    ['team', true],
    ['art', true],
    ['mate', false],
  ]
  const tray = [letters[0], letters[1], letters[2], letters[3]] // M A S T
  const nothing = () => {}

  const PARTS: { n: number; name: string; text: string }[] = [
    { n: 1, name: 'Pause', text: 'Opens the break menu: go home, read the help, change settings or end the game.' },
    { n: 2, name: 'Round', text: 'Which round you are on. There are 20, and each has its own word.' },
    { n: 3, name: 'Settings', text: 'Sound, text size, controls and more.' },
    { n: 4, name: 'Clock', text: 'Two minutes a round. It turns red for the last ten seconds.' },
    {
      n: 5,
      name: 'Skip word',
      text: 'Gives up the round for the next word. It asks for a second tap, and waits five seconds into each round (both can be switched off in Settings).',
    },
    { n: 6, name: 'Score', text: 'Your points, adding up as you go.' },
    {
      n: 7,
      name: 'Found words',
      text: 'Every word you have made this round, longest first. Tap one to put it back in the tray. The Missed tab shows words that did not count.',
    },
    { n: 8, name: 'Tray', text: 'The word you are building. Tap a letter to take it back out, or drag letters to reorder them.' },
    { n: 9, name: 'Letters', text: 'Tap a letter to add it, or just type. You can drag them too.' },
    { n: 10, name: 'Shuffle, Restore, Keep', text: 'Shuffle mixes the letters up. Restore puts them back in order. Keep leaves your word in the tray after you submit.' },
    { n: 11, name: 'Clear, Submit, Delete', text: 'Clear empties the tray, Submit checks your word, Delete removes the last letter.' },
  ]
</script>

<figure class="map">
  <div class="mock" inert aria-hidden="true">
    <div class="top">
      <div class="part"><i class="pin">1</i><IconButton label="Pause" tabindex={-1}><Pause size="1.375rem" /></IconButton></div>
      <div class="part round">
        <i class="pin">2</i>
        <span>Round <strong>3</strong> of 20</span>
        <span class="bar"><span></span></span>
      </div>
      <div class="part end"><i class="pin">3</i><IconButton label="Settings" tabindex={-1}><SettingsIcon size="1.375rem" /></IconButton></div>
    </div>

    <div class="stats">
      <div class="part"><i class="pin">4</i><Timer time={94} limit={120} /></div>
      <div class="part"><i class="pin">5</i><Button variant="secondary" size="sm" tabindex={-1}><SkipForward size="1rem" /> Skip word</Button></div>
      <div class="part score"><i class="pin">6</i><Score score={124} /></div>
    </div>

    <div class="part"><i class="pin">7</i><div class="found"><WordList {answers} goal={20} onuse={nothing} /></div></div>

    <div class="part"><i class="pin">8</i><Tray tiles={tray} onremove={nothing} ondrag={nothing} /></div>
    <div class="part"><i class="pin">9</i><TileRack tiles={letters} used={[0, 1, 2, 3]} onpick={nothing} ondrag={nothing} /></div>

    <div class="part tools">
      <i class="pin">10</i>
      <Button variant="ghost" size="sm" tabindex={-1}><Shuffle size="1.125rem" /> Shuffle</Button>
      <Button variant="ghost" size="sm" tabindex={-1}><ListRestart size="1.125rem" /> Restore</Button>
      <Button variant="ghost" size="sm" tabindex={-1}><Pin size="1.125rem" /> Keep</Button>
    </div>
    <div class="part actions">
      <i class="pin">11</i>
      <IconButton variant="filled" label="Clear" tabindex={-1}><Eraser size="1.375rem" /></IconButton>
      <Button size="lg" tabindex={-1}>Submit</Button>
      <IconButton variant="filled" label="Delete" tabindex={-1}><Delete size="1.375rem" /></IconButton>
    </div>
  </div>

  {#if legend}
    <figcaption>
      <ol class="legend">
        {#each PARTS as part (part.n)}
          <li><i class="pin">{part.n}</i><span><strong>{part.name}.</strong> {part.text}</span></li>
        {/each}
      </ol>
      {#if extras}<div class="hidden">
        <h3>Things you might not spot</h3>
        <ul>
          <li><strong>Tap a word in the list</strong> to bring it back to the tray, to build on it or fix a typo.</li>
          <li><strong>Drag</strong> letters from the board into the tray, and around inside it.</li>
          <li><strong>Tap anywhere</strong> when a round's time is up, to start the next one without waiting.</li>
          {#if !settings.keyboardOff}
            <li>
              <strong>Keyboard:</strong> type letters, <kbd>Enter</kbd> submits, <kbd>Backspace</kbd> deletes, <kbd>Esc</kbd> clears,
              <kbd>Space</kbd> shuffles, <kbd>Tab</kbd> skips, <kbd>Caps Lock</kbd> keeps.
            </li>
          {/if}
        </ul>
      </div>{/if}
    </figcaption>
  {/if}
</figure>

<style>
  .map {
    display: grid;
    gap: var(--space-4);
    margin: 0;
  }

  /* The picture: the real parts in a fixed-shape frame that fits any screen. */
  .mock {
    display: grid;
    gap: var(--space-3);
    width: min(100%, 24rem);
    margin-inline: auto;
    padding: var(--space-4) var(--space-3) var(--space-3);
    border: 1px solid var(--line);
    border-radius: var(--radius-xl);
    background: var(--bg);
    box-shadow: var(--shadow-md);
    pointer-events: none;
    user-select: none;
  }

  .part {
    position: relative;
  }

  .top {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: var(--space-2);
  }

  .end {
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

  .bar {
    width: 7rem;
    height: 0.25rem;
    border-radius: var(--radius-full);
    background: var(--surface-2);
    overflow: hidden;
  }

  .bar span {
    display: block;
    width: 15%;
    height: 100%;
    background: var(--accent);
  }

  .stats {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
  }

  .found {
    height: 9.5rem;
    overflow: hidden;
  }

  .score > .pin {
    top: 0.1rem;
    left: -1.5rem;
  }

  .tools {
    display: flex;
    justify-content: center;
    gap: var(--space-1);
  }

  .actions {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: var(--space-3);
  }

  /* The numbered pins, on the picture and in the list. */
  .pin {
    display: inline-grid;
    place-items: center;
    flex: none;
    width: 1.375rem;
    height: 1.375rem;
    border-radius: var(--radius-full);
    background: var(--primary);
    color: var(--on-primary);
    font-size: var(--text-xs);
    font-style: normal;
    font-weight: 700;
    line-height: 1;
    box-shadow: 0 0 0 2px var(--bg);
  }

  .part > .pin {
    position: absolute;
    top: -0.5rem;
    left: -0.375rem;
    z-index: 3;
  }

  .legend {
    display: grid;
    gap: var(--space-3);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .legend li {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
    font-size: var(--text-sm);
    line-height: 1.45;
    color: var(--text-2);
  }

  .legend li .pin {
    margin-top: 0.1rem;
    box-shadow: none;
  }

  .legend strong {
    color: var(--text);
  }

  .hidden {
    margin-top: var(--space-4);
    padding-top: var(--space-4);
    border-top: 1px solid var(--line);
  }

  h3 {
    margin-bottom: var(--space-2);
    font-size: var(--text-sm);
    font-weight: 700;
  }

  .hidden ul {
    display: grid;
    gap: var(--space-2);
    margin: 0;
    padding-left: var(--space-5);
    font-size: var(--text-sm);
    line-height: 1.45;
    color: var(--text-2);
  }

  .hidden strong {
    color: var(--text);
  }

  kbd {
    padding: 0 0.35em;
    border: 1px solid var(--line);
    border-radius: 0.3rem;
    background: var(--surface);
    font: inherit;
    font-weight: 600;
  }
</style>
