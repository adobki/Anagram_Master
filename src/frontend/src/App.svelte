<script lang="ts">
  import { onMount } from 'svelte'
  import { fade } from 'svelte/transition'
  import Toaster from './components/Toaster.svelte'
  import { api, ApiError, type GameState } from './lib/api'
  import { createApiGame, findSavedGame } from './lib/api-game.svelte'
  import type { GameController } from './lib/game'
  import { ms } from './lib/motion'
  import { toasts } from './lib/toast.svelte'
  import Game from './screens/Game.svelte'
  import GameOver from './screens/GameOver.svelte'
  import Home from './screens/Home.svelte'

  type Screen = 'home' | 'game' | 'over'

  let screen = $state<Screen>('home')
  let game = $state.raw<GameController | null>(null)
  let result = $state.raw<GameState | null>(null)
  let starting = false

  // A game saved behind the player's cookie shows up as "Continue" on the home screen.
  onMount(async () => {
    const saved = await findSavedGame()
    if (saved && !game) game = createApiGame(saved)
  })

  function go(next: Screen) {
    screen = next
    window.scrollTo(0, 0)
  }

  async function newGame(name: string) {
    if (starting) return
    starting = true
    try {
      // Starting over ends the current game first (saving its score if it's 10+).
      if (game?.state.status) await game.quit()
      game?.destroy()
      game = createApiGame(await api.start(name))
      go('game')
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
