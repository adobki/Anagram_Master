<script lang="ts">
  import Download from '@lucide/svelte/icons/download'
  import Ellipsis from '@lucide/svelte/icons/ellipsis'
  import MonitorDown from '@lucide/svelte/icons/monitor-down'
  import Share from '@lucide/svelte/icons/share'
  import SquarePlus from '@lucide/svelte/icons/square-plus'
  import { browser, install, platform, type Platform } from '../lib/install.svelte'

  /**
   * Step-by-step instructions for adding the app to the home screen (or installing it on a computer). Browsers
   * differ, and some (Safari on iPhone and iPad, Firefox) can't be asked to do it from a button, so this says
   * which menu to use. Shows this device's steps first; `only` shows just one set (the install dialog).
   */
  let { only = false }: { only?: boolean } = $props()

  const order = $derived<Platform[]>([platform, ...(['ios', 'android', 'desktop'] as Platform[]).filter((p) => p !== platform)])
  const shown = $derived(only ? [platform] : order)
</script>

<div class="steps">
  {#each shown as kind (kind)}
    <section class:here={kind === platform}>
      <h4>
        {#if kind === 'ios'}iPhone and iPad{:else if kind === 'android'}Android{:else}Computer{/if}
        {#if kind === platform && !only}<span class="you">this device</span>{/if}
      </h4>

      {#if kind === 'ios'}
        <ol>
          <li>
            <Share size="1.125rem" />
            <span>
              Tap the <strong>Share</strong> button{#if browser === 'safari'}{' '}in Safari's toolbar (at the bottom on an iPhone, at the top on an iPad){:else}{' '}(or the menu next to the address bar){/if}.
            </span>
          </li>
          <li>
            <SquarePlus size="1.125rem" />
            <span>Scroll down and tap <strong>Add to Home Screen</strong>.</span>
          </li>
          <li>
            <Download size="1.125rem" />
            <span>Tap <strong>Add</strong>, then open Anagram Master from its icon on your home screen.</span>
          </li>
        </ol>
        <p class="note">
          Apple doesn't let a website start this from a button, so it has to be done from the Share menu.
          {#if browser !== 'safari'}If your browser doesn't offer Add to Home Screen, open this page in Safari.{/if}
        </p>
      {:else if kind === 'android'}
        <ol>
          <li>
            <Ellipsis size="1.125rem" />
            <span>Open your browser's <strong>menu</strong> (the three dots).</span>
          </li>
          <li>
            <SquarePlus size="1.125rem" />
            <span>
              Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>{#if browser === 'samsung'}{' '}(in Samsung Internet: <strong>Add page to</strong>, then <strong>Home screen</strong>){/if}.
            </span>
          </li>
          <li>
            <Download size="1.125rem" />
            <span>Confirm, then open Anagram Master from your home screen.</span>
          </li>
        </ol>
        <p class="note">Chrome sometimes offers an Install button of its own, which is quicker when it is there.</p>
      {:else}
        <ol>
          <li>
            <MonitorDown size="1.125rem" />
            <span>
              In Chrome or Edge, click the <strong>Install</strong> icon at the right end of the address bar, or open the
              menu and choose <strong>Install Anagram Master</strong> (Edge: <strong>Apps</strong>, then <strong>Install this site as an app</strong>).
            </span>
          </li>
          <li>
            <Download size="1.125rem" />
            <span>Confirm. It opens in its own window and gets an icon in your Start menu or Applications.</span>
          </li>
        </ol>
        <p class="note">Safari on a Mac: File, then Add to Dock. Firefox on a computer can't install web apps.</p>
      {/if}
    </section>
  {/each}
  {#if install.available}
    <p class="note">Your browser has offered to install it: use the Install button.</p>
  {/if}
</div>

<style>
  .steps {
    display: grid;
    gap: var(--space-4);
    text-align: left;
  }

  section {
    display: grid;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--surface);
  }

  section.here {
    border-color: color-mix(in srgb, var(--accent) 45%, var(--line));
  }

  h4 {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-sm);
    font-weight: 700;
    color: var(--text);
  }

  .you {
    padding: 0 var(--space-2);
    border-radius: var(--radius-full);
    background: color-mix(in srgb, var(--accent) 14%, transparent);
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--accent);
  }

  ol {
    display: grid;
    gap: var(--space-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: start;
    gap: var(--space-3);
    font-size: var(--text-sm);
    line-height: 1.45;
    color: var(--text-2);
  }

  li :global(svg) {
    margin-top: 0.1rem;
    color: var(--accent);
  }

  strong {
    color: var(--text);
  }

  .note {
    font-size: var(--text-xs);
    color: var(--text-3);
  }
</style>
