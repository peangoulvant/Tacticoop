import type { DetectionConfig } from '../config/game.config';
import type { Rng } from '../core/rng.service';
import { inBounds, terrainAt, type GameMap } from '../map/game-map.service';
import { growShape, hexNeighbors, placeShape, sameHex, type Hex } from '../map/hex.service';
import { isWater } from '../map/terrain.model';

/** Tri canonique : par ligne puis colonne. L'ordre de construction commence par la cible (AB-20). */
function sortedByPosition(cells: readonly Hex[]): Hex[] {
  return [...cells].sort((a, b) => a.row - b.row || a.col - b.col);
}

/** Vrai si tous les hexagones sont dans la carte et ne sont ni plage, ni plaine, ni montagne. */
function isAllWater(map: GameMap, cells: readonly Hex[]): boolean {
  return cells.every((hex) => inBounds(map, hex) && isWater(terrainAt(map, hex)));
}

/**
 * Une tentative : forme tirée par croissance aléatoire, placée de sorte que la cible occupe une
 * case de la forme tirée uniformément. La cible n'est donc pas favorisée au centre : une chance
 * sur `size` quelle que soit la stratégie du joueur (AB-20).
 */
function attemptZone(map: GameMap, target: Hex, size: number, rng: Rng): Hex[] | null {
  const shape = growShape(size, rng);
  const anchor = Math.floor(rng() * size);
  const cells = placeShape(shape, anchor, target);
  return isAllWater(map, cells) ? cells : null;
}

/**
 * Repli quand aucune tentative n'a donné une zone sans terre : croissance limitée aux cases d'eau
 * de la carte, à partir de la cible. La zone peut compter moins de `size` hexagones.
 */
function waterOnlyZone(map: GameMap, target: Hex, size: number, rng: Rng): Hex[] {
  const zone: Hex[] = [target];
  while (zone.length < size) {
    const frontier = zone
      .flatMap((hex) => hexNeighbors(hex, map.width, map.height))
      .filter((n) => isWater(terrainAt(map, n)) && !zone.some((z) => sameHex(z, n)));
    if (frontier.length === 0) break;
    zone.push(frontier[Math.floor(rng() * frontier.length)] as Hex);
  }
  return zone;
}

/**
 * Zone approximative d'un contact passif (G-08.5, AB-20) : au plus `zoneSize` hexagones contigus,
 * contenant la cible, sans terre. On refait la zone jusqu'à `zoneMaxAttempts` fois, puis on se
 * replie sur une croissance limitée à l'eau. Les cases sont triées pour ne pas révéler la cible.
 */
export function generatePassiveZone(
  map: GameMap,
  target: Hex,
  rng: Rng,
  detection: DetectionConfig,
): Hex[] {
  for (let attempt = 0; attempt < detection.zoneMaxAttempts; attempt++) {
    const zone = attemptZone(map, target, detection.zoneSize, rng);
    if (zone) return sortedByPosition(zone);
  }
  return sortedByPosition(waterOnlyZone(map, target, detection.zoneSize, rng));
}
