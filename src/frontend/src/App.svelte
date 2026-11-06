<script lang="ts">
  import { fade } from 'svelte/transition'
  import Toaster from './components/Toaster.svelte'
  import type { GameState } from './lib/api'
  import type { GameController } from './lib/game'
  import { createMockGame, sampleFinishedGame, sampleSavedGame } from './lib/mock.svelte'
  import { ms } from './lib/motion'
  import { toasts } from './lib/toast.svelte'
  import Game from './screens/Game.svelte'
  import GameOver from './screens/GameOver.svelte'
  import Home from './screens/Home.svelte'

  // DESIGN PREVIEW (mission 4): the screens run on a local mock of the API.
  // Mission 5 replaces the mock with the real API; the screens stay as they are.
  // Open /#game or /#over to jump straight to a screen.
  type Screen = 'home' | 'game' | 'over'

  const requested = location.hash.slice(1)
  let screen = $state<Screen>(requested === 'game' || requested === 'over' ? requested : 'home')
  let game = $state.raw<GameController | null>(requested === 'game' ? createMockGame('Ada') : sampleSavedGame())
  let result = $state.raw<GameState | null>(requested === 'over' ? sampleFinishedGame() : null)

  function go(next: Screen) {
    screen = next
    history.replaceState(null, '', next === 'home' ? location.pathname : `#${next}`)
    window.scrollTo(0, 0)
  }

  function newGame(name: string) {
    game?.destroy()
    game = createMockGame(name)
    go('game')
  }

  function finish() {
    if (game) {
      result = $state.snapshot(game.state)
      game.destroy()
      game = null
    }
    go('over')
  }

  const soon = (what: string) => toasts.show(`${what} arrives in mission 6`)
</script>

{#key screen}
  <div in:fade={{ duration: ms(220) }}>
    {#if screen === 'game' && game}
      <Game {game} onend={finish} onpause={() => go('home')} />
    {:else if screen === 'over' && result}
      <GameOver
        {result}
        onplay={() => newGame(result!.name)}
        onhome={() => go('home')}
        onleaderboard={() => soon('The leaderboard')}
      />
    {:else}
      <Home
        saved={game?.state.status ? game.state : null}
        timeLeft={game?.timeLeft ?? 0}
        onstart={newGame}
        oncontinue={() => go('game')}
        onleaderboard={() => soon('The leaderboard')}
        onhelp={() => soon('How to play')}
      />
    {/if}
  </div>
{/key}

<Toaster />
