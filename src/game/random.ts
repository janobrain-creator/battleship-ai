/** A function returning a pseudo-random number in [0, 1). */
export type Rng = () => number;

/** Small, fast, seedable PRNG (mulberry32) so tests are deterministic. */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 32);
}

export function randomInt(rng: Rng, maxExclusive: number): number {
  return Math.floor(rng() * maxExclusive);
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  if (items.length === 0) {
    throw new Error('Cannot pick from an empty list');
  }
  return items[randomInt(rng, items.length)] as T;
}
