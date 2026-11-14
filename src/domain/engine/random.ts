/**
 * Serializable 32-bit PRNG (mulberry32). The seed lives in the game state, so every random
 * outcome is reproducible from a save and never depends on Math.random or the clock.
 * A plain LCG was rejected: its first output barely changes for nearby seeds.
 * Returns the next seed and a float in [0, 1).
 */
export function nextRandom(seed: number): [nextSeed: number, value: number] {
  const next = (seed + 0x6d2b79f5) >>> 0
  let r = Math.imul(next ^ (next >>> 15), next | 1)
  r ^= r + Math.imul(r ^ (r >>> 7), r | 61)
  return [next, ((r ^ (r >>> 14)) >>> 0) / 4294967296]
}

/** Picks one item and returns it with the advanced seed. `items` must not be empty. */
export function pickRandom<T>(seed: number, items: readonly T[]): [nextSeed: number, item: T] {
  const [next, value] = nextRandom(seed)
  return [next, items[Math.floor(value * items.length)]]
}
