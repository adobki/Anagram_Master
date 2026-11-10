<script lang="ts">
  import ArrowLeft from '@lucide/svelte/icons/arrow-left'
  import Play from '@lucide/svelte/icons/play'
  import { onMount } from 'svelte'
  import architecture from '../assets/about/diagram-architecture.svg'
  import architectureDark from '../assets/about/diagram-architecture-dark.svg'
  import dataModel from '../assets/about/diagram-data-model.svg'
  import dataModelDark from '../assets/about/diagram-data-model-dark.svg'
  import contactGithub from '../assets/about/contact-github.webp'
  import contactLinkedin from '../assets/about/contact-linkedin.webp'
  import logoHorizontal from '../assets/about/logo-horizontal.webp'
  import logoHorizontalWhite from '../assets/about/logo-horizontal-white.webp'
  import logoText from '../assets/about/logo-text.webp'
  import logoTextWhite from '../assets/about/logo-text-white.webp'
  import Button from '../components/Button.svelte'
  import IconButton from '../components/IconButton.svelte'
  import SettingsButton from '../components/SettingsButton.svelte'
  import { MIN_LEADERBOARD_SCORE } from '../lib/game'
  import { reducedMotion } from '../lib/motion'
  import { theme } from '../lib/theme.svelte'
  import { update } from '../lib/update.svelte'
  import { appVersion } from '../lib/version'

  interface Props {
    onback: () => void
    onplay: () => void
  }

  let { onback, onplay }: Props = $props()

  // This page shows the version, so look for a newer one while it's open. It's quiet:
  // nothing shows unless one is found, and then the usual banner does.
  onMount(() => void update.check())

  // Screenshots are made by scripts/screenshots.mjs, one per screen, device and theme.
  const shots = import.meta.glob<string>('../assets/about/shot-*.webp', {
    eager: true,
    query: '?url',
    import: 'default',
  })
  const shot = (name: string, device: 'phone' | 'desktop') =>
    shots[`../assets/about/shot-${name}-${device}-${theme.current}.webp`]

  // Phones (portrait, or on their side) get the phone screenshots; everything else gets the desktop ones.
  const PHONE = '(max-width: 600px), (max-height: 34rem) and (orientation: landscape)'

  const dark = $derived(theme.current === 'dark')
  const year = new Date().getFullYear()

  let features = $state<HTMLElement>()
  let project = $state<HTMLElement>()
  const jump = (target?: HTMLElement) =>
    target?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' })
</script>

