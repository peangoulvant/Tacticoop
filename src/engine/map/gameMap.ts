import type { Hex } from './hex';
import { hexNeighbors, sameHex } from './hex';
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
  const ok = (h: Hex) => isNavigable(terrainAt(map, h), category);
  if (!ok(from) || !ok(to)) return null;
  const previous = new Map<number, Hex>();
  const seen = new Set<number>([indexOf(map, from)]);
  const queue: Hex[] = [from];
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head] as Hex;
    if (sameHex(current, to)) {
      const path = [current];
      for (let p = previous.get(indexOf(map, current)); p; p = previous.get(indexOf(map, p))) {
        path.unshift(p);
      }
      return path;
    }
    for (const next of hexNeighbors(current, map.width, map.height)) {
      const key = indexOf(map, next);
      if (seen.has(key) || !ok(next)) continue;
      seen.add(key);
      previous.set(key, current);
      queue.push(next);
    }
  }
  return null;
}
