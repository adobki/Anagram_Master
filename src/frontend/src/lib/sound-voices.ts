/**
 * The game's sound effects, as pure scheduling functions: each one puts a few
 * soft notes on any audio context (the live one, or an OfflineAudioContext in
 * a test). lib/sound.ts plays them.
 *
 * They are made to be easy on the ears. Sine notes only, with one quiet
 * overtone, a short attack so nothing clicks, a smooth decay, nothing above
 * about 1.3 kHz, and every pitch comes from one pentatonic scale, so any run
 * of them sounds consonant.
 */

// Pentatonic notes (C D E G A) in Hz.
const C5 = 523.25
const D5 = 587.33
const E5 = 659.25
const G5 = 783.99
const A5 = 880
const C6 = 1046.5
const D6 = 1174.66

interface NoteOptions {
  /** Seconds until the note has faded out. */
  length?: number
  /** Loudest point, as a fraction of full scale, before the master volume. */
  peak?: number
  /** Slide to this pitch over the note's length. */
  glideTo?: number
}

/** One soft note: a sine with a quiet octave above it, an 8 ms attack and an exponential decay. */
function note(ctx: BaseAudioContext, out: AudioNode, at: number, freq: number, { length = 0.22, peak = 0.5, glideTo }: NoteOptions = {}) {
  const envelope = ctx.createGain()
  envelope.gain.setValueAtTime(0.0001, at)
  envelope.gain.exponentialRampToValueAtTime(peak, at + 0.008)
  envelope.gain.exponentialRampToValueAtTime(0.0001, at + length)
  envelope.connect(out)
  for (const [multiple, level] of [
    [1, 1],
    [2, 0.14],
  ]) {
    const oscillator = ctx.createOscillator()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(freq * multiple, at)
    if (glideTo) oscillator.frequency.exponentialRampToValueAtTime(glideTo * multiple, at + length)
    const partial = ctx.createGain()
    partial.gain.value = level
    oscillator.connect(partial).connect(envelope)
    oscillator.start(at)
    oscillator.stop(at + length + 0.02)
  }
}

export type Voice<Args extends unknown[] = []> = (ctx: BaseAudioContext, out: AudioNode, at: number, ...args: Args) => void

const LADDER = [C5, D5, E5, G5, A5, C6, D6] // 2, 3, 4... letters; the longest word is the highest

/** A valid word: one short pluck. The more letters, the higher it sits. */
export const word: Voice<[letters: number]> = (ctx, out, at, letters) => {
  const rung = Math.min(Math.max(letters, 2) - 2, LADDER.length - 1)
  note(ctx, out, at, LADDER[rung], { length: 0.28, peak: 0.58 })
}

/**
 * A word that doesn't count: a soft "bloop" gliding down. It is not a buzzer. It
 * starts at 330 Hz, because phone speakers barely play anything lower.
 */
export const wrong: Voice = (ctx, out, at) => {
  note(ctx, out, at, 330, { length: 0.24, peak: 0.5, glideTo: 247 })
}

/** A cleared round: four rising notes. */
export const cleared: Voice = (ctx, out, at) => {
  const notes = [C5, E5, G5, C6]
  notes.forEach((pitch, i) => note(ctx, out, at + i * 0.09, pitch, { length: i === notes.length - 1 ? 0.55 : 0.2, peak: 0.32 }))
}

/** One beep of the last-ten-seconds countdown. It climbs a little for the final three. */
export const countdown: Voice<[second: number]> = (ctx, out, at, second) => {
  note(ctx, out, at, second <= 3 ? A5 : E5, { length: 0.09, peak: 0.33 })
}

/** The end of a game: a gentle falling chime, or a brighter rising one for a new best score. */
export const over: Voice<[newBest: boolean]> = (ctx, out, at, newBest) => {
  if (newBest) {
    ;[C5, E5, G5, C6].forEach((pitch, i) => note(ctx, out, at + i * 0.11, pitch, { length: 0.22, peak: 0.26 }))
    note(ctx, out, at + 0.5, G5, { length: 0.8, peak: 0.17 })
    note(ctx, out, at + 0.5, C6, { length: 0.8, peak: 0.17 })
  } else {
    ;[G5, E5, C5].forEach((pitch, i) => note(ctx, out, at + i * 0.16, pitch, { length: i === 2 ? 0.7 : 0.25, peak: 0.3 }))
  }
}