{#snippet picture(name: string, alt: string)}
  <picture class="shot">
    <source media={PHONE} srcset={shot(name, 'phone')} />
    <img src={shot(name, 'desktop')} {alt} loading="lazy" decoding="async" />
  </picture>
{/snippet}

<div class="screen">
  <header class="bar">
    <IconButton label="Back" onclick={onback}><ArrowLeft size="1.25rem" /></IconButton>
    <h1>About</h1>
    <SettingsButton />
  </header>

  <main>
    <section class="hero">
      <img class="logo" src={dark ? logoHorizontalWhite : logoHorizontal} alt="Anagram Master" width="1032" height="130" />
      {@render picture('interface', "Anagram Master's game screen at the start of a round")}
      <p>
        An addictive and engaging word game where players have fun rearranging the letters from a root word to form new
        words.
      </p>
      <Button size="lg" onclick={onplay}><Play size="1.25rem" /> Play Anagram Master</Button>
      <nav class="jump" aria-label="On this page">
        <button type="button" onclick={() => jump(features)}>Features</button>
        <button type="button" onclick={() => jump(project)}>The project</button>
      </nav>
    </section>

    <section bind:this={features} class="block" aria-labelledby="features-title">
      <h2 id="features-title">Features</h2>
      <p>The key features of the game include:</p>

      <article>
        <h3>Scoring System</h3>
        {@render picture('gameplay', 'A round in progress, with the words found so far and the score')}
        <p>
          The game assigns points for words created by the player. Invalid words are penalised, while valid words are
          rewarded. Points given for valid words are a factor of the number of letters used from the root word they are
          formed from. Special bonuses are given for using all the letters in the root word, and for forming twenty
          words within the time limit of a game round. All of these add up to form the player's total score.
        </p>
      </article>

      <article>
        <h3>High Scores/Leaderboards</h3>
        {@render picture('highscores', "The leaderboard, listing the top players' scores")}
        <p>
          Anagram Master has a high scores page that displays a leaderboard. At the end of a game session, a player's
          score is added to the list if it is {MIN_LEADERBOARD_SCORE} or more. Scores displayed are the twenty highest
          scores to date, sorted in descending order. This acts as a rewards system for players, and it fosters
          competition among them.
        </p>
      </article>

      <article>
        <h3>Rounds, Timing and Limits</h3>
        {@render picture('limits', 'A round nearly out of time, with a rejected word costing two points')}
        <p>
          A game session is broken down into units called rounds. A game round consists of two minutes in which a player
          has the chance to form up to twenty anagrams for a single root word (called the round word). Once that time
          elapses, the clock resets and a new root word is given to the player to signify the start of a new round.
          However, if the player is able to create twenty valid anagrams before the time runs out, they are rewarded
          with a bonus, and taken to the next round. These limits, bonuses and the penalties for invalid words create a
          sense of urgency and engagement that excites the player, making the game more fun.
        </p>
      </article>

      <article class="install">
        <h3>Install it as an app</h3>
        <img class="icon" src="/pwa-192.png" alt="The Anagram Master app icon" width="96" height="96" />
        <p>
          Anagram Master is a progressive web app. Use your browser's menu to add it to your home screen (or to install
          it, on a computer) and it opens like any other app, full screen and with its own icon. The app itself loads
          even without a connection, and you're told when a new version is ready. Games are timed and scored on the
          server, so you still need to be online to play. (The server keeps the clock so nobody can cheat by pausing it.) Light or dark? Use the toggle at the top of any screen; it
          follows your device until you choose.
        </p>
      </article>
    </section>

    <section bind:this={project} class="block" aria-labelledby="project-title">
      <h2 id="project-title">About the Project</h2>
      <p>
        Anagram Master was conceived as the portfolio project for completing the Foundations stage of the ALX Software
        Engineering Course. Created by Donald Ajaps in September 2023, it was built as a digital reimagining of a
        classic word game. A game he played a lot with friends over the years with pen and paper. Playing Anagram
        Master should be nostalgic for those who love that classic game and would like to play it again digitally, with
        the added advantages that digital systems offer.
      </p>
      <iframe
        class="video"
        src="https://www.youtube.com/embed/PRH3_1Zs9Sc?si=9V5FgIMDYr99rPCv&rel=0&showinfo=1&iv_load_policy=1&vq=hd720"
        title="Anagram Master Preview | YouTube video player"
        loading="lazy"
        allow="fullscreen; accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen
      ></iframe>
      <p>
        Though there are similarities, it is not designed to serve as an alternative to Scrabble, or as some kind of
        word solver for any word game. English (en-GB and en-US) is the only supported language, but future versions
        could be multilingual.
      </p>

      <figure class="diagrams">
        <figcaption>Diagrams of Anagram Master's Architecture and Data Structure</figcaption>
        <img src={dark ? architectureDark : architecture} alt="Architecture: the web app in the player's browser, the Flask server, and the MongoDB database" />
        <img src={dark ? dataModelDark : dataModel} alt="Data model: sessions with their round words and answers, and saved scores" />
      </figure>

      <div class="contact">
        <a href="https://github.com/adobki/Anagram_Master" title="Anagram Master on GitHub" class="repo">
          <img src={dark ? logoTextWhite : logoText} alt="Anagram Master on GitHub" height="65" />
        </a>
        <div class="people">
          <a href="https://ng.linkedin.com/in/DonaldAjaps" title="Donald Ajaps on LinkedIn">
            <img src={contactLinkedin} alt="LinkedIn" height="56" />
          </a>
          <a href="https://github.com/adobki" title="Donald Ajaps on GitHub">
            <img class="github" src={contactGithub} alt="GitHub" height="56" />
          </a>
          <a href="https://x.com/adobki" title="Donald Ajaps on X" class="x">
            <svg viewBox="0 0 24 24" role="img" aria-label="X" height="56" width="56">
              <path
                fill="currentColor"
                d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
              />
            </svg>
          </a>
        </div>
      </div>
    </section>
  </main>

  <footer>
    <p class="credits">Anagram Master {appVersion}. Copyright © 2023–{year}, Donald Ajaps.</p>
  </footer>
