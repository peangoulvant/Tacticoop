import type { Rng } from '../core/rng';
import { type GameMap, indexOf, inBounds, shortestPath, terrainAt } from './gameMap';
import { type Hex, hexDistance, hexLine, hexNeighbors } from './hex';
import { isNavigable, TERRAINS, type Terrain } from './terrain';

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

/**
 * Génère une carte procédurale : un champ de bruit lissé est découpé par quantiles, ce qui
 * produit des ensembles cohérents (mer profonde → côtes → plage → plaine → montagne)
 * plutôt qu'une dispersion indépendante des hexagones (SF-02 §1).
 */
export function generateTerrain(width: number, height: number, rng: Rng): GameMap {
  const size = width * height;
  let field = Array.from({ length: size }, () => rng());

  for (let pass = 0; pass < SMOOTHING_PASSES; pass++) {
    const next = new Array<number>(size);
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const i = row * width + col;
        let sum = field[i] as number;
        let count = 1;
        for (const n of hexNeighbors({ col, row }, width, height)) {
          sum += field[n.row * width + n.col] as number;
          count++;
        }
        next[i] = sum / count;
      }
    }
    field = next;
  }

  // Rang de chaque case dans le champ lissé → terrain selon sa tranche de quantile.
  const order = field.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v || a.i - b.i);
  const terrain = new Array<Terrain>(size);
  let cumulative = 0;
  let cursor = 0;
  for (const kind of TERRAINS) {
    cumulative += TERRAIN_SHARES[kind];
    const end = kind === 'mountain' ? size : Math.round(cumulative * size);
    for (; cursor < end; cursor++) terrain[(order[cursor] as { i: number }).i] = kind;
  }
  return { width, height, terrain };
}

/** Hexagone navigable pour un porte-avions le plus proche de la cible désirée. */
function nearestCarrierWater(map: GameMap, target: Hex): Hex {
  let best: Hex | null = null;
  let bestDistance = Infinity;
  for (let row = 0; row < map.height; row++) {
    for (let col = 0; col < map.width; col++) {
      const hex = { col, row };
      if (!isNavigable(terrainAt(map, hex), 'carrier')) continue;
      const d = hexDistance(hex, target);
      if (d < bestDistance) {
        best = hex;
        bestDistance = d;
      }
    }
  }
  if (!best) throw new Error('Carte sans aucune mer navigable');
  return best;
}

export interface EscortMap {
  map: GameMap;
  start: Hex;
  goal: Hex;
}

/**
 * Carte d'escorte : A à l'ouest, B à l'est. Garantit au moins un trajet navigable A→B pour le
 * porte-avions ; si le relief le coupe, un couloir de mer classique est creusé (SF-02 §3).
 */
export function generateEscortMap(width: number, height: number, rng: Rng): EscortMap {
  const generated = generateTerrain(width, height, rng);
  const middle = Math.floor(height / 2);
  const start = nearestCarrierWater(generated, { col: 2, row: middle });
  const goal = nearestCarrierWater(generated, { col: width - 3, row: middle });

  if (shortestPath(generated, start, goal, 'carrier')) return { map: generated, start, goal };

  const terrain = [...generated.terrain];
  for (const hex of hexLine(start, goal)) {
    if (!inBounds(generated, hex)) continue;
    if (!isNavigable(terrain[indexOf(generated, hex)] as Terrain, 'carrier')) {
      terrain[indexOf(generated, hex)] = 'sea';
    }
  }
  return { map: { width, height, terrain }, start, goal };
}
