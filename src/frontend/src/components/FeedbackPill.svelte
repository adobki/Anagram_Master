<script lang="ts">
  import CircleX from '@lucide/svelte/icons/circle-x'
  import Info from '@lucide/svelte/icons/info'
  import PartyPopper from '@lucide/svelte/icons/party-popper'
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
        {#if feedback.tone === 'great'}
          <PartyPopper size="1.125rem" />
        {:else if feedback.tone === 'good'}
          <Sparkles size="1rem" />
        {:else if feedback.tone === 'bad'}
          <CircleX size="1rem" />
        {:else}
          <Info size="1rem" />
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

  .great {
    padding: var(--space-2) var(--space-5);
    background: linear-gradient(135deg, var(--primary), #f59e0b);
    color: #fff;
    font-size: var(--text-base);
    font-weight: 700;
    box-shadow: 0 10px 24px -10px var(--primary);
    animation: cheer 0.6s var(--ease-spring);
  }

  @keyframes cheer {
    from {
      transform: scale(0.6);
    }
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
