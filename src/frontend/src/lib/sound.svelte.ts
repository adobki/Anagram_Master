/**
 * Sound effects. The notes themselves are in lib/sound-voices.ts; this plays
 * them through a master volume and a gentle compressor (so overlapping notes
 * can't clip), and follows the player's choices in Settings.
 *
 * Phones make this harder than it looks:
 *   - A browser only lets sound start after a tap, and on a touch screen that
 *     counts when the finger lifts, not when it lands. So the audio context is
 *     woken on every tap or key press for as long as it isn't running, rather
 *     than once on the first touch-down, and again after the page was hidden.
 *   - A sound is only scheduled once the context is really running.
 *   - Android puts its audio output to sleep between sounds and swallows the
 *     start of a short one. While a game is on screen a silent hum keeps it
 *     awake (`hold`), and every note starts a moment after it's scheduled.
 *
 * The volume is ours (a gain node), which works everywhere, iPhones included.
 * The device's own volume and silent switch still apply on top.
 */
import { settings, type Effect } from './settings.svelte'
import * as voices from './sound-voices'

/** The loudest the master volume lets a note get, as a fraction of full scale. */
const CEILING = 0.8
/** Seconds between asking for a note and it starting, so a waking output has time to be ready. */
const LEAD_IN = 0.05

export const EFFECTS: { id: Effect; label: string; hint: string }[] = [
  { id: 'word', label: 'Correct word', hint: 'A soft note. Longer words sound higher.' },
  { id: 'wrong', label: 'Wrong word', hint: 'A low, gentle bloop.' },
  { id: 'cleared', label: 'Round cleared', hint: 'A little rising tune.' },
  { id: 'countdown', label: 'Countdown', hint: 'A soft beep each second of the last ten.' },
  { id: 'roundup', label: 'Round over', hint: "A soft two-note ding when a round's time is up." },
  { id: 'over', label: 'Game over', hint: 'A closing chime.' },
]

let context: AudioContext | null = null
let master: GainNode | null = null

/** What the audio context is doing, for Settings to say "waiting for a tap". */
export const audio = new (class {
  /** True once sound can play. False while the browser is still holding it back. */
  running = $state(false)
})()

function ensure(): AudioContext | null {
  if (context) return context
  const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Context) return null
  context = new Context()
  master = context.createGain()
  const compressor = context.createDynamicsCompressor()
  compressor.threshold.value = -14
  compressor.knee.value = 12
  compressor.ratio.value = 4
  compressor.attack.value = 0.003
  compressor.release.value = 0.15
  master.connect(compressor).connect(context.destination)
  context.addEventListener('statechange', () => (audio.running = context?.state === 'running'))
  audio.running = context.state === 'running'
  // iPhones want a sound started inside the tap before they'll play any later.
  const silent = context.createBufferSource()
  silent.buffer = context.createBuffer(1, 1, 22050)
  silent.connect(context.destination)
  silent.start(0)
  return context
}

/** Wake (or make) the audio context. Safe to call any time; only a tap or key press makes it succeed. */
function wake() {
  const ctx = ensure()
  if (ctx && ctx.state !== 'running') void ctx.resume().catch(() => {})
}

// Every tap or key press, not just the first: a touch counts on finger-lift, and the context can be put back to sleep.
for (const type of ['pointerup', 'touchend', 'click', 'keydown'] as const) addEventListener(type, wake, { capture: true, passive: true })
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && context) wake()
})

type Schedule = (ctx: AudioContext, out: AudioNode, at: number) => void

async function play(schedule: Schedule) {
  if (document.hidden || settings.volume === 0) return
  const ctx = ensure()
  if (!ctx || !master) return
  if (ctx.state !== 'running') {
    try {
      await ctx.resume()
    } catch {
      // Not allowed yet: no tap since the page opened.
    }
    if ((ctx.state as AudioContextState) !== 'running') return
  }
  master.gain.setValueAtTime(CEILING * (settings.volume / 100) ** 2, ctx.currentTime)
  schedule(ctx, master, ctx.currentTime + LEAD_IN)
}

/** Plays one effect if sound is on and that effect is switched on. */
function effect(id: Effect, schedule: Schedule) {
  if (settings.sound && settings.sfx(id)) void play(schedule)
}

/**
 * Keeps the audio output awake while a game is on screen, so the start of a
 * short word sound isn't lost to a sleeping speaker. A silent, endlessly
 * looped buffer (with a trace of noise, so nothing treats it as silence).
 * Returns the function that lets go of it.
 */
function hold(): () => void {
  const ctx = ensure()
  if (!ctx) return () => {}
  const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.0004
  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.loop = true
  source.connect(ctx.destination)
  source.start()
  return () => {
    try {
      source.stop()
    } catch {
      // Already stopped.
    }
    source.disconnect()
  }
}

export const sound = {
  /** A valid word of this many letters. */
  word: (letters: number) => effect('word', (c, o, t) => voices.word(c, o, t, letters)),
  wrong: () => effect('wrong', voices.wrong),
  cleared: () => effect('cleared', voices.cleared),
  /** One beep, for this many seconds left. */
  countdown: (second: number) => effect('countdown', (c, o, t) => voices.countdown(c, o, t, second)),
  roundup: () => effect('roundup', voices.roundup),
  over: (newBest: boolean) => effect('over', (c, o, t) => voices.over(c, o, t, newBest)),
  hold,
}

/** Settings' preview buttons: plays the effect even if it's switched off. */
export function preview(id: Effect) {
  const schedules: Record<Effect, Schedule> = {
    word: (c, o, t) => voices.word(c, o, t, 5),
    wrong: voices.wrong,
    cleared: voices.cleared,
    countdown: (c, o, t) => voices.countdown(c, o, t, 2),
    roundup: voices.roundup,
    over: (c, o, t) => voices.over(c, o, t, false),
  }
  void play(schedules[id])
}
