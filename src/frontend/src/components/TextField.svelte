<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements'

  interface Props extends Omit<HTMLInputAttributes, 'value' | 'type'> {
    label: string
    hint?: string
    error?: string
    value?: string
  }

  let { label, hint, error, value = $bindable(''), ...rest }: Props = $props()
  const id = $props.id()
</script>

<div class="field" class:invalid={!!error}>
  <label for={id}>{label}</label>
  <input
    {id}
    type="text"
    bind:value
    aria-invalid={error ? 'true' : undefined}
    aria-describedby="{id}-message"
    {...rest}
  />
  <p id="{id}-message" class="message">{error ?? hint ?? ''}</p>
</div>

<style>
  .field {
    display: grid;
    gap: var(--space-2);
  }

  label {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--text-2);
  }

  input {
    width: 100%;
    height: 3.5rem;
    padding: 0 var(--space-4);
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    background: var(--surface);
    font-size: var(--text-lg); /* 16px+ keeps iOS from zooming in */
    font-weight: 500;
    box-shadow: var(--shadow-sm);
    transition:
      border-color var(--dur),
      box-shadow var(--dur);
  }

  input::placeholder {
    color: var(--text-3);
  }

  input:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 4px rgb(247 63 82 / 0.18);
  }

  .message {
    min-height: 1.25rem;
    font-size: var(--text-sm);
    color: var(--text-3);
  }

  .invalid input {
    border-color: var(--warn);
  }

  .invalid .message {
    color: var(--warn);
  }
</style>
