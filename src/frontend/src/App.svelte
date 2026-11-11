<script lang="ts">
  import { onMount } from 'svelte'
  import { fade } from 'svelte/transition'
  import Button from './components/Button.svelte'
  import Dialog from './components/Dialog.svelte'
  import OfflineBanner from './components/OfflineBanner.svelte'
  import Toaster from './components/Toaster.svelte'
  import Settings from './components/Settings.svelte'
  import UpdatePrompt from './components/UpdatePrompt.svelte'
  import { api, ApiError, type GameState } from './lib/api'
  import { createApiGame, findSavedGame } from './lib/api-game.svelte'
  import { loadBest, recordScore } from './lib/best'
  import { MIN_LEADERBOARD_SCORE, type GameController } from './lib/game'
  import { games, MAX_ACTIVE } from './lib/history.svelte'
  import { ms } from './lib/motion'
  import { network } from './lib/network.svelte'
  import { player } from './lib/player.svelte'
  import { settings } from './lib/settings.svelte'
  import { sound } from './lib/sound.svelte'
  import { toasts } from './lib/toast.svelte'
  import { update } from './lib/update.svelte'
  import { ui } from './lib/ui.svelte'
  import About from './screens/About.svelte'
  import Game from './screens/Game.svelte'
  import GameOver from './screens/GameOver.svelte'
  import Help from './screens/Help.svelte'
  import History from './screens/History.svelte'
  import Home from './screens/Home.svelte'
  import Leaderboard from './screens/Leaderboard.svelte'
  import PastGame from './screens/PastGame.svelte'

  type Screen = 'home' | 'game' | 'over' | 'scores' | 'help' | 'about' | 'history' | 'past'

  // Each screen has a URL hash, so the browser's (and Android's) back button
  // moves between screens. #scores and #help can be linked to directly.
  const fromHash = (): Screen => {
    const hash = location.hash.slice(1) as Screen
    return hash === 'scores' || hash === 'help' || hash === 'about' || hash === 'history' ? hash : 'home'
  }

  let screen = $state<Screen>(fromHash())
  let game = $state.raw<GameController | null>(null)
  let result = $state.raw<GameState | null>(null)
  /** The best score on this device, and the earlier best the last game beat (if it did). */
  let best = $state(loadBest())
  let beaten = $state<number | null>(null)
  let starting = false
  /** The History game on show (screen 'past'), a note about it, and whether a resume or end is under way. */
  let viewing = $state<string | null>(null)
  let pastNote = $state('')
  let working = $state(false)
  const viewed = $derived(viewing ? games.get(viewing) : undefined)

  // A game saved behind the player's cookie shows up as "Continue" on the home
  // screen. Until the server answers, Home shows a loading card instead of the
  // name form, so a saved game can't be ended by a quick tap on Start. If the
  // server can't be reached the card says so, and the check is retried.
  let lookup = $state<'loading' | 'ready' | 'failed'>('loading')
  let checking = false

  async function check() {
    if (checking) return
    checking = true
    if (lookup === 'failed') lookup = 'loading'
    try {
      const saved = await findSavedGame()
      if (saved && !game) {
        game = createApiGame(saved)
        if (settings.autoResume && screen === 'home') go('game') // the clock is running: skip the extra tap
      }
      lookup = 'ready'
    } catch {
      lookup = 'failed'
    } finally {
      checking = false
    }
  }

  onMount(check)

  // Retry while it's failing: when the connection comes back, and every 10 s.
  $effect(() => {
    if (lookup !== 'failed') return
    if (network.online) {
      const timer = setTimeout(check, 10_000)
      return () => clearTimeout(timer)
    }
  })
  let wasOnline = network.online
  $effect(() => {
    const online = network.online
    if (online && !wasOnline && lookup === 'failed') void check()
    wasOnline = online
  })

  // A critical update installs itself once the player is on a screen that isn't a game.
  $effect(() => {
    update.applyIfCritical(screen, ui.settingsOpen)
  })

  let scroller: HTMLElement
  let viewHeight = $state(0)

  // The game's "Take a break?" menu, and the history entry the game sits in.
  let menu = $state<'closed' | 'button' | 'back'>('closed')
  let gameEntry: object | null = null
  let leaving = false

  function go(next: Screen, replace = false) {
    if (next === screen) return
    const origin = screen
    const carried = history.state?.from
    screen = next
    menu = 'closed'
    // The game has no URL of its own (it sits at "/", like home), so reloading
    // or coming back to a paused game never reopens it. `from` remembers which
    // screen the game was opened from, for leaveGame().
    const url = next === 'home' || next === 'game' ? location.pathname : `#${next}`
    const state = { inApp: true, game: next === 'game', from: replace ? carried : origin }
    if (next === 'game') gameEntry = state
    if (replace) history.replaceState(state, '', url)
    else history.pushState(state, '', url)
    scroller?.scrollTo(0, 0)
  }

  // Back/forward. Only #scores, #help and (while its result is still in
  // memory) #over are restored. Everything else, the game included, is home.
  function onpopstate() {
    // (With Settings open, back closes it wherever the game was opened from.)
    if (screen === 'game' && !leaving && (!location.hash || ui.settingsOpen)) {
      gameBack()
      return
    }
    leaving = false
    menu = 'closed'
    ui.closeSettings()
    const hash = location.hash.slice(1) as Screen
    const restorable =
      hash === 'scores' || hash === 'help' || hash === 'about' || hash === 'history' || (hash === 'over' && result) || (hash === 'past' && viewed)
    screen = restorable ? hash : 'home'
    scroller?.scrollTo(0, 0)
  }

  /**
   * Back (browser or device) during a game doesn't leave it. The first press
   * opens the "Take a break?" menu, a second one goes home. The browser has
   * already stepped back, so the game's history entry is put back first.
   */
  function gameBack() {
    if (ui.settingsOpen) {
      // Back closes Settings and nothing else (or asks about an unsaved name): the game's entry goes back and the menu stays shut.
      ui.closeSettings()
      history.pushState(gameEntry, '', location.pathname)
      return
    }
    if (menu === 'back') {
      menu = 'closed'
      screen = 'home' // the second press: the browser is already on the entry below the game
      return
    }
    history.pushState(gameEntry, '', location.pathname)
    menu = menu === 'button' ? 'closed' : 'back' // with the menu open from its button, back just closes it
  }

  /** Pause: back to the home screen without leaving a paused game one "Back" press away. */
  function leaveGame() {
    menu = 'closed'
    if (history.state?.game && history.state.from === 'home') {
      leaving = true
      history.back()
    } else go('home', true)
  }

  /** "Play" from the leaderboard or help: back into a game in progress, or home to start one. */
  const play = () => go(game?.state.status ? 'game' : 'home')

  /** In-app back: the browser's back if we came from another screen, else home (e.g. opened via a #scores link). */
  const back = () => (history.state?.inApp ? history.back() : go('home', true))

  /** Shown when starting a game would go over MAX_ACTIVE games in progress. */
  let capped = $state(false)

  async function newGame(name: string) {
    if (starting) return
    if (games.activeCount(game?.state.status ? game.state.session_id : null) >= MAX_ACTIVE) {
      capped = true
      return
    }
    starting = true
    try {
      // A game in progress isn't ended: it stays in History, and can be resumed from there.
      const { state, token } = await api.begin(name)
      game?.destroy()
      game = createApiGame(state, token)
      player.name = name
      go('game', screen === 'over')
    } catch (error) {
      toasts.show(error instanceof ApiError ? error.message : "Couldn't reach the server. Try again.")
    } finally {
      starting = false
    }
  }

  /** "End this game and start over" on the home screen, once confirmed. */
  async function abandon() {
    if (!game) return
    await game.quit() // shows its own message if offline, and the game stays
    if (!game.state.status) finish(false) // shows how it went
  }

  /** Open a game from History: its results, or its stats with a Resume button. */
  function openPast(id: string, note = '') {
    viewing = id
    pastNote = note
    go('past', screen === 'past')
  }

  /** The server says a game is over (or gone): keep what we know, and say so. */
  function endedAway(id: string) {
    games.markOver(id)
    openPast(id, 'This game ended while you were away.')
  }

  const isGone = (error: unknown) => error instanceof ApiError && [400, 401, 403].includes(error.status)

  /** Make a game from History the current game again, and go to it. */
  async function resumePast(id: string) {
    const entry = games.get(id)
    if (!entry || working) return
    if (game?.state.session_id === id && game.state.status) return go('game')
    if (!entry.token) return
    working = true
    try {
      const state = await api.resume(entry.token)
      game?.destroy() // the game it replaces stays in History
      game = createApiGame(state, entry.token)
      go('game')
    } catch (error) {
      if (isGone(error)) endedAway(id)
      else toasts.show("Couldn't reach the server. Try again.")
    } finally {
      working = false
    }
  }

  /** End a game from History (resuming it first, so the server knows which one), then show how it went. */
  async function endPast(id: string) {
    const entry = games.get(id)
    if (!entry || working) return
    working = true
    try {
      if (!(game?.state.session_id === id && game.state.status)) {
        if (!entry.token) return
        const state = await api.resume(entry.token)
        game?.destroy()
        game = createApiGame(state, entry.token)
      }
      await game!.quit()
      if (!game!.state.status) finish(false)
    } catch (error) {
      if (isGone(error)) endedAway(id)
      else toasts.show("Couldn't reach the server. Try again.")
    } finally {
      working = false
    }
  }

  function finish(replace = true) {
    if (game) {
      result = $state.snapshot(game.state)
      ;({ best, beaten } = recordScore(result.score))
      sound.over(beaten !== null)
      game.destroy()
      game = null
    }
    go('over', replace) // back from the results shouldn't reopen the finished game
  }