</div>

<style>
  .bar {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
  }

  .bar > :global(:last-child) {
    justify-self: end;
  }

  h1 {
    font-size: var(--text-lg);
    font-weight: 700;
  }

  main {
    flex: 1;
    display: grid;
    align-content: start;
    gap: var(--space-10);
    width: 100%;
    max-width: 44rem;
    margin: 0 auto;
    padding-block: var(--space-4) var(--space-8);
  }

  .hero {
    display: grid;
    justify-items: center;
    gap: var(--space-5);
    text-align: center;
  }

  .logo {
    width: min(100%, 26rem);
    height: auto;
  }

  .hero p {
    max-width: 34rem;
    font-size: var(--text-lg);
    color: var(--text-2);
  }

  .jump {
    display: flex;
    gap: var(--space-2);
  }

  .jump button {
    padding: var(--space-2) var(--space-4);
    border: 1px solid var(--line);
    border-radius: var(--radius-full);
    background: var(--surface);
    font-weight: 600;
    color: var(--text-2);
    cursor: pointer;
  }

  .jump button:active {
    background: var(--surface-2);
  }

  .block {
    display: grid;
    gap: var(--space-5);
    /* Jump buttons stop with the heading just below the top of the screen. */
    scroll-margin-top: var(--space-4);
  }

  h2 {
    padding-bottom: var(--space-2);
    border-bottom: 3px solid var(--accent);
    font-size: var(--text-2xl);
    font-weight: 700;
    letter-spacing: -0.01em;
  }

  h3 {
    font-size: var(--text-xl);
    font-weight: 700;
  }

  article {
    display: grid;
    gap: var(--space-3);
  }

  p {
    color: var(--text-2);
    line-height: 1.6;
  }

  /* Screenshots: wide for computers and tablets, tall for phones. */
  .shot {
    display: block;
    width: 100%;
    aspect-ratio: 16 / 10;
    overflow: hidden;
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--surface-2);
    box-shadow: var(--shadow-md);
  }

  .shot img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  @media (max-width: 600px), (max-height: 34rem) and (orientation: landscape) {
    .shot {
      width: min(100%, 17rem);
      margin-inline: auto;
      aspect-ratio: 1 / 2;
    }
  }

  .install .icon {
    border-radius: 22%;
    box-shadow: var(--shadow-md);
  }

  .video {
    width: 100%;
    aspect-ratio: 16 / 9;
    border: 0;
    border-radius: var(--radius-lg);
    background: var(--surface-2);
  }

  .diagrams {
    display: grid;
    gap: var(--space-4);
    margin: 0;
    text-align: center;
  }

  .diagrams figcaption {
    font-style: italic;
    font-weight: 700;
    color: var(--text-2);
  }

  /* The diagrams are transparent, so they sit straight on the page. */
  .diagrams img {
    width: 100%;
    height: auto;
  }

  .contact {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: var(--space-6);
    padding-top: var(--space-6);
    border-top: 1px solid var(--line);
  }

  .contact a {
    display: block;
    color: var(--text);
  }

  .repo img {
    height: 2.5rem;
    width: auto;
  }

  .people {
    display: flex;
    align-items: center;
    gap: var(--space-5);
  }

  .people img,
  .people svg {
    display: block;
    height: 2.5rem;
    width: auto;
  }

  /* The GitHub logo is black: flip it on dark. */
  :global([data-theme='dark']) .github {
    filter: invert(1);
  }

  footer {
    width: 100%;
    max-width: 44rem;
    margin: 0 auto;
    padding-top: var(--space-4);
    border-top: 1px solid var(--line);
  }

  .credits {
    font-size: var(--text-sm);
    text-align: center;
    color: var(--text-3);
  }
</style>
