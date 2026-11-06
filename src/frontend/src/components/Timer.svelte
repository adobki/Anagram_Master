<script lang="ts">
  interface Props {
    /** Seconds left. */
    time: number
    /** Seconds per round. */
    limit: number
  }

  let { time, limit }: Props = $props()

  const RADIUS = 26
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS

  const fraction = $derived(limit > 0 ? Math.min(1, Math.max(0, time / limit)) : 0)
  const level = $derived(time <= 10 ? 'danger' : time <= 30 ? 'warn' : 'calm')
  const label = $derived(`${Math.floor(time / 60)}:${String(time % 60).padStart(2, '0')}`)
</script>

<div class="timer {level}" role="timer" aria-label="{time} seconds left">
  <svg viewBox="0 0 60 60" aria-hidden="true">
    <circle class="track" cx="30" cy="30" r={RADIUS} />
    <circle
      class="bar"
      cx="30"
      cy="30"
      r={RADIUS}
      stroke-dasharray={CIRCUMFERENCE}
      stroke-dashoffset={CIRCUMFERENCE * (1 - fraction)}
    />
  </svg>
  <span class="label">{label}</span>
</div>

<style>
  .timer {
    position: relative;
    display: grid;
    place-items: center;
    width: 4rem;
    height: 4rem;
    flex: none;
  }

  svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }

  circle {
    fill: none;
    stroke-width: 5;
  }

  .track {
    stroke: var(--surface-2);
  }

  .bar {
    stroke: var(--text);
    stroke-linecap: round;
    transition:
      stroke-dashoffset 1s linear,
      stroke var(--dur-slow);
  }

  .label {
    font-size: var(--text-base);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.01em;
  }

  .warn .bar {
    stroke: var(--warn);
  }

  .danger .bar {
    stroke: var(--brand);
  }

  .danger .label {
    color: var(--accent);
    animation: beat 1s var(--ease-out) infinite;
  }

  @keyframes beat {
    0%,
    100% {
      transform: scale(1);
    }
    15% {
      transform: scale(1.15);
    }
  }
</style>