</script>

<svelte:window {onpopstate} />

<div class="app">
  <OfflineBanner />
  <div class="scroller" bind:this={scroller} bind:clientHeight={viewHeight} style:--view-h="{viewHeight}px">
{#key screen}
  <div in:fade={{ duration: ms(220) }}>
    {#if screen === 'game' && game}
      <Game {game} onend={finish} onpause={leaveGame} onhelp={() => go('help', true)} bind:menu />
    {:else if screen === 'over' && result}
      <GameOver
        {result}
        {best}
        {beaten}
        onplay={() => newGame(player.valid ? player.trimmed : result!.name)}
        onhome={() => go('home')}
        onleaderboard={() => go('scores')}
      />
    {:else if screen === 'scores'}
      <Leaderboard
        mine={result && result.score >= MIN_LEADERBOARD_SCORE ? { name: result.name, score: result.score } : null}
        onback={back}
        onplay={play}
      />
    {:else if screen === 'history'}
      <History onopen={openPast} onresume={resumePast} onback={back} onplay={play} />
    {:else if screen === 'past' && viewed}
      {#if viewed.over}
        <GameOver
          result={viewed.state}
          past
          note={pastNote}
          onplay={() => newGame(player.valid ? player.trimmed : viewed.state.name)}
          onhome={() => go('home')}
          onleaderboard={() => go('scores')}
        />
      {:else}
        <PastGame
          game={viewed}
          canResume={!!viewed.token || game?.state.session_id === viewed.id}
          busy={working}
          onresume={() => resumePast(viewed.id)}
          onend={() => endPast(viewed.id)}
          onhome={() => go('home')}
        />
      {/if}
    {:else if screen === 'help'}
      <Help onback={back} onplay={play} />
    {:else if screen === 'about'}
      <About onback={back} onplay={play} />
    {:else}
      <Home
        saved={game?.state.status ? game.state : null}
        {lookup}
        onretry={check}
        {best}
        timeLeft={game?.timeLeft ?? 0}
        hasHistory={games.any}
        canReturn={!!game && !!games.get(game.state.session_id)?.token}
        onhistory={() => go('history')}
        onstart={newGame}
        onabandon={abandon}
        oncontinue={() => go('game')}
        onleaderboard={() => go('scores')}
        onhelp={() => go('help')}
        onabout={() => go('about')}
      />
    {/if}
  </div>
{/key}
  </div>
</div>

<Dialog bind:open={capped} title="Too many games in progress">
  <p>
    You have {MAX_ACTIVE} games in progress, which is the most at once. End one of them, then start a new game. History
    lists them all.
  </p>
  {#snippet actions()}
    <Button variant="secondary" onclick={() => (capped = false)}>Not now</Button>
    <Button
      onclick={() => {
        capped = false
        go('history', screen === 'history')
      }}
    >
      Open History
    </Button>
  {/snippet}
</Dialog>

<Settings {game} inGame={screen === 'game'} />
<Toaster />
<UpdatePrompt hidden={screen === 'game'} />

<style>
  /*
   * The app fills the visible window and the page itself never scrolls, so a
   * pull-down gesture or the browser toolbar sliding can't make a full-screen
   * screen scrollable. Only .scroller scrolls, and only when a screen's content
   * is taller than it. The offline banner sits above it, so the screens
   * shrink to make room instead of pushing the page longer.
   */
  .app {
    position: fixed;
    inset: 0;
    display: flex;
    flex-direction: column;
  }

  .scroller {
    flex: 1;
    min-height: 0;
    overflow-x: hidden;
    overflow-y: auto;
    overscroll-behavior: none;
  }
</style>
