<script lang="ts">
  import WifiOff from '@lucide/svelte/icons/wifi-off'
  import { slide } from 'svelte/transition'
  import { ms } from '../lib/motion'
  import { network } from '../lib/network.svelte'
</script>

{#if !network.online}
  <div class="offline" role="status" transition:slide={{ duration: ms(220) }}>
    <WifiOff size="1.125rem" />
    <span>You're offline. Games need a connection, and the clock keeps running on the server.</span>
  </div>
{/if}

<style>
  .offline {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    padding: max(env(safe-area-inset-top), var(--space-2)) var(--space-4) var(--space-2);
    background: var(--warn);
    color: #1a1305;
    font-size: var(--text-sm);
    font-weight: 600;
    text-align: center;
  }
</style>
