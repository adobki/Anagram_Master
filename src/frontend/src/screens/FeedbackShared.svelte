<script lang="ts">
  import ArrowLeft from '@lucide/svelte/icons/arrow-left'
  import Star from '@lucide/svelte/icons/star'
  import { onMount } from 'svelte'
  import IconButton from '../components/IconButton.svelte'
  import ScreenBar from '../components/ScreenBar.svelte'
  import SettingsButton from '../components/SettingsButton.svelte'
  import { api, sharedImage, type SharedFeedback } from '../lib/api'

  /**
   * A feedback ticket the team shared by link (#feedback/shared/<code>): read-only, and showing only the
   * fields they chose to share.
   */
  interface Props {
    code: string
    onback: () => void
  }

  let { code, onback }: Props = $props()

  let ticket = $state<SharedFeedback | null>(null)
  let phase = $state<'loading' | 'ready' | 'missing' | 'failed'>('loading')

  onMount(async () => {
    try {
      ticket = await api.sharedFeedback(code)
      phase = 'ready'
    } catch (failure) {
      phase = (failure as { status?: number }).status === 404 ? 'missing' : 'failed'
    }
  })

  const STATUS = { pending: 'Pending', active: 'Active', closed: 'Closed' } as const
  const CATEGORY = { bug: 'Bug', idea: 'Idea', praise: 'Praise' } as const
  const details = $derived(
    ticket
      ? ([
          ['Player', ticket.player],
          ['Name', ticket.name],
          ['Email', ticket.email],
          ['WhatsApp', ticket.whatsapp],
          ['App', ticket.app],
        ] as const).filter(([, value]) => value)
      : [],
  )
</script>

<div class="screen">
  <ScreenBar>
    <IconButton label="Back" onclick={onback}><ArrowLeft size="1.25rem" /></IconButton>
    <h1>Shared feedback</h1>
    <SettingsButton />
  </ScreenBar>

  <main>
    {#if phase === 'loading'}
      <p class="muted" role="status">Loading…</p>
    {:else if phase === 'missing'}
      <section class="card">
        <h2>This feedback isn't shared (any more)</h2>
        <p class="muted">The link may have been changed or switched off.</p>
      </section>
    {:else if phase === 'failed' || !ticket}
      <section class="card">
        <h2>Couldn't load it</h2>
        <p class="muted">Check your connection and try again.</p>
      </section>
    {:else}
      <div class="chips">
        {#if ticket.status}<span class="chip {ticket.status}">{STATUS[ticket.status]}</span>{/if}
        {#if ticket.category}<span class="chip">{CATEGORY[ticket.category]}</span>{/if}
        {#if ticket.rating}
          <span class="stars" role="img" aria-label="{ticket.rating} of 5 stars">
            {#each [1, 2, 3, 4, 5] as n (n)}<Star size="1rem" class={n <= (ticket.rating ?? 0) ? 'on' : ''} />{/each}
          </span>
        {/if}
        {#if ticket.date}<span class="muted">{new Date(ticket.date).toLocaleString()}</span>{/if}
      </div>

      {#if ticket.message}
        <section class="card"><p class="message">{ticket.message}</p></section>
      {/if}

      {#if ticket.images}
        <section class="card">
          <ul class="shots">
            {#each Array.from({ length: ticket.images }, (_, i) => i) as i (i)}
              <li><a href={sharedImage(code, i)} target="_blank" rel="noopener"><img src={sharedImage(code, i)} alt="Screenshot {i + 1}" loading="lazy" /></a></li>
            {/each}
          </ul>
        </section>
      {/if}

      {#if ticket.response}
        <section class="card reply">
          <h2>Reply from the team</h2>
          <p class="message">{ticket.response}</p>
        </section>
      {/if}

      {#if details.length}
        <section class="card">
          <dl>
            {#each details as [label, value] (label)}<dt>{label}</dt><dd>{value}</dd>{/each}
          </dl>
        </section>
      {/if}
    {/if}
  </main>
</div>

<style>
  h1 {
    font-size: var(--text-lg);
    font-weight: 700;
  }

  main {
    flex: 1;
    width: 100%;
    max-width: 34rem;
    margin: 0 auto;
    padding-block: var(--space-4) var(--space-8);
    display: grid;
    gap: var(--space-3);
    align-content: start;
  }

  .card {
    display: grid;
    gap: var(--space-3);
    padding: var(--space-5);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--surface);
  }

  .reply {
    border-color: var(--accent);
  }

  h2 {
    font-size: var(--text-base);
    font-weight: 700;
  }

  .muted {
    color: var(--text-3);
  }

  .message {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
  }

  .chip {
    padding: 0 var(--space-3);
    border: 1px solid var(--line);
    border-radius: var(--radius-full);
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--text-2);
  }

  .chip.pending {
    color: #c98a00;
  }

  .chip.active {
    color: #2a7de1;
  }

  .chip.closed {
    color: var(--good, #1a9b5a);
  }

  .stars {
    display: inline-flex;
    color: var(--text-3);
  }

  .stars :global(svg.on) {
    color: #e5a400;
    fill: currentColor;
  }

  .shots {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(7rem, 1fr));
    gap: var(--space-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .shots img {
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
  }

  dl {
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr);
    gap: var(--space-1) var(--space-4);
    margin: 0;
    font-size: var(--text-sm);
  }

  dt {
    color: var(--text-3);
  }

  dd {
    margin: 0;
    overflow-wrap: anywhere;
  }
</style>
