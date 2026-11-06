<script lang="ts">
  import { fade, fly } from 'svelte/transition'
  import { ms } from '../lib/motion'
  import { toasts } from '../lib/toast.svelte'
</script>

<div class="toaster" role="status">
  {#each toasts.items as toast (toast.id)}
    <p class="toast" in:fly={{ y: 16, duration: ms(220) }} out:fade={{ duration: ms(160) }}>{toast.text}</p>
  {/each}
</div>

<style>
  .toaster {
    position: fixed;
    left: 50%;
    bottom: max(env(safe-area-inset-bottom), var(--space-6));
    z-index: 50;
    display: grid;
    justify-items: center;
    gap: var(--space-2);
    width: max-content;
    max-width: calc(100vw - 2rem);
    transform: translateX(-50%);
    pointer-events: none;
  }

  .toast {
    padding: var(--space-3) var(--space-5);
    border-radius: var(--radius-full);
    background: var(--text);
    color: var(--bg);
    font-weight: 500;
    text-align: center;
    box-shadow: var(--shadow-lg);
  }
</style>
