/**
 * Sound effects. The notes themselves are in lib/sound-voices.ts; this plays
 * them through a master volume and a gentle compressor (so overlapping notes
 * can't clip), and follows the player's choices in Settings.
 *
 * Browsers only allow sound after a tap or key press, so the audio context is
 * made and woken on the first one. The volume is ours (a gain node), which
 * works everywhere, iPhones included. The device's own volume and silent
 * switch still apply on top.
 */
import { settings, type Effect } from './settings.svelte'
import * as voices from './sound-voices'

/** The loudest the master volume lets a note get, as a fraction of full scale. */
const CEILING = 0.8

export const EFFECTS: { id: Effect; label: string; hint: string }[] = [
  { id: 'word', label: 'Correct word', hint: 'A soft note. Longer words sound higher.' },
  { id: 'wrong', label: 'Wrong word', hint: 'A low, gentle bloop.' },
  { id: 'cleared', label: 'Round cleared', hint: 'A little rising tune.' },
  { id: 'countdown', label: 'Countdown', hint: 'A soft beep each second of the last ten.' },
  { id: 'over', label: 'Game over', hint: 'A closing chime.' },
]

let context: AudioContext | null = null
let master: GainNode | null = null

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
  // iPhones want a sound started inside the tap before they'll play any later.
  const silent = context.createBufferSource()
  silent.buffer = context.createBuffer(1, 1, 22050)
  silent.connect(context.destination)
  silent.start(0)
  return context
}

// Wake the audio on the first tap or key press.
for (const type of ['pointerdown', 'keydown'] as const) {
  addEventListener(type, () => void ensure()?.resume(), { once: true, capture: true })
}

type Schedule = (ctx: AudioContext, out: AudioNode, at: number) => void

function play(schedule: Schedule) {
  if (document.hidden || settings.volume === 0) return
  const ctx = ensure()
  if (!ctx || !master) return
  if (ctx.state === 'suspended') void ctx.resume()
  master.gain.setValueAtTime(CEILING * (settings.volume / 100) ** 2, ctx.currentTime)
  schedule(ctx, master, ctx.currentTime + 0.01)
}

/** Plays one effect if sound is on and that effect is switched on. */
function effect(id: Effect, schedule: Schedule) {
  if (settings.sound && settings.sfx(id)) play(schedule)
}

export const sound = {
  /** A valid word of this many letters. */
  word: (letters: number) => effect('word', (c, o, t) => voices.word(c, o, t, letters)),
  wrong: () => effect('wrong', voices.wrong),
  cleared: () => effect('cleared', voices.cleared),
  /** One beep, for this many seconds left. */
  countdown: (second: number) => effect('countdown', (c, o, t) => voices.countdown(c, o, t, second)),
  over: (newBest: boolean) => effect('over', (c, o, t) => voices.over(c, o, t, newBest)),
}

/** Settings' preview buttons: plays the effect even if it's switched off. */
export function preview(id: Effect) {
  const schedules: Record<Effect, Schedule> = {
    word: (c, o, t) => voices.word(c, o, t, 5),
    wrong: voices.wrong,
    cleared: voices.cleared,
    countdown: (c, o, t) => voices.countdown(c, o, t, 2),
    over: (c, o, t) => voices.over(c, o, t, false),
  }
  play(schedules[id])
}
