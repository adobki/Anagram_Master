<script lang="ts">
  import Clock from '@lucide/svelte/icons/clock'
  import RotateCcw from '@lucide/svelte/icons/rotate-ccw'
  import { onDestroy } from 'svelte'
  import { sparkle } from '../lib/confetti'
  import { canKeepAwake, canVibrate } from '../lib/device'
  import type { GameController } from '../lib/game'
  import { buzzTest } from '../lib/haptics'
  import { MAX_NAME_LENGTH, MIN_NAME_LENGTH, player } from '../lib/player.svelte'
  import { settings } from '../lib/settings.svelte'
  import { theme } from '../lib/theme.svelte'
  import { ui } from '../lib/ui.svelte'
  import { appVersion } from '../lib/version'
  import Button from './Button.svelte'
  import Dialog from './Dialog.svelte'
  import SoundSection from './SoundSection.svelte'
  import Switch from './Switch.svelte'
  import TextField from './TextField.svelte'
  import ThemeChoice from './ThemeChoice.svelte'

  interface Props {
    /** The game in progress, if any. Its clock keeps running while Settings is open, so it is shown. */
    game: GameController | null
    /** The game screen is showing. The name can't change then, because the API only takes it when a game starts. */
    inGame: boolean
  }

  let { game, inGame }: Props = $props()
  const uid = $props.id()

  const clock = $derived.by(() => {
    const time = game?.timeLeft ?? 0
    return `${Math.floor(time / 60)}:${String(time % 60).padStart(2, '0')}`
  })

  // The name is saved as it's typed, as long as it is a valid one.
  let touched = $state(false)
  const nameError = $derived(touched && !player.valid ? `Use at least ${MIN_NAME_LENGTH} characters.` : undefined)

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
    {#if game?.state.status}
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

  <section aria-labelledby="{uid}-data">
    <h3 id="{uid}-data">Defaults</h3>
    <div class="reset" class:armed>
      <Button variant="secondary" size="sm" block onclick={reset}>
        <RotateCcw size="1rem" />
        {armed ? 'Tap again to reset' : 'Reset settings'}
      </Button>
    </div>
    <p class="note">Puts every setting back to its default. Your name, best score and saved game stay.</p>
  </section>

  <footer>
    <p>Anagram Master {appVersion}</p>
    <p>Settings are saved on this device.</p>
  </footer>
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
