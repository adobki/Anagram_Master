<script lang="ts">
  import SettingsIcon from '@lucide/svelte/icons/settings'
  import { ui } from '../lib/ui.svelte'
  import { update } from '../lib/update.svelte'
  import IconButton from './IconButton.svelte'

  interface Props {
    /** Flash, to point the player at it (the tutorial's Settings step). */
    hot?: boolean
  }

  let { hot = false }: Props = $props()
</script>

<!--
  The gear in every screen's header. It opens the one Settings fly-out that
  App.svelte owns. A dot means an update is waiting (the banner is held back
  during a game, so this is how a player in one finds out).
-->
<IconButton
  class={hot ? 'guide-hot' : ''}
  label={update.ready ? 'Settings (an update is ready)' : 'Settings'}
  aria-haspopup="dialog"
  aria-expanded={ui.settingsOpen}
  onclick={() => (ui.settingsOpen = true)}
>
  <span class="wrap">
    <span class="gear" class:open={ui.settingsOpen}><SettingsIcon size="1.25rem" /></span>
    {#if update.ready}<span class="dot" aria-hidden="true"></span>{/if}
  </span>
</IconButton>

<style>
  .wrap {
    position: relative;
    display: grid;
  }

  .gear {
    display: grid;
    transition: rotate var(--dur-slow) var(--ease-out);
  }

  .gear.open {
    rotate: 60deg;
  }

  .dot {
    position: absolute;
    top: -0.25rem;
    right: -0.25rem;
    width: 0.625rem;
    height: 0.625rem;
    border: 2px solid var(--bg);
    border-radius: 50%;
    background: var(--accent);
    box-sizing: content-box;
  }
</style>
