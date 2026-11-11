<script lang="ts">
  import { onMount } from 'svelte'
  import { fade } from 'svelte/transition'
  import OfflineBanner from './components/OfflineBanner.svelte'
  import Toaster from './components/Toaster.svelte'
  import Settings from './components/Settings.svelte'
  import UpdatePrompt from './components/UpdatePrompt.svelte'
  import { api, ApiError, type GameState } from './lib/api'
  import { createApiGame, findSavedGame } from './lib/api-game.svelte'
  import { loadBest, recordScore } from './lib/best'
  import { MIN_LEADERBOARD_SCORE, type GameController } from './lib/game'
  import { ms } from './lib/motion'
  import { network } from './lib/network.svelte'
  import { player } from './lib/player.svelte'
  import { settings } from './lib/settings.svelte'
  import { sound } from './lib/sound.svelte'
  import { toasts } from './lib/toast.svelte'
  import { ui } from './lib/ui.svelte'
  import About from './screens/About.svelte'
  import Game from './screens/Game.svelte'
  import GameOver from './screens/GameOver.svelte'
  import Help from './screens/Help.svelte'
  import Home from './screens/Home.svelte'
  import Leaderboard from './screens/Leaderboard.svelte'

  type Screen = 'home' | 'game' | 'over' | 'scores' | 'help' | 'about'

  // Each screen has a URL hash, so the browser's (and Android's) back button
  // moves between screens. #scores and #help can be linked to directly.
  const fromHash = (): Screen => {
    const hash = location.hash.slice(1) as Screen
    return hash === 'scores' || hash === 'help' || hash === 'about' ? hash : 'home'
  }

  let screen = $state<Screen>(fromHash())
  let game = $state.raw<GameController | null>(null)
  let result = $state.raw<GameState | null>(null)
  /** The best score on this device, and the earlier best the last game beat (if it did). */
  let best = $state(loadBest())
  let beaten = $state<number | null>(null)
  let starting = false

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
    ui.settingsOpen = false
    const hash = location.hash.slice(1) as Screen
    const restorable = hash === 'scores' || hash === 'help' || hash === 'about' || (hash === 'over' && result)
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
      // Back closes Settings and nothing else: the game's entry goes back and the menu stays shut.
      ui.settingsOpen = false
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

  async function newGame(name: string) {
    if (starting) return
    starting = true
    try {
      // Starting over ends the current game first (saving its score if it's 10+).
      if (game?.state.status) {
        await game.quit()
        best = recordScore(game.state.score).best
      }
      game?.destroy()
      game = createApiGame(await api.start(name))
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
    if (!game.state.status) {
      best = recordScore(game.state.score).best
      game.destroy()
      game = null
    }
  }

  function finish() {
    if (game) {
      result = $state.snapshot(game.state)
      ;({ best, beaten } = recordScore(result.score))
      sound.over(beaten !== null)
      game.destroy()
      game = null
    }
    go('over', true) // back from the results shouldn't reopen the finished game
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
