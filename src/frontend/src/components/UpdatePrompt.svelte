<script lang="ts">
  import RefreshCw from '@lucide/svelte/icons/refresh-cw'
  import { useRegisterSW } from 'virtual:pwa-register/svelte'
  import { fly } from 'svelte/transition'
  import { ms } from '../lib/motion'
  import Button from './Button.svelte'

  interface Props {
    /** Hold the prompt back while a game is on screen, so it never interrupts play. */
    hidden?: boolean
  }

  let { hidden = false }: Props = $props()

  const HOUR = 60 * 60 * 1000

  // Registers the service worker. A new version installs in the background
  // and waits; the player chooses when to switch to it.
  const { needRefresh, updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (registration) setInterval(() => registration.update(), HOUR)
    },
  })

  // The waiting version's number, read from the server (dist/version.json).
  let waiting = $state<string | null>(null)
  $effect(() => {
    if (!$needRefresh) return
    fetch('/version.json', { cache: 'no-store' })
      .then((reply) => reply.json())
      .then((data) => (waiting = typeof data.version === 'string' ? data.version : null))
      .catch(() => {}) // keep the plain message
  })
</script>

{#if $needRefresh && !hidden}
  <div class="update" role="status" in:fly={{ y: 24, duration: ms(260) }}>
    <RefreshCw size="1.25rem" />
    <p>{waiting ? `Version ${waiting} is ready.` : 'A new version of Anagram Master is ready.'}</p>
    <div class="actions">
      <Button variant="ghost" size="sm" onclick={() => needRefresh.set(false)}>Later</Button>
      <Button size="sm" onclick={() => updateServiceWorker(true)}>Update</Button>
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
