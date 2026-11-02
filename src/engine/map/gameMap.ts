import type { Hex } from './hex';
import { hexDistance, hexNeighbors, sameHex } from './hex';
import { isNavigable, type NavalCategory, type Terrain } from './terrain';

/** Carte immuable pendant la mission (SF-02 §3) ; terrains stockés ligne par ligne. */
export interface GameMap {
  width: number;
  height: number;
  terrain: readonly Terrain[];
}

export const indexOf = (map: Pick<GameMap, 'width'>, hex: Hex): number =>
  hex.row * map.width + hex.col;

export const inBounds = (map: Pick<GameMap, 'width' | 'height'>, hex: Hex): boolean =>
  hex.col >= 0 && hex.col < map.width && hex.row >= 0 && hex.row < map.height;

export const terrainAt = (map: GameMap, hex: Hex): Terrain =>
  map.terrain[indexOf(map, hex)] as Terrain;

/** Tous les hexagones, ligne par ligne : l'ordre fixe rend les égalités déterministes. */
const allHexes = ({ width, height }: Pick<GameMap, 'width' | 'height'>): Hex[] =>
  Array.from({ length: width * height }, (_, i) => ({
    col: i % width,
    row: Math.floor(i / width),
  }));

/**
 * Hexagone navigable le plus proche d'une cible, hors cases `taken` (indices déjà occupés).
 * À distance égale, le premier dans l'ordre ligne par ligne l'emporte.
 */
export function nearestNavigableHex(
  map: GameMap,
  target: Hex,
  category: NavalCategory,
  taken: ReadonlySet<number> = new Set(),
): Hex {
  const free = allHexes(map).filter(
    (hex) => !taken.has(indexOf(map, hex)) && isNavigable(terrainAt(map, hex), category),
  );
  const best = free.reduce<Hex | null>(
    (nearest, hex) =>
      nearest === null || hexDistance(hex, target) < hexDistance(nearest, target) ? hex : nearest,
    null,
  );
  if (!best) throw new Error('Aucun hexagone navigable disponible');
  return best;
}

/** Remonte le chemin depuis `end` grâce aux prédécesseurs enregistrés par la recherche. */
function walkBack(map: GameMap, previous: ReadonlyMap<number, Hex>, end: Hex): Hex[] {
  const path = [end];
  for (let p = previous.get(indexOf(map, end)); p; p = previous.get(indexOf(map, p))) {
    path.unshift(p);
  }
  return path;
}

interface SearchState {
  seen: Set<number>;
  previous: Map<number, Hex>;
  queue: Hex[];
}

/** Ajoute à la file les voisins navigables pas encore vus, dans l'ordre fixe des directions. */
function enqueueNeighbors(
  map: GameMap,
  current: Hex,
  canEnter: (hex: Hex) => boolean,
  { seen, previous, queue }: SearchState,
): void {
  for (const next of hexNeighbors(current, map.width, map.height)) {
    const key = indexOf(map, next);
    if (seen.has(key) || !canEnter(next)) continue;
    seen.add(key);
    previous.set(key, current);
    queue.push(next);
  }
}

/**
 * Plus court chemin navigable (BFS, ordre des voisins fixe : même situation, même chemin).
 * Ignore l'occupation : à compléter avec les règles de déplacement (SF-02 §6).
 */
export function shortestPath(
  map: GameMap,
  from: Hex,
  to: Hex,
  category: NavalCategory,
): Hex[] | null {
  const canEnter = (hex: Hex) => isNavigable(terrainAt(map, hex), category);
  if (!canEnter(from) || !canEnter(to)) return null;
  const state: SearchState = {
    seen: new Set([indexOf(map, from)]),
    previous: new Map(),
    queue: [from],
  };
  for (let head = 0; head < state.queue.length; head++) {
    const current = state.queue[head] as Hex;
    if (sameHex(current, to)) return walkBack(map, state.previous, current);
    enqueueNeighbors(map, current, canEnter, state);
  }
  return null;
}
