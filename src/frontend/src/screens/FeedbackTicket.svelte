<script lang="ts">
  import ArrowLeft from '@lucide/svelte/icons/arrow-left'
  import Lock from '@lucide/svelte/icons/lock'
  import MessageCircleReply from '@lucide/svelte/icons/message-circle-reply'
  import Star from '@lucide/svelte/icons/star'
  import Dialog from '../components/Dialog.svelte'
  import IconButton from '../components/IconButton.svelte'
  import ScreenBar from '../components/ScreenBar.svelte'
  import SettingsButton from '../components/SettingsButton.svelte'
  import { fullStamp } from '../lib/time'
  import { api, ApiError, ownImage, sharedImage, type FeedbackView } from '../lib/api'

  /**
   * One feedback ticket, read-only, laid out like the form it was written on. It serves two addresses:
   * - `#feedback/<token>` ("yours"): the sender's own copy, with everything they sent, its status and any reply;
   * - `#feedback/shared/<code>` ("shared"): a ticket the team shared by link, with only the fields they chose.
   * The server decides what each one may see; this screen shows whatever comes back.
   */
  interface Props {
    mode: 'yours' | 'shared'
    /** The sender's token, or the share code. */
    id: string
    onback: () => void
  }

  let { mode, id, onback }: Props = $props()

  let ticket = $state<FeedbackView | null>(null)
  let phase = $state<'loading' | 'ready' | 'missing' | 'failed'>('loading')
  /** The screenshot opened at full size (its number), or null. */
  let zoomed = $state<number | null>(null)
  let attempt = $state(0)

  // Loaded again whenever the address changes: going from one ticket to another keeps this screen mounted.
  $effect(() => {
    void attempt
    const wanted = { mode, id }
    let stale = false
    phase = 'loading'
    ticket = null
    zoomed = null
    ;(wanted.mode === 'yours' ? api.ownFeedback(wanted.id) : api.sharedFeedback(wanted.id))
      .then((view) => {
        if (stale) return
        ticket = view ?? {}
        phase = 'ready'
      })
      .catch((failure) => {
        if (stale) return
        phase = failure instanceof ApiError && failure.status === 404 ? 'missing' : 'failed'
      })
    return () => {
      stale = true
    }
  })

  const STATUS = { pending: 'Received', active: 'In progress', closed: 'Closed' } as const
  const STATUS_NOTE = {
    pending: "We have it, and haven't got to it yet.",
    active: "We're looking into it.",
    closed: 'This one is done.',
  } as const
  const CATEGORY = { bug: 'Bug', idea: 'Idea', praise: 'Praise' } as const

  const image = (n: number) => (mode === 'yours' ? ownImage(id, n) : sharedImage(id, n))
  const shots = $derived(Array.from({ length: Math.max(0, ticket?.images ?? 0) }, (_, i) => i))

  /** A server date (ISO, UTC) in the reader's own time, or '' if there isn't one. */
  function when(iso: string | null | undefined): string {
    if (!iso) return ''
    const date = new Date(iso)
    return Number.isNaN(date.getTime())
      ? ''
      : fullStamp.format(date)
  }

  const details = $derived(
    ticket
      ? (
          [
            ['Player', ticket.player],
            ['Name', ticket.name],
            ['WhatsApp', ticket.whatsapp],
            ['Email', ticket.email],
            ['App', ticket.app],
          ] as const
        ).filter(([, value]) => value)
      : [],
  )
  const empty = $derived(
    !!ticket &&
      !ticket.message &&
      !ticket.rating &&
      !ticket.category &&
      !ticket.status &&
      !ticket.response &&
      !shots.length &&
      !details.length,
  )
</script>

