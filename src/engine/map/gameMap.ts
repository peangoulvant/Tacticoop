import type { Hex } from './hex';
import { hexDistance, hexNeighbors } from './hex';
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

/** Hexagone d'indice `index` dans `terrain` (inverse de `indexOf`). */
export const hexFromIndex = (map: Pick<GameMap, 'width'>, index: number): Hex => ({
  col: index % map.width,
  row: Math.floor(index / map.width),
});

/** Prédécesseur de chaque case atteinte ; la case de départ a pour prédécesseur `null`. */
export type PathTree = ReadonlyMap<number, Hex | null>;

/** Cases voisines de la frontière, non encore atteintes et accessibles, dans l'ordre fixe des directions. */
function expandFrontier(
  map: GameMap,
  frontier: readonly Hex[],
  canEnter: (hex: Hex) => boolean,
  previous: Map<number, Hex | null>,
): Hex[] {
  const next: Hex[] = [];
  for (const current of frontier) {
    for (const neighbor of hexNeighbors(current, map.width, map.height)) {
      const key = indexOf(map, neighbor);
      if (previous.has(key) || !canEnter(neighbor)) continue;
      previous.set(key, current);
      next.push(neighbor);
    }
  }
  return next;
}

/**
 * Parcours en largeur depuis `from`, limité à `maxSteps` pas. L'ordre des voisins étant fixe,
 * une même situation donne toujours les mêmes chemins (SF-02 §6). La case de départ n'est pas
 * soumise à `canEnter`.
 */
export function exploreFrom(
  map: GameMap,
  from: Hex,
  canEnter: (hex: Hex) => boolean,
  maxSteps = Infinity,
): PathTree {
  const previous = new Map<number, Hex | null>([[indexOf(map, from), null]]);
  let frontier: Hex[] = [from];
  for (let step = 0; step < maxSteps && frontier.length > 0; step++) {
    frontier = expandFrontier(map, frontier, canEnter, previous);
  }
  return previous;
}

/** Chemin du départ à `to` (extrémités incluses) d'après l'arbre de parcours, ou `null`. */
export function pathTo(map: GameMap, tree: PathTree, to: Hex): Hex[] | null {
  if (!tree.has(indexOf(map, to))) return null;
  const path = [to];
  for (let p = tree.get(indexOf(map, to)); p; p = tree.get(indexOf(map, p))) path.unshift(p);
  return path;
}

/**
 * Plus court chemin navigable, sans tenir compte de l'occupation ni de la capacité de mouvement
 * (voir `planMove` pour le déplacement d'une unité).
 */
export function shortestPath(
  map: GameMap,
  from: Hex,
  to: Hex,
  category: NavalCategory,
): Hex[] | null {
  const canEnter = (hex: Hex) => isNavigable(terrainAt(map, hex), category);
  if (!canEnter(from) || !canEnter(to)) return null;
  return pathTo(map, exploreFrom(map, from, canEnter), to);
}
