<script lang="ts">
  import { untrack } from 'svelte'
  import { cubicOut } from 'svelte/easing'
  import { Tween } from 'svelte/motion'
  import { ms } from '../lib/motion'

  let { score }: { score: number } = $props()

  // Counts up to the score on first show, then rolls to each new value and
  // floats the change (+8, −2) beside it.
  const shown = new Tween(0, { easing: cubicOut })
  let previous: number | null = null
  let pops = $state<{ id: number; delta: number }[]>([])
  let nextId = 0

  $effect(() => {
    const value = score
    shown.set(value, { duration: ms(previous === null ? 900 : 450) })
    if (previous !== null && value !== previous) {
      const id = ++nextId
      const delta = value - previous
      untrack(() => pops.push({ id, delta }))
      setTimeout(() => (pops = pops.filter((pop) => pop.id !== id)), 1100)
    }
    previous = value
  })
</script>

<div class="score">
  <span class="label">Score</span>
  <span class="value">{Math.round(shown.current)}</span>
  {#each pops as pop (pop.id)}
    <span class="pop" class:negative={pop.delta < 0} aria-hidden="true">
      {pop.delta > 0 ? '+' : '−'}{Math.abs(pop.delta)}
    </span>
  {/each}
</div>

<style>
  .score {
    position: relative;
    display: grid;
    justify-items: end;
    line-height: 1;
  }

  .label {
    font-size: var(--text-xs);
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--text-3);
  }

  .value {
    margin-top: var(--space-1);
    font-size: var(--text-3xl);
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.03em;
  }

  .pop {
    position: absolute;
    right: 100%;
    bottom: 0.25rem;
    margin-right: var(--space-2);
    font-size: var(--text-lg);
    font-weight: 800;
    color: var(--good);
    pointer-events: none;
    animation: rise 1.1s var(--ease-out) forwards;
  }

  .negative {
    color: var(--warn);
  }

  @keyframes rise {
    0% {
      opacity: 0;
      transform: translateY(8px) scale(0.7);
    }
    18% {
      opacity: 1;
      transform: translateY(0) scale(1.1);
    }
    100% {
      opacity: 0;
      transform: translateY(-24px) scale(1);
    }
  }
</style>
