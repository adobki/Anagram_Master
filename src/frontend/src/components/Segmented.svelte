<script lang="ts" generics="T extends string">
  interface Props {
    label: string
    options: { value: T; label: string }[]
    value: T
    hint?: string
  }

  let { label, options, value = $bindable(), hint }: Props = $props()
  const id = $props.id()

  let group: HTMLElement

  // A radio group: arrow keys move the choice, and only the chosen option is a tab stop.
  function onkeydown(event: KeyboardEvent) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key]
    if (!step) return
    event.preventDefault()
    const at = options.findIndex((option) => option.value === value)
    const next = (at + step + options.length) % options.length
    value = options[next].value
    group.querySelectorAll<HTMLElement>('[role="radio"]')[next]?.focus()
  }
</script>

<div class="field">
  <span class="label" id="{id}-label">{label}</span>
  <div class="group" role="radiogroup" aria-labelledby="{id}-label" bind:this={group}>
    {#each options as option (option.value)}
      {@const chosen = value === option.value}
      <button
        type="button"
        role="radio"
        class="option"
        aria-checked={chosen}
        tabindex={chosen ? 0 : -1}
        onclick={() => (value = option.value)}
        {onkeydown}
      >
        {option.label}
      </button>
    {/each}
  </div>
  {#if hint}<p class="hint">{hint}</p>{/if}
</div>

<style>
  .field {
    display: grid;
    gap: var(--space-2);
  }

  .label {
    font-weight: 600;
  }

  .group {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 1fr;
    gap: 0.25rem;
    padding: 0.25rem;
    border-radius: var(--radius-full);
    background: var(--surface-2);
  }

  .option {
    min-height: 2.5rem;
    padding: 0 var(--space-3);
    border: 0;
    border-radius: var(--radius-full);
    background: transparent;
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--text-2);
    cursor: pointer;
    touch-action: manipulation;
    transition:
      background-color var(--dur),
      color var(--dur);
  }

  .option[aria-checked='true'] {
    background: var(--surface);
    color: var(--text);
    box-shadow: var(--shadow-sm);
  }

  .hint {
    font-size: var(--text-sm);
    line-height: 1.35;
    color: var(--text-2);
  }
</style>
