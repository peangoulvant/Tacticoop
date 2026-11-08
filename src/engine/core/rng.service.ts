/** Générateur pseudo-aléatoire à graine (mulberry32) : le hasard reste contrôlable dans les tests. */
export type Rng = () => number;

/**
 * Générateur dont l'état interne (un entier 32 bits) peut être relu : le conserver dans la
 * mission permet à une reprise de poursuivre exactement la même suite de tirages (AB-24).
 */
export interface StatefulRng extends Rng {
  state(): number;
}

/** Reprend un générateur à un état donné. Une graine est un état de départ comme un autre. */
export function restoreRng(state: number): StatefulRng {
  let a = state >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return Object.assign(next, { state: () => a });
}

export function createRng(seed: number): StatefulRng {
  return restoreRng(seed);
}

export function randomInt(rng: Rng, maxExclusive: number): number {
  return Math.floor(rng() * maxExclusive);
}

/** Mélange de Fisher-Yates, sans modifier le tableau d'origine. */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(rng, i + 1);
    [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
  }
  return copy;
}

/**
 * Tire un élément avec une probabilité proportionnelle à son poids. Les poids sont positifs ou
 * nuls et leur somme est strictement positive.
 */
export function pickWeighted<T>(items: readonly T[], weightOf: (item: T) => number, rng: Rng): T {
  const total = items.reduce((sum, item) => sum + weightOf(item), 0);
  if (total <= 0) throw new Error('Aucun poids de tirage positif');
  let threshold = rng() * total;
  for (const item of items) {
    threshold -= weightOf(item);
    if (threshold < 0) return item;
  }
  return items[items.length - 1] as T;
}
