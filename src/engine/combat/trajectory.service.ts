import { exploreFrom, inBounds, pathTo, terrainAt, type GameMap } from '../map/game-map.service';
import { fromAxial, hexLine, toAxial, type Axial, type Hex } from '../map/hex.service';
import { isWater } from '../map/terrain.model';

/*
 * Trajectoires des projectiles (AB-47). Le calcul de ligne hexagonale reste `hexLine` ; ces
 * fonctions y ajoutent la règle de chaque arme : le missile vole en ligne droite au-dessus de tous
 * les terrains, la torpille suit l'eau par le plus court chemin puis garde son cap.
 */

/**
 * Cases que parcourt un missile de `from` jusqu'à `to`, en ligne droite, sans la case de départ.
 * Exemple : de (0, 0) à (3, 0), les trois cases suivantes ; `to` est la dernière.
 */
export function missileTrajectory(from: Hex, to: Hex): Hex[] {
  return hexLine(from, to).slice(1);
}

/** Hexagone d'eau : seul terrain qu'une torpille traverse (G-09 §2.1). */
export function isWaterHex(map: GameMap, hex: Hex): boolean {
  return inBounds(map, hex) && isWater(terrainAt(map, hex));
}

/**
 * Cases que parcourt une torpille de `from` jusqu'à `to` par le plus court chemin maritime, sans la
 * case de départ ; `null` s'il n'en existe aucun. L'ordre fixe des voisins rend le départage des
 * chemins égaux reproductible (SF-02 §6).
 */
export function torpedoTrajectory(map: GameMap, from: Hex, to: Hex): Hex[] | null {
  if (!isWaterHex(map, from) || !isWaterHex(map, to)) return null;
  const tree = exploreFrom(map, from, (hex) => isWaterHex(map, hex));
  return pathTo(map, tree, to)?.slice(1) ?? null;
}

/** Direction (axiale) du pas entre deux cases voisines : le « cap » d'une torpille. */
export function headingOf(from: Hex, to: Hex): Axial {
  const a = toAxial(from);
  const b = toAxial(to);
  return { q: b.q - a.q, r: b.r - a.r };
}

/** Case suivante dans la direction du cap, éventuellement hors de la carte (le moteur la contrôle). */
export function stepAlong(from: Hex, heading: Axial): Hex {
  const a = toAxial(from);
  return fromAxial({ q: a.q + heading.q, r: a.r + heading.r });
}
