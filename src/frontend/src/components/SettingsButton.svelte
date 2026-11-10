<script lang="ts">
  import SettingsIcon from '@lucide/svelte/icons/settings'
  import { ui } from '../lib/ui.svelte'
  import IconButton from './IconButton.svelte'
</script>

<!-- The gear in every screen's header. It opens the one Settings fly-out that App.svelte owns. -->
<IconButton label="Settings" aria-haspopup="dialog" aria-expanded={ui.settingsOpen} onclick={() => (ui.settingsOpen = true)}>
  <span class="gear" class:open={ui.settingsOpen}><SettingsIcon size="1.25rem" /></span>
</IconButton>

<style>
  .gear {
    display: grid;
    transition: rotate var(--dur-slow) var(--ease-out);
  }

  .gear.open {
    rotate: 60deg;
  }
</style>
