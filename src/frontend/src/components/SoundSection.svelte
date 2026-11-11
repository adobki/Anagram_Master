<script lang="ts">
  import ChevronDown from '@lucide/svelte/icons/chevron-down'
  import Play from '@lucide/svelte/icons/play'
  import Volume2 from '@lucide/svelte/icons/volume-2'
  import { slide } from 'svelte/transition'
  import { ms } from '../lib/motion'
  import { settings } from '../lib/settings.svelte'
  import { audio, EFFECTS, preview } from '../lib/sound.svelte'
  import IconButton from './IconButton.svelte'
  import Switch from './Switch.svelte'

  const uid = $props.id()
  const panel = `${uid}-panel`

  let expanded = $state(false)

  const enabled = $derived(EFFECTS.filter((effect) => settings.sfx(effect.id)).length)
  const summary = $derived(
    settings.sound ? `On · volume ${settings.volume}% · ${enabled} of ${EFFECTS.length} effects` : 'Off',
  )
</script>

<!--
  One row that is both a switch and a button. The left part (icon, text and
  chevron) opens and closes the details, like a round on the game-over screen;
  the switch on the right turns every sound effect on or off. They are
  siblings because controls can't be nested.
-->
<div class="card">
  <div class="head">
    <button type="button" class="expander" aria-expanded={expanded} aria-controls={panel} onclick={() => (expanded = !expanded)}>
      <span class="icon"><Volume2 size="1.25rem" /></span>
      <span class="text">
        <span class="label">Sound effects</span>
        <span class="summary">{summary}</span>
      </span>
      <ChevronDown class="chevron {expanded ? 'open' : ''}" size="1.125rem" />
    </button>
    <Switch bare label="Sound effects" bind:checked={settings.sound} onchange={(on) => on && preview('word')} />
  </div>

  {#if expanded}
    <div id={panel} class="details" class:off={!settings.sound} inert={!settings.sound} transition:slide={{ duration: ms(200) }}>
      <label class="volume">
        <span class="label">Volume</span>
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          bind:value={settings.volume}
          aria-valuetext="{settings.volume}%"
          onchange={() => preview('word')}
        />
        <span class="percent">{settings.volume}%</span>
      </label>

      <ul>
        {#each EFFECTS as effect (effect.id)}
          <li>
            <span class="effect">
              <span class="label">{effect.label}</span>
              <span class="hint">{effect.hint}</span>
            </span>
            <IconButton label="Preview {effect.label}" onclick={() => preview(effect.id)}><Play size="1rem" /></IconButton>
            <Switch
              bare
              label={effect.label}
              checked={settings.sfx(effect.id)}
              onchange={(on) => settings.setSfx(effect.id, on)}
            />
          </li>
        {/each}
      </ul>

      {#if !audio.running}<p class="note">Sound starts after your next tap, which your browser needs first.</p>{/if}
      <p class="note">Your device's own volume and silent switch still apply.</p>
    </div>
  {/if}
</div>

<style>
  .card {
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    background: var(--surface);
    overflow: hidden;
  }

  .head {
    display: flex;
    align-items: center;
    padding-right: var(--space-2);
  }

  .expander {
    flex: 1;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--space-3);
    min-height: 3.75rem;
    padding: var(--space-2) var(--space-2) var(--space-2) var(--space-4);
    border: 0;
    background: transparent;
    color: inherit;
    text-align: left;
    cursor: pointer;
    touch-action: manipulation;
  }

  .expander:active {
    background: var(--surface-2);
  }

  .icon {
    display: grid;
    color: var(--accent);
  }

  .text,
  .effect {
    display: grid;
    gap: 0.125rem;
  }

  .label {
    font-weight: 600;
  }

  .summary,
  .hint {
    font-size: var(--text-sm);
    line-height: 1.35;
    color: var(--text-2);
  }

  .expander :global(.chevron) {
    color: var(--text-3);
    transition: rotate var(--dur) var(--ease-out);
  }

  .expander :global(.chevron.open) {
    rotate: 180deg;
  }

  .details {
    display: grid;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4) var(--space-4);
    border-top: 1px solid var(--line);
    transition: opacity var(--dur);
  }

  .details.off {
    opacity: 0.45;
  }

  .volume {
    display: grid;
    grid-template-columns: auto 1fr 2.75rem;
    align-items: center;
    gap: var(--space-3);
  }

  .percent {
    font-size: var(--text-sm);
    font-variant-numeric: tabular-nums;
    text-align: right;
    color: var(--text-2);
  }

  input[type='range'] {
    width: 100%;
    min-height: var(--tap);
    accent-color: var(--primary);
  }

  ul {
    display: grid;
    gap: var(--space-1);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    align-items: center;
    gap: var(--space-1);
  }

  .note {
    font-size: var(--text-xs);
    color: var(--text-3);
  }
</style>
