import type { Rng } from '../core/rng.service';
import {
  type GameMap,
  indexOf,
  inBounds,
  nearestNavigableHex,
  shortestPath,
} from './game-map.service';
import { type Hex, hexLine, hexNeighbors } from './hex.service';
import { isNavigable, TERRAINS, type Terrain } from './terrain.model';

/**
 * Part de la carte attribuée à chaque terrain, de la mer profonde à la montagne.
 * Paramètres de génération provisoires (GD-06 non arbitré).
 */
const TERRAIN_SHARES: Record<Terrain, number> = {
  deep_sea: 0.3,
  sea: 0.25,
  coastal_sea: 0.12,
  beach: 0.05,
  plain: 0.18,
  mountain: 0.1,
};

const SMOOTHING_PASSES = 9;

/** Carte générée, avec le point de départ allié (A) et, en escorte, le point d'arrivée (B). */
export interface ScenarioMap {
  map: GameMap;
  start: Hex;
  goal: Hex | null;
}

export interface EscortMap extends ScenarioMap {
  goal: Hex;
}

/** Remplace chaque valeur par la moyenne de la case et de ses voisines : crée des ensembles cohérents. */
function smooth(field: readonly number[], width: number, height: number): number[] {
  return field.map((value, i) => {
    const neighbors = hexNeighbors({ col: i % width, row: Math.floor(i / width) }, width, height);
    const sum = neighbors.reduce((acc, n) => acc + (field[indexOf({ width }, n)] as number), value);
    return sum / (neighbors.length + 1);
  });
}

/** Découpe le champ lissé par quantiles : la case de rang r reçoit le terrain de sa tranche. */
function assignTerrains(field: readonly number[]): Terrain[] {
  const size = field.length;
  let cumulative = 0;
  const ends = TERRAINS.map((kind) => Math.round((cumulative += TERRAIN_SHARES[kind]) * size));
  const ranked = field.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v || a.i - b.i);
  const terrain = new Array<Terrain>(size);
  ranked.forEach(({ i }, rank) => {
    terrain[i] = TERRAINS[ends.findIndex((end) => rank < end)] as Terrain;
  });
  return terrain;
}

/**
 * Génère une carte procédurale : un champ de bruit lissé est découpé par quantiles, ce qui
 * produit des ensembles cohérents (mer profonde → côtes → plage → plaine → montagne)
 * plutôt qu'une dispersion indépendante des hexagones (SF-02 §1).
 */
export function generateTerrain(width: number, height: number, rng: Rng): GameMap {
  let field = Array.from({ length: width * height }, () => rng());
  for (let pass = 0; pass < SMOOTHING_PASSES; pass++) field = smooth(field, width, height);
  return { width, height, terrain: assignTerrains(field) };
}

/** Creuse un couloir de mer classique le long de la ligne droite entre deux points. */
function carveCorridor(map: GameMap, from: Hex, to: Hex): GameMap {
  const terrain = [...map.terrain];
  for (const hex of hexLine(from, to)) {
    const blocked =
      inBounds(map, hex) && !isNavigable(terrain[indexOf(map, hex)] as Terrain, 'carrier');
    if (blocked) terrain[indexOf(map, hex)] = 'sea';
  }
  return { ...map, terrain };
}

/** Lutte navale : les alliés partent de l'ouest, au milieu de la carte. */
export function generateNavalCombatMap(width: number, height: number, rng: Rng): ScenarioMap {
  const map = generateTerrain(width, height, rng);
  const start = nearestNavigableHex(map, { col: 2, row: Math.floor(height / 2) }, 'submarine');
  return { map, start, goal: null };
}

/**
 * Carte d'escorte : A à l'ouest, B à l'est. Garantit au moins un trajet navigable A→B pour le
 * porte-avions ; si le relief le coupe, un couloir de mer classique est creusé (SF-02 §3).
 */
export function generateEscortMap(width: number, height: number, rng: Rng): EscortMap {
  const generated = generateTerrain(width, height, rng);
  const middle = Math.floor(height / 2);
  const start = nearestNavigableHex(generated, { col: 2, row: middle }, 'carrier');
  const goal = nearestNavigableHex(generated, { col: width - 3, row: middle }, 'carrier');
  const connected = shortestPath(generated, start, goal, 'carrier') !== null;
  return { map: connected ? generated : carveCorridor(generated, start, goal), start, goal };
}
