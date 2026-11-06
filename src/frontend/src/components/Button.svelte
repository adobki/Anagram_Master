<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLButtonAttributes } from 'svelte/elements'

  interface Props extends HTMLButtonAttributes {
    variant?: 'primary' | 'secondary' | 'ghost'
    size?: 'sm' | 'md' | 'lg'
    /** Stretch to the full width of the container. */
    block?: boolean
    children: Snippet
  }

  let {
    variant = 'primary',
    size = 'md',
    block = false,
    type = 'button',
    class: className = '',
    children,
    ...rest
  }: Props = $props()
</script>

<button {type} class="btn {variant} {size} {className}" class:block {...rest}>
  {@render children()}
</button>

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    min-height: var(--tap);
    padding: 0 var(--space-5);
    border: 1px solid transparent;
    border-radius: var(--radius-full);
    font-size: var(--text-base);
    font-weight: 600;
    letter-spacing: 0.01em;
    white-space: nowrap;
    cursor: pointer;
    user-select: none;
    touch-action: manipulation;
    transition:
      transform var(--dur-fast) var(--ease-out),
      background-color var(--dur),
      border-color var(--dur),
      color var(--dur),
      opacity var(--dur);
  }

  .btn:active:not(:disabled) {
    transform: scale(0.97);
  }

  .btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .sm {
    padding: 0 var(--space-4);
    font-size: var(--text-sm);
  }

  .lg {
    min-height: 3.5rem;
    padding: 0 var(--space-6);
    font-size: var(--text-lg);
  }

  .block {
    display: flex;
    width: 100%;
  }

  .primary {
    background: var(--primary);
    color: var(--on-primary);
    box-shadow:
      0 12px 24px -14px var(--primary),
      inset 0 1px 0 rgb(255 255 255 / 0.2);
  }

  .secondary {
    background: var(--surface);
    color: var(--text);
    border-color: var(--line);
    box-shadow: var(--shadow-sm);
  }

  .ghost {
    background: transparent;
    color: var(--text-2);
  }

  @media (hover: hover) {
    .primary:hover:not(:disabled) {
      background: var(--primary-hover);
    }
    .secondary:hover:not(:disabled) {
      border-color: var(--line-strong);
    }
    .ghost:hover:not(:disabled) {
      color: var(--text);
      background: var(--surface-2);
    }
  }
</style>
