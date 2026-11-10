<script lang="ts">
  interface Props {
    label: string
    /** A line of explanation under the label. */
    hint?: string
    checked: boolean
    disabled?: boolean
    /** Just the switch, for a row that has its own text. The label then names it for screen readers only. */
    bare?: boolean
    onchange?: (checked: boolean) => void
  }

  let { label, hint, checked = $bindable(), disabled = false, bare = false, onchange }: Props = $props()
  const id = $props.id()

  function flip() {
    checked = !checked
    onchange?.(checked)
  }
</script>

{#if bare}
  <button type="button" role="switch" class="control" aria-checked={checked} aria-label={label} {disabled} onclick={flip}>
    <span class="track" aria-hidden="true"><span class="knob"></span></span>
  </button>
{:else}
  <!-- The whole row is the switch, so it is easy to hit with a thumb. -->
  <button
    type="button"
    role="switch"
    class="row"
    aria-checked={checked}
    aria-labelledby="{id}-label"
    aria-describedby={hint ? `${id}-hint` : undefined}
    {disabled}
    onclick={flip}
  >
    <span class="text">
      <span id="{id}-label" class="label">{label}</span>
      {#if hint}<span id="{id}-hint" class="hint">{hint}</span>{/if}
    </span>
    <span class="track" aria-hidden="true"><span class="knob"></span></span>
  </button>
{/if}

<style>
  button {
    border: 0;
    background: transparent;
    color: inherit;
    cursor: pointer;
    touch-action: manipulation;
  }

  button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    min-height: var(--tap);
    padding: var(--space-3) var(--space-2);
    /* Reach a little past the text column, so the pressed highlight has room. */
    margin-inline: calc(var(--space-2) * -1);
    width: calc(100% + var(--space-4));
    border-radius: var(--radius-md);
    text-align: left;
    transition: background-color var(--dur);
  }

  .row:active:not(:disabled) {
    background: var(--surface-2);
  }

  .control {
    display: inline-grid;
    place-items: center;
    flex: none;
    min-width: var(--tap);
    min-height: var(--tap);
    padding: 0;
  }

  .text {
    display: grid;
    gap: 0.125rem;
  }

  .label {
    font-weight: 600;
    color: var(--text);
  }

  .hint {
    font-size: var(--text-sm);
    line-height: 1.35;
    color: var(--text-2);
  }

  .track {
    position: relative;
    flex: none;
    width: 2.75rem;
    height: 1.625rem;
    border-radius: var(--radius-full);
    background: var(--line-strong);
    transition: background-color var(--dur);
  }

  .knob {
    position: absolute;
    top: 0.1875rem;
    left: 0.1875rem;
    width: 1.25rem;
    height: 1.25rem;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 3px rgb(0 0 0 / 0.3);
    transition: translate var(--dur) var(--ease-out);
  }

  [aria-checked='true'] .track {
    background: var(--primary);
  }

  [aria-checked='true'] .knob {
    translate: 1.125rem 0;
  }
</style>
