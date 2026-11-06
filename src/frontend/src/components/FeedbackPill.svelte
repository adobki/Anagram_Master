<script lang="ts">
  import CircleX from '@lucide/svelte/icons/circle-x'
  import Info from '@lucide/svelte/icons/info'
  import Sparkles from '@lucide/svelte/icons/sparkles'
  import { fade, fly } from 'svelte/transition'
  import type { Feedback } from '../lib/game'
  import { ms } from '../lib/motion'

  let { feedback }: { feedback: (Feedback & { id: number }) | null } = $props()
</script>

<div class="slot" role="status">
  {#if feedback}
    {#key feedback.id}
      <p
        class="pill {feedback.tone}"
        in:fly|global={{ y: 8, duration: ms(200) }}
        out:fade|global={{ duration: ms(150) }}
      >
        {#if feedback.tone === 'good'}
          <Sparkles size={16} />
        {:else if feedback.tone === 'bad'}
          <CircleX size={16} />
        {:else}
          <Info size={16} />
        {/if}
        {feedback.text}
      </p>
    {/key}
  {/if}
</div>

<style>
  .slot {
    display: grid;
    place-items: center;
    min-height: 2.25rem;
  }

  .pill {
    grid-area: 1 / 1;
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-4);
    border-radius: var(--radius-full);
    font-size: var(--text-sm);
    font-weight: 600;
    text-align: center;
  }

  .good {
    background: var(--good-soft);
    color: var(--good);
  }

  .bad {
    background: var(--warn-soft);
    color: var(--warn);
  }

  .info {
    background: var(--surface-2);
    color: var(--text-2);
  }
</style>
