<script lang="ts">
  import Clock from '@lucide/svelte/icons/clock'
  import RotateCcw from '@lucide/svelte/icons/rotate-ccw'
  import Trash2 from '@lucide/svelte/icons/trash-2'
  import { onDestroy } from 'svelte'
  import { prefersReducedMotion } from 'svelte/motion'
  import { sparkle } from '../lib/confetti'
  import { canKeepAwake, canVibrate } from '../lib/device'
  import type { GameController } from '../lib/game'
  import { fullscreen } from '../lib/fullscreen.svelte'
  import { buzzTest } from '../lib/haptics'
  import { clearMyData } from '../lib/data'
  import { install } from '../lib/install.svelte'
  import { MAX_NAME_LENGTH, MIN_NAME_LENGTH, player } from '../lib/player.svelte'
  import { settings, type Motion, type TextSize } from '../lib/settings.svelte'
  import { theme } from '../lib/theme.svelte'
  import { ui } from '../lib/ui.svelte'
  import { update } from '../lib/update.svelte'
  import { appVersion } from '../lib/version'
  import Button from './Button.svelte'
  import Dialog from './Dialog.svelte'
  import Segmented from './Segmented.svelte'
  import SoundSection from './SoundSection.svelte'
  import Switch from './Switch.svelte'
  import TextField from './TextField.svelte'
  import ThemeChoice from './ThemeChoice.svelte'

  interface Props {
    /** The game in progress, if any. */
    game: GameController | null
    /**
     * The game screen is showing. Then the round's clock is shown here (it keeps
     * running while Settings is open), and the name can't change, because the
     * API only takes a name when a game starts.
     */
    inGame: boolean
  }

  let { game, inGame }: Props = $props()
  const uid = $props.id()

  const TEXT_SIZES: { value: TextSize; label: string }[] = [
    { value: 'small', label: 'Small' },
    { value: 'default', label: 'Default' },
    { value: 'large', label: 'Large' },
  ]
  const MOTIONS: { value: Motion; label: string }[] = [
    { value: 'auto', label: 'Auto' },
    { value: 'reduced', label: 'Reduced' },
    { value: 'full', label: 'Full' },
  ]

  const clock = $derived.by(() => {
    const time = game?.timeLeft ?? 0
    return `${Math.floor(time / 60)}:${String(time % 60).padStart(2, '0')}`
  })

  // The name is saved as it's typed, as long as it is a valid one.
  let touched = $state(false)
  const nameError = $derived(touched && !player.valid ? `Use at least ${MIN_NAME_LENGTH} characters.` : undefined)

  let clearing = $state(false)

  // "Reset settings" takes two taps, like Skip does.
  let armed = $state(false)
  let disarm: ReturnType<typeof setTimeout> | undefined
  function reset() {
    if (!armed) {
      armed = true
      disarm = setTimeout(() => (armed = false), 3000)
      return
    }
    clearTimeout(disarm)
    armed = false
    settings.reset()
    theme.set('system')
  }
  onDestroy(() => clearTimeout(disarm))
</script>

