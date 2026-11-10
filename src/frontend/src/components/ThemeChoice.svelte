<script lang="ts">
  import { theme, type ThemeChoice } from '../lib/theme.svelte'

  const OPTIONS: { value: ThemeChoice; label: string }[] = [
    { value: 'system', label: 'Auto' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
  ]

  let group: HTMLElement

  // A radio group: arrow keys move the choice, and only the chosen card is a tab stop.
  function onkeydown(event: KeyboardEvent) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key]
    if (!step) return
    event.preventDefault()
    const at = OPTIONS.findIndex((option) => option.value === theme.choice)
    const next = (at + step + OPTIONS.length) % OPTIONS.length
    theme.set(OPTIONS[next].value)
    group.querySelectorAll<HTMLElement>('[role="radio"]')[next]?.focus()
  }
</script>

<div class="group" role="radiogroup" aria-label="Theme" bind:this={group}>
  {#each OPTIONS as option (option.value)}
    {@const chosen = theme.choice === option.value}
    <button
      type="button"
      role="radio"
      class="card"
      aria-checked={chosen}
      tabindex={chosen ? 0 : -1}
      onclick={() => theme.set(option.value)}
      {onkeydown}
    >
      <!-- Little previews of each theme. The colours mirror styles/tokens.css. -->
      <span class="swatch {option.value}" aria-hidden="true"><span class="t">A</span><span class="t">a</span></span>
      <span class="name">{option.label}</span>
    </button>
  {/each}
</div>
{#if theme.choice === 'system'}
  <p class="note">Following your device, which is {theme.current} right now.</p>
{/if}

<style>
  .group {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-2);
  }

  .card {
    display: grid;
    gap: var(--space-2);
    justify-items: stretch;
    padding: var(--space-2);
    border: 2px solid var(--line);
    border-radius: var(--radius-md);
    background: var(--surface);
    cursor: pointer;
    touch-action: manipulation;
    transition:
      border-color var(--dur),
      transform var(--dur-fast) var(--ease-out);
  }

  .card:active {
    transform: scale(0.97);
  }

  .card[aria-checked='true'] {
    border-color: var(--accent);
  }

  .name {
    font-size: var(--text-sm);
    font-weight: 600;
    text-align: center;
    color: var(--text-2);
  }

  .card[aria-checked='true'] .name {
    color: var(--text);
  }

  .swatch {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    height: 3.25rem;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-sm);
  }

  .swatch.light {
    background: #f6f5f2;
  }

  .swatch.dark {
    background: #0d0c11;
  }

  .swatch.system {
    background: linear-gradient(105deg, #f6f5f2 50%, #0d0c11 50%);
  }

  .t {
    display: grid;
    place-items: center;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 0.4rem;
    font-size: var(--text-sm);
    font-weight: 700;
  }

  .light .t,
  .system .t:first-child {
    background: #fff;
    color: #17151c;
    box-shadow: 0 1px 0 #d9d5cc;
  }

  .dark .t,
  .system .t:last-child {
    background: #26242e;
    color: #f4f3f7;
  }

  .note {
    margin-top: var(--space-2);
    font-size: var(--text-sm);
    color: var(--text-2);
  }
</style>
