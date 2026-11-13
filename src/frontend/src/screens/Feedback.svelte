<script lang="ts">
  import ArrowLeft from '@lucide/svelte/icons/arrow-left'
  import CircleCheck from '@lucide/svelte/icons/circle-check'
  import ImagePlus from '@lucide/svelte/icons/image-plus'
  import Star from '@lucide/svelte/icons/star'
  import X from '@lucide/svelte/icons/x'
  import { onDestroy } from 'svelte'
  import Button from '../components/Button.svelte'
  import IconButton from '../components/IconButton.svelte'
  import ScreenBar from '../components/ScreenBar.svelte'
  import Segmented from '../components/Segmented.svelte'
  import SettingsButton from '../components/SettingsButton.svelte'
  import TextField from '../components/TextField.svelte'
  import { api, ApiError } from '../lib/api'
  import {
    ACCEPT,
    extension,
    isPickable,
    MAX_IMAGES,
    MAX_TOTAL_BYTES,
    readable,
    shrink,
  } from '../lib/images'
  import { network } from '../lib/network.svelte'
  import { player } from '../lib/player.svelte'
  import { loadTickets, saveTicket, ticketUrl, type StoredTicket } from '../lib/tickets'

  /**
   * The feedback form: a message with an optional star rating and category, up to six screenshots (shrunk here
   * before sending), and optional contact details. The player's stored name goes along with it, quietly, so a
   * report can be tied to who sent it; there is no field for it.
   */
  interface Props {
    onback: () => void
    /** After sending: back to Home. */
    onhome: () => void
  }

  let { onback, onhome }: Props = $props()

  const MAX_MESSAGE = 1000
  const E164 = /^\+[1-9]\d{6,14}$/
  const EMAIL = /^[^@\s<>"]+@[^@\s<>"]+\.[^@\s<>"]+$/
  const DRAFT = 'am-feedback'

  // A half-written message survives a closed tab. It is cleared once sent, and by "Clear my data".
  function loadDraft(): string {
    try {
      return (localStorage.getItem(DRAFT) ?? '').slice(0, MAX_MESSAGE)
    } catch {
      return ''
    }
  }

  let rating = $state(0)
  let category = $state<'bug' | 'idea' | 'praise'>('idea')
  let message = $state(loadDraft())
  let name = $state('')
  let whatsapp = $state('')
  let email = $state('')
  /** A field only bots fill in (it is hidden off-screen). */
  let website = $state('')

  interface Item {
    id: number
    name: string
    blob: Blob
    url: string
  }
  let items = $state<Item[]>([])
  let seq = 0
  let imageNote = $state('')
  let picking = $state(false)
  let sending = $state(false)
  let sent = $state(false)
  let error = $state('')
  /** The token of the ticket just sent (its read-only page shows the status and any reply). */
  let sentId = $state('')
  const mine: StoredTicket[] = loadTickets()

  $effect(() => {
    const text = message
    try {
      if (text.trim()) localStorage.setItem(DRAFT, text)
      else localStorage.removeItem(DRAFT)
    } catch {
      // Storage is blocked: the draft just isn't kept.
    }
  })

  onDestroy(() => items.forEach((item) => URL.revokeObjectURL(item.url)))

  const messageOk = $derived(message.trim().length > 0 && message.length <= MAX_MESSAGE)
  const phoneError = $derived(
    whatsapp && !E164.test(whatsapp) ? 'Use the international form: + then the country code and number, like +2348012345678.' : undefined,
  )
  const emailError = $derived(email && !EMAIL.test(email.trim()) ? "That email address doesn't look right." : undefined)
  const total = $derived(items.reduce((sum, item) => sum + item.blob.size, 0))
  const overLimit = $derived(total > MAX_TOTAL_BYTES)
  const canSend = $derived(messageOk && !phoneError && !emailError && !overLimit && !picking && !sending && network.online)

  /** The number field takes only a + and digits (spaces and dashes from pasted numbers are dropped). */
  function cleanPhone() {
    whatsapp = whatsapp.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '')
  }

  async function pick(event: Event) {
    const input = event.currentTarget as HTMLInputElement
    const files = [...(input.files ?? [])]
    input.value = '' // so the same file can be chosen again later
    const notes: string[] = []
    picking = true
    for (const file of files) {
      if (items.length >= MAX_IMAGES) {
        notes.push(`Up to ${MAX_IMAGES} images`)
        break
      }
      const why = isPickable(file)
      if (why) {
        notes.push(why)
        continue
      }
      try {
        const blob = await shrink(file)
        items.push({ id: ++seq, name: file.name, blob, url: URL.createObjectURL(blob) })
      } catch {
        notes.push(`“${file.name}” couldn't be read as an image`)
      }
    }
    picking = false
    imageNote = notes.join('. ')
  }

  function remove(item: Item) {
    URL.revokeObjectURL(item.url)
    items = items.filter((other) => other.id !== item.id)
    imageNote = ''
  }

  async function submit(event: SubmitEvent) {
    event.preventDefault()
    if (!canSend) return
    sending = true
    error = ''
    try {
      const blobs = items.map((item) => item.blob)
      const form = new FormData()
      form.set('message', message.trim())
      if (rating) form.set('rating', String(rating))
      form.set('category', category)
      if (name.trim()) form.set('name', name.trim())
      if (whatsapp) form.set('whatsapp', whatsapp)
      if (email.trim()) form.set('email', email.trim())
      if (player.trimmed) form.set('player', player.trimmed) // not a field: sent along quietly
      form.set('website', website)
      blobs.forEach((blob, i) => form.append('images', blob, `screenshot-${i + 1}.${extension(blob)}`))
      const reply = await api.feedback(form)
      if (reply.id) {
        sentId = reply.id
        saveTicket({ id: reply.id, at: Date.now(), text: message.trim().slice(0, 60), rating: rating || undefined })
      }
      sent = true
      try {
        localStorage.removeItem(DRAFT)
      } catch {
        // Nothing to clear.
      }
    } catch (failure) {
      error =
        failure instanceof ApiError
          ? failure.message
          : "Couldn't reach the server. Check your connection and try again."
    } finally {
      sending = false
    }
  }

  const CATEGORIES = [
    { value: 'idea', label: 'Idea' },
    { value: 'bug', label: 'Bug' },
    { value: 'praise', label: 'Praise' },
  ] as const
