<script lang="ts">
  import X from '@lucide/svelte/icons/x'
  import Button from './Button.svelte'
  import IconButton from './IconButton.svelte'
  import InterfaceMap from './InterfaceMap.svelte'

  interface Props {
    open: boolean
    /** Start the game (also what the close button and Esc do: skipping the guide). */
    onstart: () => void
    ontutorial: () => void
    onhelp: () => void
  }

  let { open = $bindable(), onstart, ontutorial, onhelp }: Props = $props()

  let dialog = $state<HTMLDialogElement>()
  const id = $props.id()

  $effect(() => {
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    else if (!open && dialog.open) dialog.close()
  })
</script>

<!-- Esc, the backdrop and the X all mean "skip": the game starts, like the Start game button. -->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog
  bind:this={dialog}
  aria-labelledby={id}
  oncancel={(event) => {
    event.preventDefault()
    onstart()
  }}
  onclose={() => (open = false)}
  onclick={(event) => event.target === dialog && onstart()}
>
  <div class="panel">
    <header>
      <div>
        <h2 {id}>Welcome! Here's the board</h2>
        <p>A minute now saves some head-scratching later.</p>
      </div>
      <IconButton label="Skip the guide and start" onclick={onstart}><X size="1.25rem" /></IconButton>
    </header>
    <div class="scroll"><InterfaceMap extras={false} /></div>
    <footer>
      <Button size="lg" onclick={onstart}>Start game</Button>
      <div class="two">
        <Button variant="secondary" onclick={ontutorial}>Try the tutorial</Button>
        <Button variant="secondary" onclick={onhelp}>How to play</Button>
      </div>
    </footer>
  </div>
</dialog>

<style>
  dialog {
    width: min(30rem, calc(100vw - 1.5rem));
    max-width: none;
    max-height: calc(100dvh - 1.5rem);
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
    display: flex;
    flex-direction: column;
    max-height: calc(100dvh - 1.5rem);
    border: 1px solid var(--line);
    border-radius: var(--radius-xl);
    background: var(--surface);
    box-shadow: var(--shadow-lg);
    overflow: hidden;
  }

  header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-3);
    padding: var(--space-5) var(--space-4) var(--space-3) var(--space-5);
  }

  h2 {
    font-size: var(--text-xl);
    font-weight: 700;
    letter-spacing: -0.01em;
  }

  header p {
    margin-top: var(--space-1);
    font-size: var(--text-sm);
    color: var(--text-2);
  }

  .scroll {
    flex: 1;
    min-height: 0;
    padding: var(--space-2) var(--space-4) var(--space-4);
    overflow-y: auto;
  }

  footer {
    display: grid;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-5) var(--space-5);
    border-top: 1px solid var(--line);
    background: var(--surface);
  }

  .two {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-2);
  }
</style>
