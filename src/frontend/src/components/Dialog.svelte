<script lang="ts">
  import type { Snippet } from 'svelte'

  interface Props {
    open: boolean
    title: string
    /** Esc or the device's back button asked to dismiss (not the backdrop or your own buttons). */
    oncancel?: () => void
    children: Snippet
    actions: Snippet
  }

  let { open = $bindable(), title, oncancel, children, actions }: Props = $props()

  let dialog = $state<HTMLDialogElement>()
  const id = $props.id()

  // The native <dialog> provides focus trapping, Esc to close and the backdrop.
  $effect(() => {
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    else if (!open && dialog.open) dialog.close()
  })
</script>

<!-- Clicking the backdrop closes the dialog; Esc is handled natively. -->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog
  bind:this={dialog}
  aria-labelledby={id}
  oncancel={() => oncancel?.()}
  onclose={() => (open = false)}
  onclick={(event) => {
    if (event.target === dialog) open = false
  }}
>
  <div class="panel">
    <h2 {id}>{title}</h2>
    <div class="body">{@render children()}</div>
    <div class="actions">{@render actions()}</div>
  </div>
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
  dialog[open] {
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
</style>
