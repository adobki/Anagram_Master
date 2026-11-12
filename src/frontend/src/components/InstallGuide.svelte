<script lang="ts">
  import { install } from '../lib/install.svelte'
  import Button from './Button.svelte'
  import Dialog from './Dialog.svelte'
  import InstallSteps from './InstallSteps.svelte'
</script>

<!-- Opened by install.start() when the browser has no install prompt to offer (iPhone and iPad, Firefox, and more). -->
<Dialog bind:open={install.guideOpen} title="Install Anagram Master">
  <p class="lead">Playing it as an app means full screen, no browser bars, and one tap from your home screen.</p>
  <InstallSteps only />
  {#snippet actions()}
    <Button onclick={() => (install.guideOpen = false)}>Got it</Button>
  {/snippet}
</Dialog>

<style>
  .lead {
    margin-bottom: var(--space-3);
    font-size: var(--text-sm);
    color: var(--text-2);
  }
</style>
