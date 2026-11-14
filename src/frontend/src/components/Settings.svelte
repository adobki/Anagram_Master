<script lang="ts">
  import Check from '@lucide/svelte/icons/check'
  import Clock from '@lucide/svelte/icons/clock'
  import RotateCcw from '@lucide/svelte/icons/rotate-ccw'
  import Trash2 from '@lucide/svelte/icons/trash-2'
  import Undo2 from '@lucide/svelte/icons/undo-2'
  import { onDestroy, untrack } from 'svelte'
  import { prefersReducedMotion } from 'svelte/motion'
  import { sparkle } from '../lib/confetti'
  import { canKeepAwake, canVibrate } from '../lib/device'
  import { MIN_LEADERBOARD_SCORE, roundClock, type GameController } from '../lib/game'
  import { fullscreen } from '../lib/fullscreen.svelte'
  import { buzzTest } from '../lib/haptics'
  import { clearMyData } from '../lib/data'
  import { install } from '../lib/install.svelte'

  /** Android Chrome in a browser tab (not the installed app), where going full screen brings up Chrome's notice. */
  const androidTab = /Android/i.test(navigator.userAgent) && !install.onDevice
  import { MAX_NAME_LENGTH, MIN_NAME_LENGTH, player } from '../lib/player.svelte'
  import { settings, type Motion, type RoundEnd, type RoundTap, type TextSize } from '../lib/settings.svelte'
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
    /** Opens the feedback form (closing Settings first). */
    onfeedback?: () => void
    /**
     * The game screen is showing. Then the round's clock is shown here (it keeps
     * running while Settings is open), and the name can't change, because the
     * API only takes a name when a game starts.
     */
    inGame: boolean
  }

  let { game, inGame, onfeedback }: Props = $props()
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

  const ROUND_ENDS: { value: RoundEnd; label: string }[] = [
    { value: 'countdown', label: 'Countdown' },
    { value: 'instant', label: 'Straight on' },
    { value: 'manual', label: "I'll tap" },
  ]
  const ROUND_TAPS = [
    { value: 'review', label: 'Review the round' },
    { value: 'advance', label: 'Start the next round' },
  ]
  const ROUND_TAP_HINTS: Record<RoundTap, string> = {
    review: "Tapping anywhere off the round-end panel hides it, so you can look back over the round's words. Tap the letters to bring it back.",
    advance: "Tapping anywhere off the round-end panel starts the next round.",
  }
  const ROUND_END_HINTS: Record<RoundEnd, string> = {
    countdown: 'A finished round shows a ten-second countdown to the next one. Press Next round to go on sooner, tap the panel to stop the countdown, or take a break.',
    instant: 'The next round starts the moment one ends (time up, skipped, or all its words found). Fastest.',
    manual: 'A finished round waits until you press Next round. No countdown.',
  }

  /** The round's time as the player sees it: 0 once the round is over (see `roundClock`). */
  const time = $derived(game ? roundClock(game) : 0)
  const clock = $derived.by(() => {
    return `${Math.floor(time / 60)}:${String(time % 60).padStart(2, '0')}`
  })

  // The name is edited here as a draft, and only saved by Apply, so a stray keystroke can't rename the player.
  let draft = $state(player.name)
  let touched = $state(false)
  let saved = $state(false)
  let savedTimer: ReturnType<typeof setTimeout> | undefined
  const trimmedDraft = $derived(draft.trim())
  const draftValid = $derived(trimmedDraft.length >= MIN_NAME_LENGTH)
  const dirty = $derived(trimmedDraft !== player.trimmed)
  const nameError = $derived(touched && dirty && !draftValid ? `Use at least ${MIN_NAME_LENGTH} characters.` : undefined)
  let warning = $state(false)

  // Each time Settings opens, start from the saved name.
  $effect(() => {
    if (ui.settingsOpen) {
      untrack(() => {
        draft = player.name
        touched = false
        saved = false
      })
    }
  })

  function apply() {
    if (!draftValid) return
    player.name = trimmedDraft
    draft = trimmedDraft
    saved = true
    clearTimeout(savedTimer)
    savedTimer = setTimeout(() => (saved = false), 2500)
  }

  function revert() {
    draft = player.name
    touched = false
  }

  /** Asked before Settings closes. With an unapplied name, warn first. */
  function canClose() {
    if (inGame || !dirty) return true
    warning = true
    return false
  }
  $effect(() => {
    ui.settingsGuard = canClose
    return () => (ui.settingsGuard = null)
  })

  function discardAndClose() {
    revert()
    warning = false
    ui.settingsOpen = false
  }

  function saveAndClose() {
    apply()
    warning = false
    ui.settingsOpen = false
  }

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
  onDestroy(() => {
    clearTimeout(disarm)
    clearTimeout(savedTimer)
  })
</script>

