import { canKeepAwake } from './device'

/**
 * Keeps the screen from dimming or locking while the game screen is showing,
 * since the round clock runs on the server and a sleeping screen costs real
 * time. Returns a function that lets go of it.
 *
 * The browser drops the lock whenever the page is hidden, so it is taken again
 * each time the page becomes visible. A refusal (low battery, say) is ignored.
 */
export function holdScreen(): () => void {
  if (!canKeepAwake) return () => {}
  let stopped = false
  let lock: WakeLockSentinel | null = null

  async function take() {
    if (stopped || lock || document.visibilityState !== 'visible') return
    try {
      const taken = await navigator.wakeLock.request('screen')
      if (stopped) return void taken.release()
      lock = taken
      taken.addEventListener('release', () => {
        if (lock === taken) lock = null
      })
    } catch {
      // Not allowed right now: the screen just behaves as usual.
    }
  }

  const onvisible = () => void take()
  document.addEventListener('visibilitychange', onvisible)
  void take()

  return () => {
    stopped = true
    document.removeEventListener('visibilitychange', onvisible)
    void lock?.release()
    lock = null
  }
}
