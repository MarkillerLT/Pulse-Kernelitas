/** Serializable 32-bit LCG. No ambient randomness, clock, or browser dependency. */
export function nextRandom(seed: number): [number, number] {
  const next = (Math.imul(1664525, seed) + 1013904223) >>> 0
  return [next, next / 4294967296]
}
