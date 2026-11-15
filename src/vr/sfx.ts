/**
 * Tiny synthesized sound effects for the VR scene (no audio files to download). The audio
 * context is created lazily on the first call, which always follows a user gesture (entering VR
 * or pressing a button), so browsers allow it to play.
 */
let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null
  ctx ??= new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(
  freq: number,
  start: number,
  duration: number,
  gain = 0.08,
  type: OscillatorType = 'sine',
) {
  const a = audio()
  if (!a) return
  const osc = a.createOscillator()
  const vol = a.createGain()
  osc.type = type
  osc.frequency.value = freq
  const t = a.currentTime + start
  vol.gain.setValueAtTime(0, t)
  vol.gain.linearRampToValueAtTime(gain, t + 0.02)
  vol.gain.exponentialRampToValueAtTime(0.0001, t + duration)
  osc.connect(vol).connect(a.destination)
  osc.start(t)
  osc.stop(t + duration + 0.05)
}

/** Two-note console chime: a new task needs a decision. */
export function sfxTask() {
  tone(880, 0, 0.18, 0.06, 'triangle')
  tone(1320, 0.12, 0.22, 0.05, 'triangle')
}

/** Engine rumble rising in pitch: the mission capsule lifts off. */
export function sfxLaunch() {
  const a = audio()
  if (!a) return
  const seconds = 3
  const buffer = a.createBuffer(1, a.sampleRate * seconds, a.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  const noise = a.createBufferSource()
  noise.buffer = buffer
  const filter = a.createBiquadFilter()
  filter.type = 'lowpass'
  const t = a.currentTime
  filter.frequency.setValueAtTime(120, t)
  filter.frequency.exponentialRampToValueAtTime(1400, t + seconds)
  const vol = a.createGain()
  vol.gain.setValueAtTime(0, t)
  vol.gain.linearRampToValueAtTime(0.18, t + 0.4)
  vol.gain.exponentialRampToValueAtTime(0.0001, t + seconds)
  noise.connect(filter).connect(vol).connect(a.destination)
  noise.start(t)
  tone(110, 0, 2.6, 0.05, 'sawtooth')
}

/** Rising arpeggio for success, falling for failure: the capsule is back. */
export function sfxReturn(success: boolean) {
  const notes = success ? [523, 659, 784, 1047] : [659, 523, 392, 330]
  notes.forEach((f, i) => tone(f, i * 0.12, 0.35, 0.05, 'triangle'))
}

/** Deep swell rising into a hiss: the drive spools up and the ship jumps to warp. */
export function sfxWarp() {
  const a = audio()
  if (!a) return
  const seconds = 2.4
  const buffer = a.createBuffer(1, a.sampleRate * seconds, a.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  const noise = a.createBufferSource()
  noise.buffer = buffer
  const filter = a.createBiquadFilter()
  filter.type = 'bandpass'
  filter.Q.value = 1.2
  const t = a.currentTime
  filter.frequency.setValueAtTime(80, t)
  filter.frequency.exponentialRampToValueAtTime(2400, t + 1.6)
  const vol = a.createGain()
  vol.gain.setValueAtTime(0, t)
  vol.gain.linearRampToValueAtTime(0.14, t + 1.2)
  vol.gain.exponentialRampToValueAtTime(0.0001, t + seconds)
  noise.connect(filter).connect(vol).connect(a.destination)
  noise.start(t)
  const osc = a.createOscillator()
  const og = a.createGain()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(55, t)
  osc.frequency.exponentialRampToValueAtTime(220, t + 1.5)
  og.gain.setValueAtTime(0, t)
  og.gain.linearRampToValueAtTime(0.04, t + 0.8)
  og.gain.exponentialRampToValueAtTime(0.0001, t + 2)
  osc.connect(og).connect(a.destination)
  osc.start(t)
  osc.stop(t + 2.1)
}