</script>

<div class="screen">
  <ScreenBar>
    <IconButton label="Back" onclick={onback}><ArrowLeft size="1.25rem" /></IconButton>
    <h1>Send feedback</h1>
    <SettingsButton />
  </ScreenBar>

  <main>
    {#if sent}
      <section class="thanks" role="status">
        <CircleCheck size="2.5rem" />
        <h2>Thank you!</h2>
        <p>Your feedback is on its way to us. We read every message.</p>
        {#if sentId}
          <Button variant="secondary" onclick={() => location.assign(ticketUrl(sentId))}>View your feedback</Button>
        {/if}
        <Button size="lg" onclick={onhome}>Back to Home</Button>
      </section>
    {:else}
      <form onsubmit={submit} novalidate>
        <section>
          <p class="lead">What do you think of Anagram Master? A bug, an idea, or just a hello.</p>
          {#if mine.length}
            <div class="field">
              <span class="label">Your earlier feedback</span>
              <ul class="mine">
                {#each mine as ticket (ticket.id)}
                  <li>
                    <a href={ticketUrl(ticket.id)}>
                      <span class="when">{new Date(ticket.at).toLocaleDateString()}</span>
                      {ticket.text}{ticket.text.length >= 60 ? '…' : ''}
                    </a>
                  </li>
                {/each}
              </ul>
            </div>
          {/if}

          <div class="field">
            <span class="label" id="rating-label">How would you rate it? <span class="opt">(optional)</span></span>
            <div class="stars" role="radiogroup" aria-labelledby="rating-label">
              {#each [1, 2, 3, 4, 5] as n (n)}
                <button
                  type="button"
                  role="radio"
                  aria-checked={rating === n}
                  aria-label="{n} {n === 1 ? 'star' : 'stars'}"
                  class:on={n <= rating}
                  onclick={() => (rating = rating === n ? 0 : n)}
                >
                  <Star size="1.75rem" />
                </button>
              {/each}
            </div>
          </div>

          <Segmented label="What is it about?" options={[...CATEGORIES]} bind:value={category} />

          <div class="field">
            <label class="label" for="message">Your message</label>
            <textarea
              id="message"
              rows="6"
              maxlength={MAX_MESSAGE}
              placeholder="Tell us what happened, or what you'd like to see."
              bind:value={message}
            ></textarea>
            <p class="count" class:full={message.length >= MAX_MESSAGE}>{message.length}/{MAX_MESSAGE}</p>
          </div>
        </section>

        <section>
          <div class="field">
            <span class="label">Screenshots <span class="opt">(optional, up to {MAX_IMAGES})</span></span>
            {#if items.length}
              <ul class="shots">
                {#each items as item (item.id)}
                  <li>
                    <img src={item.url} alt="Screenshot: {item.name}" />
                    <span class="size">{readable(item.blob.size)}</span>
                    <button type="button" class="drop" aria-label="Remove {item.name}" onclick={() => remove(item)}>
                      <X size="1rem" />
                    </button>
                  </li>
                {/each}
              </ul>
            {/if}
            <label class="pick" class:disabled={items.length >= MAX_IMAGES || picking}>
              <ImagePlus size="1.25rem" />
              {picking ? 'Preparing…' : items.length ? 'Add more' : 'Add screenshots'}
              <input
                type="file"
                accept={ACCEPT}
                multiple
                disabled={items.length >= MAX_IMAGES || picking}
                onchange={pick}
              />
            </label>
            <p class="note" aria-live="polite">
              PNG, JPEG or WebP, any size. They are shrunk on your device, and all together must come to {readable(
                MAX_TOTAL_BYTES,
              )} or less{items.length ? ` (now ${readable(total)})` : ''}.
              {#if overLimit}<span class="warn">That is over the limit: remove one or more.</span>{/if}
              {#if imageNote}<span class="warn">{imageNote}.</span>{/if}
            </p>
          </div>
        </section>

        <section>
          <p class="lead">Want a reply? Leave a way to reach you. All three are optional.</p>
          <TextField label="Your name" placeholder="e.g. Ada" maxlength={40} autocomplete="name" bind:value={name} />
          <TextField
            label="WhatsApp number"
            placeholder="+2348012345678"
            inputmode="tel"
            autocomplete="tel"
            maxlength={24}
            error={phoneError}
            hint="With the country code, like +2348012345678."
            bind:value={whatsapp}
            oninput={cleanPhone}
          />
          <TextField
            label="Email"
            placeholder="e.g. ada@example.com"
            inputmode="email"
            autocomplete="email"
            maxlength={120}
            error={emailError}
            bind:value={email}
          />
          <p class="privacy">
            Your name, WhatsApp number and email are optional. We use them only to reply to you or follow up on your
            feedback, and we don't share them.
          </p>
        </section>

        <div class="away" aria-hidden="true">
          <label>Website <input type="text" tabindex="-1" autocomplete="off" bind:value={website} /></label>
        </div>

        {#if error}<p class="error" role="alert">{error}</p>{/if}
        {#if !network.online}<p class="error" role="status">You're offline. Connect to send your feedback.</p>{/if}

        <Button type="submit" size="lg" block disabled={!canSend}>{sending ? 'Sending…' : 'Send feedback'}</Button>
      </form>
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
  }

  form {
    display: grid;
    gap: var(--space-3);
  }

  section {
    display: grid;
    gap: var(--space-4);
    padding: var(--space-5);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--surface);
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

  .opt {
    font-weight: 400;
    color: var(--text-3);
  }

  .stars {
    display: flex;
    gap: var(--space-1);
  }

  .stars button {
    display: grid;
    place-items: center;
    width: 2.75rem;
    height: 2.75rem;
    padding: 0;
    border: 0;
    border-radius: var(--radius-full);
    background: transparent;
    color: var(--text-3);
    cursor: pointer;
  }

  .stars button.on {
    color: #e5a400;
  }

  .stars button.on :global(svg) {
    fill: currentColor;
  }

  textarea {
    width: 100%;
    min-height: 8rem;
    padding: var(--space-3) var(--space-4);
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    background: var(--surface);
    font: inherit;
    font-size: var(--text-lg); /* 16px+ keeps iOS from zooming in */
    line-height: 1.4;
    resize: vertical;
    box-shadow: var(--shadow-sm);
  }

  textarea:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 4px rgb(247 63 82 / 0.18);
  }

  .count {
    text-align: right;
    font-size: var(--text-xs);
    font-variant-numeric: tabular-nums;
    color: var(--text-3);
  }

  .count.full {
    color: var(--warn);
  }

  .shots {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(6rem, 1fr));
    gap: var(--space-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .shots li {
    position: relative;
    aspect-ratio: 1;
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  .shots img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .size {
    position: absolute;
    left: var(--space-1);
    bottom: var(--space-1);
    padding: 0 var(--space-2);
    border-radius: var(--radius-full);
    background: rgb(0 0 0 / 0.6);
    font-size: var(--text-xs);
    color: #fff;
  }

  .drop {
    position: absolute;
    top: var(--space-1);
    right: var(--space-1);
    display: grid;
    place-items: center;
    width: 1.75rem;
    height: 1.75rem;
    padding: 0;
    border: 0;
    border-radius: var(--radius-full);
    background: rgb(0 0 0 / 0.6);
    color: #fff;
    cursor: pointer;
  }

  .pick {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    min-height: var(--tap);
    padding: 0 var(--space-5);
    border: 1px dashed var(--line);
    border-radius: var(--radius-full);
    font-weight: 600;
    color: var(--text-2);
    cursor: pointer;
  }

  .pick.disabled {
    opacity: 0.5;
    pointer-events: none;
  }

  .pick input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
  }

  .mine {
    display: grid;
    gap: var(--space-1);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .mine a {
    display: block;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    color: var(--text);
    text-decoration: none;
    overflow-wrap: anywhere;
  }

  .mine .when {
    margin-right: var(--space-2);
    font-size: var(--text-xs);
    color: var(--text-3);
  }

  .note,
  .privacy {
    font-size: var(--text-sm);
    color: var(--text-3);
  }

  .warn,
  .error {
    color: var(--warn);
  }

  .error {
    font-size: var(--text-sm);
    font-weight: 600;
  }

  .away {
    position: absolute;
    left: -9999px;
    width: 1px;
    height: 1px;
    overflow: hidden;
  }

  .thanks {
    justify-items: center;
    text-align: center;
  }

  .thanks :global(svg) {
    color: var(--good, #1a9b5a);
  }

  .thanks h2 {
    font-size: var(--text-xl);
    font-weight: 700;
  }
</style>