<div class="screen">
  <ScreenBar>
    <IconButton label="Back" onclick={onback}><ArrowLeft size="1.25rem" /></IconButton>
    <h1>{mode === 'yours' ? 'Your feedback' : 'Shared feedback'}</h1>
    <SettingsButton />
  </ScreenBar>

  <main>
    {#if phase === 'loading'}
      <section role="status"><p class="lead">Loading…</p></section>
    {:else if phase === 'missing'}
      <section>
        {#if mode === 'yours'}
          <h2>We can't find this feedback</h2>
          <p class="lead">The link may be incomplete, or the feedback may have been removed.</p>
        {:else}
          <h2>This feedback isn't shared</h2>
          <p class="lead">The link may have been changed or switched off by the team.</p>
        {/if}
      </section>
    {:else if phase === 'failed' || !ticket}
      <section>
        <h2>Couldn't load it</h2>
        <p class="lead">Check your connection and try again.</p>
        <button type="button" class="retry" onclick={() => attempt++}>Try again</button>
      </section>
    {:else if empty}
      <section>
        <h2>Nothing to show</h2>
        <p class="lead">Nothing in this feedback is shared at the moment.</p>
      </section>
    {:else}
      {#if ticket.status || when(ticket.date)}
        <section class="state">
          {#if ticket.status}
            <div class="field">
              <span class="label">Status</span>
              <p><span class="chip {ticket.status}">{STATUS[ticket.status]}</span> <span class="lead">{STATUS_NOTE[ticket.status]}</span></p>
            </div>
          {/if}
          {#if when(ticket.date)}
            <div class="field">
              <span class="label">Sent</span>
              <p>{when(ticket.date)}</p>
            </div>
          {/if}
        </section>
      {/if}

      {#if ticket.response}
        <section class="reply">
          <h2><MessageCircleReply size="1.25rem" /> Reply from the team</h2>
          <p class="message">{ticket.response}</p>
          {#if when(ticket.responded_at)}<p class="note">{when(ticket.responded_at)}</p>{/if}
        </section>
      {/if}

      {#if ticket.rating || ticket.category || ticket.message}
        <section>
          {#if ticket.rating}
            <div class="field">
              <span class="label">Rating</span>
              <div class="stars" role="img" aria-label="{ticket.rating} of 5 stars">
                {#each [1, 2, 3, 4, 5] as n (n)}
                  <span class:on={n <= ticket.rating}><Star size="1.75rem" /></span>
                {/each}
              </div>
            </div>
          {/if}
          {#if ticket.category}
            <div class="field">
              <span class="label">What it is about</span>
              <p><span class="chip">{CATEGORY[ticket.category]}</span></p>
            </div>
          {/if}
          {#if ticket.message}
            <div class="field">
              <span class="label">Message</span>
              <p class="message boxed">{ticket.message}</p>
            </div>
          {/if}
        </section>
      {/if}

      {#if shots.length}
        <section>
          <div class="field">
            <span class="label">Screenshots</span>
            <ul class="shots">
              {#each shots as n (n)}
                <li>
                  <button type="button" aria-label="Open screenshot {n + 1} at full size" onclick={() => (zoomed = n)}>
                    <img src={image(n)} alt="Screenshot {n + 1}" loading="lazy" />
                  </button>
                </li>
              {/each}
            </ul>
          </div>
        </section>
      {/if}

      {#if details.length}
        <section>
          <div class="field">
            <span class="label">{mode === 'yours' ? 'How to reach you' : 'Details'}</span>
            <dl>
              {#each details as [label, value] (label)}<dt>{label}</dt><dd>{value}</dd>{/each}
            </dl>
          </div>
        </section>
      {/if}

      <p class="privacy">
        <Lock size="1rem" />
        {#if mode === 'yours'}
          <span>
            This is your own copy of what you sent. Only someone with this link can read it, and the link is kept on
            this device.
          </span>
        {:else}
          <span>The Anagram Master team shared this by link. It is read-only, and shows only what they chose to share.</span>
        {/if}
      </p>
    {/if}
  </main>
</div>

<Dialog
  bind:open={() => zoomed !== null, (open) => !open && (zoomed = null)}
  title={zoomed === null ? 'Screenshot' : `Screenshot ${zoomed + 1}`}
>
  {#if zoomed !== null}
    <img class="full" src={image(zoomed)} alt="Screenshot {zoomed + 1}, full size" />
  {/if}
</Dialog>

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

  /* The same cards as the form this was written on. */
  section {
    display: grid;
    gap: var(--space-4);
    padding: var(--space-5);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--surface);
  }

  .state {
    grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  }

  .reply {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 7%, var(--surface));
  }

  h2 {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-base);
    font-weight: 700;
  }

  .reply h2 :global(svg) {
    color: var(--accent);
  }

  .lead {
    color: var(--text-2);
  }

  .field {
    display: grid;
    gap: var(--space-2);
  }

  .label {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--text-2);
  }

  .message {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    line-height: 1.4;
    user-select: text;
    -webkit-user-select: text;
  }

  .boxed {
    padding: var(--space-3) var(--space-4);
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    background: var(--bg);
  }

  .chip {
    display: inline-block;
    padding: 0 var(--space-3);
    border: 1px solid currentColor;
    border-radius: var(--radius-full);
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--text-2);
  }

  .chip.pending {
    color: var(--warn);
  }

  .chip.active {
    color: var(--accent);
  }

  .chip.closed {
    color: var(--good, #1a9b5a);
  }

  .stars {
    display: flex;
    gap: var(--space-1);
  }

  .stars span {
    display: grid;
    place-items: center;
    width: 2.75rem;
    height: 2.75rem;
    color: var(--text-3);
  }

  .stars span.on {
    color: #e5a400;
  }

  .stars span.on :global(svg) {
    fill: currentColor;
  }

  .shots {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(6rem, 1fr));
    gap: var(--space-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .shots button {
    display: block;
    width: 100%;
    aspect-ratio: 1;
    padding: 0;
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    background: var(--surface-2);
    overflow: hidden;
    cursor: zoom-in;
  }

  .shots img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .full {
    display: block;
    max-width: 100%;
    margin: 0 auto;
    border-radius: var(--radius-md);
  }

  dl {
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr);
    gap: var(--space-1) var(--space-4);
    margin: 0;
  }

  dt {
    color: var(--text-3);
  }

  dd {
    margin: 0;
    overflow-wrap: anywhere;
    user-select: text;
    -webkit-user-select: text;
  }

  .note {
    font-size: var(--text-sm);
    color: var(--text-3);
  }

  .privacy {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--space-2);
    padding-inline: var(--space-2);
    font-size: var(--text-sm);
    color: var(--text-3);
  }

  .retry {
    justify-self: start;
    min-height: var(--tap);
    padding: 0 var(--space-5);
    border: 1px solid var(--line);
    border-radius: var(--radius-full);
    background: transparent;
    font: inherit;
    font-weight: 600;
    color: var(--text);
    cursor: pointer;
  }
</style>
