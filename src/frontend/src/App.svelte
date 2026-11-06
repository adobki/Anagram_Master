<script lang="ts">
  import logo from './assets/logo.png'
  import { api } from './lib/api'

  // Placeholder screen for the scaffold: proves the app can reach the Flask
  // API through the dev proxy. The real screens replace it in missions 4–6.
  const health = api.health()
</script>

<main>
  <img src={logo} alt="Anagram Master" width="580" height="150" />
  <p class="note">New front end, scaffold only. The game screens come next.</p>

  {#await health}
    <p class="status"><span class="dot"></span>Checking the API…</p>
  {:then h}
    <p class="status" class:ok={h.Database && h.FileStorage} class:down={!h.Database || !h.FileStorage}>
      <span class="dot"></span>
      API reachable · database {h.Database ? 'up' : 'down'} · word list {h.FileStorage ? 'loaded' : 'missing'}
    </p>
  {:catch err}
    <p class="status down">
      <span class="dot"></span>
      Can't reach the API ({err.message}). Is Flask running on port 5555?
    </p>
  {/await}
</main>

<style>
  main {
    min-height: 100dvh;
    display: grid;
    place-content: center;
    justify-items: center;
    gap: 1.5rem;
    padding: 1.5rem 1rem;
    text-align: center;
  }

  img {
    width: min(100%, 22rem);
    height: auto;
  }

  .note {
    margin: 0;
    color: var(--text-muted);
  }

  .status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
    font-size: 0.875rem;
    color: var(--text-muted);
  }

  .dot {
    flex: none;
    width: 0.625rem;
    height: 0.625rem;
    border-radius: 50%;
    background: var(--wait);
  }

  .ok .dot {
    background: var(--ok);
  }

  .down .dot {
    background: var(--brand);
  }
</style>
