<script lang="ts">
  import X from '@lucide/svelte/icons/x'
  import type { Snippet } from 'svelte'
  import IconButton from './IconButton.svelte'

  interface Props {
    open: boolean
    title: string
    /** 'right' is a full-height fly-out (Settings). The default is a dialog in the middle of the screen. */
    placement?: 'center' | 'right'
    /** Esc or the device's back button asked to dismiss (not the backdrop or your own buttons). */
    oncancel?: () => void
    /** Right placement only: stays fixed under the title, outside the scrolling body. */
    top?: Snippet
    children: Snippet
    /** The button row of a centred dialog. */
    actions?: Snippet
  }

  let { open = $bindable(), title, placement = 'center', oncancel, top, children, actions }: Props = $props()

  let dialog = $state<HTMLDialogElement>()
  let scroll = $state<HTMLElement>()
  const id = $props.id()

  // The native <dialog> provides focus trapping, Esc to close and the backdrop.
  $effect(() => {
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      scroll?.scrollTo(0, 0)
    } else if (!open && dialog.open) dialog.close()
  })
</script>

<!-- Clicking the backdrop closes the dialog; Esc is handled natively. -->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog
  class={placement}
  bind:this={dialog}
  aria-labelledby={id}
  oncancel={() => oncancel?.()}
  onclose={() => (open = false)}
  onclick={(event) => {
    if (event.target === dialog) open = false
  }}
>
  {#if placement === 'right'}
    <div class="sheet">
      <!-- The close button is the first thing that can take focus, so opening the sheet never raises a phone keyboard. -->
      <header>
        <h2 {id}>{title}</h2>
        <IconButton label="Close" onclick={() => (open = false)}><X size="1.25rem" /></IconButton>
      </header>
      {#if top}<div class="top">{@render top()}</div>{/if}
      <div class="scroll" bind:this={scroll}>{@render children()}</div>
    </div>
  {:else}
    <div class="panel">
      <h2 {id}>{title}</h2>
      <div class="body">{@render children()}</div>
      {#if actions}<div class="actions">{@render actions()}</div>{/if}
    </div>
  {/if}
</dialog>

<style>
  dialog {
    width: min(24rem, calc(100vw - 2rem));
    max-width: none;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--text);
  }

  dialog::backdrop {
    background: rgb(10 9 13 / 0.55);
    backdrop-filter: blur(4px);
  }

  .panel {
    display: grid;
    gap: var(--space-4);
    padding: var(--space-6);
    border: 1px solid var(--line);
    border-radius: var(--radius-xl);
    background: var(--surface);
    box-shadow: var(--shadow-lg);
  }

  /* Animate the dialog itself: moving the panel inside it pushed the panel past
     the dialog's edge for a moment, which flashed scroll bars. */
  dialog.center[open] {
    animation: pop var(--dur-slow) var(--ease-spring);
  }

  h2 {
    font-size: var(--text-xl);
    font-weight: 700;
    letter-spacing: -0.01em;
  }

  .body {
    color: var(--text-2);
  }

  .actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-3);
    margin-top: var(--space-2);
  }

  /* Give an action class="span" to take the full width. */
  .actions > :global(.span) {
    grid-column: 1 / -1;
  }

  @keyframes pop {
    from {
      opacity: 0;
      transform: translateY(12px) scale(0.96);
    }
  }

  /* ── The fly-out ─────────────────────────────────────────────────────────
     It slides in from the right edge and the app stays visible behind a light
     scrim (no blur), so a change like the theme can be seen as it happens.
     Browsers without @starting-style / allow-discrete just open and close
     without the slide. */
  dialog.right {
    inset: 0 0 0 auto;
    width: min(24rem, 88vw);
    height: 100dvh;
    max-height: none;
    margin: 0;
    overflow: hidden;
    translate: 0 0;
    transition:
      translate var(--dur-slow) var(--ease-out),
      overlay var(--dur-slow) allow-discrete,
      display var(--dur-slow) allow-discrete;
  }

  dialog.right:not([open]) {
    translate: 100% 0;
  }

  @starting-style {
    dialog.right[open] {
      translate: 100% 0;
    }
  }

  dialog.right::backdrop {
    background: rgb(10 9 13 / 0.28);
    backdrop-filter: none;
    transition:
      opacity var(--dur-slow) var(--ease-out),
      overlay var(--dur-slow) allow-discrete,
      display var(--dur-slow) allow-discrete;
  }

  dialog.right:not([open])::backdrop {
    opacity: 0;
  }

  @starting-style {
    dialog.right[open]::backdrop {
      opacity: 0;
    }
  }

  .sheet {
    display: flex;
    flex-direction: column;
    height: 100%;
    border-left: 1px solid var(--line);
    border-radius: var(--radius-xl) 0 0 var(--radius-xl);
    background: var(--surface);
    box-shadow: var(--shadow-lg);
    overflow: hidden;
  }

  .sheet header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding: max(env(safe-area-inset-top), var(--space-3)) max(env(safe-area-inset-right), var(--space-3)) var(--space-2)
      var(--space-5);
  }

  .top {
    padding: 0 max(env(safe-area-inset-right), var(--space-5)) var(--space-3) var(--space-5);
  }

  .scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: var(--space-3) max(env(safe-area-inset-right), var(--space-5)) max(env(safe-area-inset-bottom), var(--space-6))
      var(--space-5);
    border-top: 1px solid var(--line);
    color: var(--text);
  }
</style>
