<script lang="ts">
  import RefreshCw from '@lucide/svelte/icons/refresh-cw'
  import { fly } from 'svelte/transition'
  import { ms } from '../lib/motion'
  import { update } from '../lib/update.svelte'
  import Button from './Button.svelte'

  interface Props {
    /** Hold the prompt back while a game is on screen, so it never interrupts play. */
    hidden?: boolean
  }

  let { hidden = false }: Props = $props()
</script>

{#if update.ready && !hidden}
  <div class="update" role="status" in:fly={{ y: 24, duration: ms(260) }}>
    <RefreshCw size="1.25rem" />
    <p>
      {#if update.elsewhere}
        Anagram Master was updated in another window. Reload to use it.
      {:else if update.waiting}
        Version {update.waiting} is ready.
      {:else}
        A new version of Anagram Master is ready.
      {/if}
    </p>
    <div class="actions">
      <Button variant="ghost" size="sm" onclick={() => update.dismiss()}>Later</Button>
      <Button size="sm" onclick={() => update.apply()}>{update.elsewhere ? 'Reload' : 'Update'}</Button>
    </div>
  </div>
{/if}

<style>
  .update {
    position: fixed;
    left: 50%;
    bottom: max(env(safe-area-inset-bottom), var(--space-4));
    z-index: 55;
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: var(--space-2) var(--space-3);
    width: min(26rem, calc(100vw - 2rem));
    padding: var(--space-4);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--surface);
    box-shadow: var(--shadow-lg);
    translate: -50% 0;
  }

  .update :global(svg) {
    color: var(--accent);
  }

  p {
    font-weight: 600;
  }

  .actions {
    grid-column: 1 / -1;
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
  }
</style>
