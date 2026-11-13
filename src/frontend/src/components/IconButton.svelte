<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLButtonAttributes } from 'svelte/elements'

  interface Props extends HTMLButtonAttributes {
    /** Accessible name, also shown as a tooltip. */
    label: string
    variant?: 'plain' | 'filled'
    children: Snippet
  }

  let { label, variant = 'plain', type = 'button', class: className = '', children, ...rest }: Props = $props()
</script>

<button {type} class="icon-btn {variant} {className}" aria-label={label} title={label} {...rest}>
  {@render children()}
</button>

<style>
  .icon-btn {
    display: inline-grid;
    place-items: center;
    flex: none;
    width: var(--tap);
    height: var(--tap);
    padding: 0;
    border: 1px solid transparent;
    border-radius: var(--radius-full);
    background: transparent;
    color: var(--text-2);
    cursor: pointer;
    touch-action: manipulation;
    transition:
      transform var(--dur-fast) var(--ease-out),
      background-color var(--dur),
      color var(--dur),
      opacity var(--dur);
  }

  .filled {
    width: 3.5rem;
    height: 3.5rem;
    background: var(--surface);
    border-color: var(--line);
    color: var(--text);
    box-shadow: var(--shadow-sm);
  }

  .icon-btn:active:not(:disabled) {
    transform: scale(0.92);
  }

  .icon-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  @media (hover: hover) {
    .icon-btn:hover:not(:disabled) {
      color: var(--text);
      background: var(--surface-2);
    }
    .filled:hover:not(:disabled) {
      background: var(--surface);
      border-color: var(--line-strong);
    }
  }
</style>