<Dialog bind:open={ui.settingsOpen} title="Settings" placement="right">
  {#snippet top()}
    {#if inGame && game?.state.status}
      <p class="clock" role="timer">
        <Clock size="1rem" />
        <span><strong>{clock}</strong> left in round {game.state.round}. The clock keeps running.</span>
      </p>
    {/if}
  {/snippet}

  {#if !inGame}
    <section aria-labelledby="{uid}-player">
      <h3 id="{uid}-player">Player</h3>
      <TextField
        label="Your name"
        placeholder="e.g. Ada"
        maxlength={MAX_NAME_LENGTH}
        autocomplete="nickname"
        autocapitalize="words"
        enterkeyhint="done"
        spellcheck="false"
        bind:value={player.name}
        error={nameError}
        hint="Used when you start a game. {MIN_NAME_LENGTH}–{MAX_NAME_LENGTH} characters, shown on the leaderboard."
        oninput={() => (touched = true)}
        onkeydown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
      />
    </section>
  {/if}

  <section aria-labelledby="{uid}-appearance">
    <h3 id="{uid}-appearance">Appearance</h3>
    <ThemeChoice />
    <div class="stack">
      <Switch label="High contrast" hint="Stronger text and borders, for low vision." bind:checked={settings.highContrast} />
      <Segmented
        label="Text size"
        options={TEXT_SIZES}
        bind:value={settings.textSize}
        hint="On short screens, Large is trimmed so the game still fits."
      />
      <Segmented
        label="Animations"
        options={MOTIONS}
        bind:value={settings.motion}
        hint="Auto follows your device, which is set to {prefersReducedMotion.current ? 'reduced' : 'full'} motion."
      />
      {#if fullscreen.supported}
        <Switch
          label="Full screen"
          hint="Hides the browser's bars. It stays on until you turn it off. Browsers only allow it after a tap, so it returns on your next tap after you leave it."
          bind:checked={settings.fullscreen}
          onchange={(on) => on && fullscreen.enter()}
        />
      {/if}
    </div>
  </section>

  <section aria-labelledby="{uid}-sound">
    <h3 id="{uid}-sound">Sound</h3>
    <SoundSection />
  </section>

  <section aria-labelledby="{uid}-feedback">
    <h3 id="{uid}-feedback">Feedback</h3>
    {#if canVibrate}
      <Switch
        label="Vibration"
        hint="A buzz for a rejected word and a cleared round."
        bind:checked={settings.haptics}
        onchange={(on) => on && buzzTest()}
      />
      <Switch
        label="Time-almost-up buzz"
        hint="One buzz when ten seconds are left."
        bind:checked={settings.lowTimeBuzz}
        disabled={!settings.haptics}
      />
    {/if}
    <Switch
      label="Celebrations"
      hint="Confetti when you clear a round."
      bind:checked={settings.celebrations}
      onchange={(on) => on && sparkle()}
    />
  </section>

  <section aria-labelledby="{uid}-play">
    <h3 id="{uid}-play">Play</h3>
    <Switch
      label="On-screen controls only"
      hint="Games ignore the keyboard. Typing in text fields still works."
      bind:checked={settings.keyboardOff}
    />
    <Switch
      label="Keep letters after submitting"
      hint="Leaves your letters in the tray, to build on a word."
      bind:checked={settings.keepLetters}
    />
    <Switch
      label="Skip needs a second tap"
      hint="Skipping costs the round, so it asks you to tap twice."
      bind:checked={settings.confirmSkip}
    />
    {#if canKeepAwake}
      <Switch
        label="Keep the screen on while playing"
        hint="Stops the screen dimming mid-round. The clock keeps running."
        bind:checked={settings.keepAwake}
      />
    {/if}
    <Switch
      label="Open straight into my game"
      hint="Skips Home when you open the app with a game in progress."
      bind:checked={settings.autoResume}
    />
  </section>

  <section aria-labelledby="{uid}-app">
    <h3 id="{uid}-app">App</h3>
    {#if install.available}
      <div class="action">
        <span class="text">
          <span class="label">Install app</span>
          <span class="hint">Adds Anagram Master to your home screen or desktop, so it opens like any app.</span>
        </span>
        <Button size="sm" onclick={() => install.prompt()}>Install</Button>
      </div>
    {:else if install.needsShareMenu}
      <p class="note">To install on an iPhone or iPad: tap Share, then Add to Home Screen.</p>
    {/if}
    <div class="action">
      <span class="text">
        <span class="label">Updates</span>
        <span class="hint" role="status">
          {#if update.ready}
            {update.elsewhere
              ? 'Updated in another window. Reload to use it.'
              : update.waiting
                ? `Version ${update.waiting} is ready.`
                : 'A new version is ready.'}
          {:else if update.busy}
            Checking…
          {:else if update.outcome === 'current'}
            You're up to date.
          {:else if update.outcome === 'failed'}
            Couldn't check. Are you online?
          {:else}
            You have {appVersion}.
          {/if}
        </span>
      </span>
      {#if update.ready}
        <Button size="sm" onclick={() => update.apply()}>{update.elsewhere ? 'Reload' : 'Update now'}</Button>
      {:else}
        <Button variant="secondary" size="sm" disabled={update.busy} onclick={() => update.check(true)}>
          Check
        </Button>
      {/if}
    </div>
  </section>

  <section aria-labelledby="{uid}-data">
    <h3 id="{uid}-data">Reset</h3>
    <div class="reset" class:armed>
      <Button variant="secondary" size="sm" block onclick={reset}>
        <RotateCcw size="1rem" />
        {armed ? 'Tap again to reset' : 'Reset settings'}
      </Button>
    </div>
    <p class="note">Puts every setting back to its default. Your name, best score and saved game stay.</p>
    <!-- Not mid-game: it reloads the page. -->
    {#if !inGame}
      <div class="clear">
        <Button variant="ghost" size="sm" block onclick={() => (clearing = true)}>
          <Trash2 size="1rem" /> Clear my data
        </Button>
      </div>
      <p class="note">Removes your name, best score and settings from this device.</p>
    {/if}
  </section>

  <footer>
    <p>Anagram Master {appVersion}</p>
    <p>Settings are saved on this device.</p>
  </footer>
</Dialog>

<Dialog bind:open={clearing} title="Clear my data?">
  <p>
    This removes your name, best score and settings from this device. Your saved game and the leaderboard aren't
    affected.
  </p>
  {#snippet actions()}
    <Button variant="secondary" onclick={() => (clearing = false)}>Cancel</Button>
    <Button onclick={clearMyData}>Clear data</Button>
  {/snippet}
</Dialog>

<style>
  .clock {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--space-2);
    padding: var(--space-3);
    border-radius: var(--radius-md);
    background: var(--warn-soft);
    font-size: var(--text-sm);
    color: var(--text);
  }

  .clock :global(svg),
  .clock strong {
    color: var(--warn);
  }

  .clock :global(svg) {
    margin-top: 0.15rem;
  }

  .stack {
    display: grid;
    gap: var(--space-4);
    margin-top: var(--space-4);
  }

  section + section,
  footer {
    margin-top: var(--space-6);
  }

  h3 {
    margin-bottom: var(--space-3);
    font-size: var(--text-xs);
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-3);
  }

  .note {
    margin-top: var(--space-2);
    font-size: var(--text-sm);
    color: var(--text-2);
  }

  .action {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    min-height: var(--tap);
  }

  .action + .action,
  .note + .action {
    margin-top: var(--space-3);
  }

  .text {
    display: grid;
    gap: 0.125rem;
  }

  .label {
    font-weight: 600;
  }

  .hint {
    font-size: var(--text-sm);
    line-height: 1.35;
    color: var(--text-2);
  }

  .clear {
    margin-top: var(--space-4);
  }

  .clear :global(.btn) {
    color: var(--warn);
  }

  .reset.armed :global(.btn) {
    color: var(--warn);
    border-color: var(--warn);
    background: var(--warn-soft);
  }

  footer {
    padding-top: var(--space-4);
    border-top: 1px solid var(--line);
    font-size: var(--text-xs);
    text-align: center;
    color: var(--text-3);
  }
</style>