<Dialog bind:open={ui.settingsOpen} title="Settings" placement="right" {canClose}>
  {#snippet top()}
    {#if inGame && game?.state.status}
      <p class="clock" role="timer">
        <Clock size="1rem" />
        {#if time > 0 || game.state.round >= game.state.rounds_limit}
          <span><strong>{clock}</strong> left in round {game.state.round}. The clock keeps running.</span>
        {:else}
          <span><strong>Round {game.state.round} is over.</strong> Take your time: nothing is lost.</span>
        {/if}
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
        bind:value={draft}
        error={nameError}
        hint={saved
          ? 'Saved. Your next game uses this name.'
          : dirty && draftValid
            ? 'Tap the tick to save this name.'
            : `Used when you start a game. ${MIN_NAME_LENGTH}–${MAX_NAME_LENGTH} characters, shown on the leaderboard.`}
        oninput={() => {
          touched = true
          saved = false
        }}
        onkeydown={(event) => {
          if (event.key !== 'Enter') return
          if (draftValid && dirty) apply()
          event.currentTarget.blur()
        }}
      >
        {#snippet action()}
          {#if dirty}
            <button type="button" class="mini" aria-label="Undo the change" title="Undo the change" onclick={revert}>
              <Undo2 size="1rem" />
            </button>
            {#if draftValid}
              <button type="button" class="mini apply" aria-label="Apply name" title="Apply name" onclick={apply}>
                <Check size="1.125rem" />
              </button>
            {/if}
          {/if}
        {/snippet}
      </TextField>
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
      {#if fullscreen.byApp}
        <p class="note">Full screen: the installed app already runs full screen.</p>
      {:else if fullscreen.supported}
        <Switch
          label="Full screen"
          hint="Hides the browser's bars. It stays on until you turn it off. Browsers only allow it after a tap, so it returns on your next tap after you leave it.{androidTab
            ? ' Chrome shows its own notice each time a page goes full screen. Installing the app avoids it.'
            : ''}"
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
    <Segmented
      label="When a round ends"
      options={ROUND_ENDS}
      bind:value={settings.roundEnd}
      hint={ROUND_END_HINTS[settings.roundEnd]}
    />
    <Segmented
      label="Tapping outside the round-end panel"
      options={ROUND_TAPS}
      bind:value={settings.roundTap}
      hint={ROUND_TAP_HINTS[settings.roundTap]}
    />
    <Switch
      label="Skip cooldown"
      hint="Skip waits five seconds into each round, so a stray tap can't throw one away."
      bind:checked={settings.skipCooldown}
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
      label="Quick guide before every game"
      hint="Shows the interface guide each time you start a game. It always shows once for new players."
      bind:checked={settings.alwaysGuide}
    />
    <Switch
      label="Open straight into my game"
      hint="Skips Home when you open the app with a game in progress."
      bind:checked={settings.autoResume}
    />
  </section>

  <section aria-labelledby="{uid}-app">
    <h3 id="{uid}-app">App</h3>
    {#if onfeedback && !inGame}
      <div class="action">
        <span class="text">
          <span class="label">Send feedback</span>
          <span class="hint">Tell us what you think, report a bug or share an idea. Screenshots welcome.</span>
        </span>
        <Button size="sm" variant="secondary" onclick={onfeedback}>Open</Button>
      </div>
    {/if}
    {#if !install.installed}
      <div class="action">
        <span class="text">
          <span class="label">Install app</span>
          <span class="hint">
            Adds Anagram Master to your home screen or desktop, so it opens full screen like any app.
            {#if !install.available}Shows you how for this browser.{/if}
          </span>
        </span>
        <Button size="sm" onclick={() => install.start()}>{install.available ? 'Install' : 'How to'}</Button>
      </div>
    {/if}
    <div class="action">
      <span class="text">
        <span class="label">Updates</span>
        <span class="hint" role="status">
          {#if update.ready}
            {update.elsewhere
              ? 'Updated in another window. Reload to use it.'
              : update.critical
                ? 'An important update is ready. It installs by itself soon.'
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
      <p class="note">
        Removes your name, best score, settings and games from this device. Games in progress are ended.
      </p>
    {/if}
  </section>

  <footer>
    <p>Anagram Master {appVersion}</p>
    <p>Settings are saved on this device.</p>
  </footer>
</Dialog>

<Dialog bind:open={warning} title="Save your name?">
  <p>You changed your name to “{trimmedDraft}” but haven't applied it. Closing Settings will discard it.</p>
  {#snippet actions()}
    <Button variant="secondary" onclick={() => (warning = false)}>Go back</Button>
    <Button variant="ghost" onclick={discardAndClose}>Discard</Button>
    {#if draftValid}<Button class="span" onclick={saveAndClose}>Save and close</Button>{/if}
  {/snippet}
</Dialog>

<Dialog bind:open={clearing} title="Clear my data?">
  <p>
    This removes your name, best score, settings and saved games from this device. Any games in progress here are
    ended quietly, and a score of {MIN_LEADERBOARD_SCORE} or more still goes on the leaderboard. The leaderboard
    itself isn't affected.
  </p>
  {#snippet actions()}
    <Button variant="secondary" onclick={() => (clearing = false)}>Cancel</Button>
    <Button onclick={clearMyData}>Clear data</Button>
  {/snippet}
</Dialog>

<style>
  .mini {
    display: grid;
    place-items: center;
    width: 2.25rem;
    height: 2.25rem;
    padding: 0;
    border: 0;
    border-radius: var(--radius-full);
    background: transparent;
    color: var(--text-2);
    cursor: pointer;
    touch-action: manipulation;
  }

  .mini:active {
    background: var(--surface-2);
  }

  .mini.apply {
    background: var(--primary);
    color: var(--on-primary);
  }

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

  .action + .action {
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
