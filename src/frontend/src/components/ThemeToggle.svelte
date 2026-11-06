<script lang="ts">
  import Moon from '@lucide/svelte/icons/moon'
  import Sun from '@lucide/svelte/icons/sun'
  import { scale } from 'svelte/transition'
  import { ms } from '../lib/motion'
  import { theme } from '../lib/theme.svelte'
  import IconButton from './IconButton.svelte'

  const dark = $derived(theme.current === 'dark')
</script>

<IconButton label={dark ? 'Use light theme' : 'Use dark theme'} onclick={() => theme.toggle()}>
  {#key dark}
    <span class="icon" in:scale={{ duration: ms(250), start: 0.5 }}>
      {#if dark}<Sun size="1.25rem" />{:else}<Moon size="1.25rem" />{/if}
    </span>
  {/key}
</IconButton>

<style>
  .icon {
    display: grid;
  }
</style>
