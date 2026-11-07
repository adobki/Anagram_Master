<script lang="ts">
  import { onMount } from 'svelte'
  import { fade } from 'svelte/transition'
  import OfflineBanner from './components/OfflineBanner.svelte'
  import Toaster from './components/Toaster.svelte'
  import UpdatePrompt from './components/UpdatePrompt.svelte'
  import { api, ApiError, type GameState } from './lib/api'
  import { createApiGame, findSavedGame } from './lib/api-game.svelte'
  import { MIN_LEADERBOARD_SCORE, type GameController } from './lib/game'
  import { ms } from './lib/motion'
  import { toasts } from './lib/toast.svelte'
  import Game from './screens/Game.svelte'
  import GameOver from './screens/GameOver.svelte'
  import Help from './screens/Help.svelte'
  import Home from './screens/Home.svelte'
  import Leaderboard from './screens/Leaderboard.svelte'

  type Screen = 'home' | 'game' | 'over' | 'scores' | 'help'
  const SCREENS: Screen[] = ['home', 'game', 'over', 'scores', 'help']

  // Each screen has a URL hash, so the browser's (and Android's) back button
  // moves between screens. #scores and #help can be linked to directly.
  const fromHash = (): Screen => {
    const hash = location.hash.slice(1) as Screen
    return hash === 'scores' || hash === 'help' ? hash : 'home'
  }

  let screen = $state<Screen>(fromHash())
  let game = $state.raw<GameController | null>(null)
  let result = $state.raw<GameState | null>(null)
  let starting = false

  // A game saved behind the player's cookie shows up as "Continue" on the home screen.
  onMount(async () => {
    const saved = await findSavedGame()
    if (saved && !game) game = createApiGame(saved)
  })

  function go(next: Screen, replace = false) {
    if (next === screen) return
    screen = next
    const url = next === 'home' ? location.pathname : `#${next}`
    if (replace) history.replaceState(null, '', url)
    else history.pushState({ inApp: true }, '', url)
    window.scrollTo(0, 0)
  }

  // Back/forward. The game and game-over screens need state, so a stale
  // hash for them falls back to home.
  function onpopstate() {
    const hash = location.hash.slice(1) as Screen
    let next: Screen = SCREENS.includes(hash) ? hash : 'home'
    if ((next === 'game' && !game?.state.status) || (next === 'over' && !result)) next = 'home'
    screen = next
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
      if (game?.state.status) await game.quit()
      game?.destroy()
      game = createApiGame(await api.start(name))
      go('game', screen === 'over')
    } catch (error) {
      toasts.show(error instanceof ApiError ? error.message : "Couldn't reach the server. Try again.")
    } finally {
      starting = false
    }
  }

  function finish() {
    if (game) {
      result = $state.snapshot(game.state)
      game.destroy()
      game = null
    }
    go('over', true) // back from the results shouldn't reopen the finished game
  }
</script>

<svelte:window {onpopstate} />

<OfflineBanner />

{#key screen}
  <div in:fade={{ duration: ms(220) }}>
    {#if screen === 'game' && game}
      <Game {game} onend={finish} onpause={() => go('home')} />
    {:else if screen === 'over' && result}
      <GameOver
        {result}
        onplay={() => newGame(result!.name)}
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
    {:else}
      <Home
        saved={game?.state.status ? game.state : null}
        timeLeft={game?.timeLeft ?? 0}
        onstart={newGame}
        oncontinue={() => go('game')}
        onleaderboard={() => go('scores')}
        onhelp={() => go('help')}
      />
    {/if}
  </div>
{/key}

<Toaster />
<UpdatePrompt hidden={screen === 'game'} />
