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

/**
 * Lignes (en part de la hauteur) par lesquelles passe un itinéraire de contournement : une au
 * nord et une au sud de la ligne droite A→B. Paramètres de génération provisoires.
 */
const BYPASS_ROW_RATIOS = [0.2, 0.8];

/** Copie de la carte où les cases données sont infranchissables (calcul d'un trajet qui les évite). */
function withBlockedHexes(map: GameMap, hexes: readonly Hex[]): GameMap {
  const terrain = [...map.terrain];
  for (const hex of hexes) terrain[indexOf(map, hex)] = 'mountain';
  return { ...map, terrain };
}

/**
 * Vrai s'il existe, en plus du plus court trajet A→B, un second trajet navigable pour le
 * porte-avions qui n'emprunte aucune de ses cases (hors A et B) : un contournement possible
 * (SF-02 §3). Sa sécurité tactique n'est pas évaluée.
 */
export function hasAlternativeRoute(map: GameMap, start: Hex, goal: Hex): boolean {
  const main = shortestPath(map, start, goal, 'carrier');
  if (!main) return false;
  return shortestPath(withBlockedHexes(map, main.slice(1, -1)), start, goal, 'carrier') !== null;
}

/** Creuse un couloir A → point intermédiaire (au milieu de la carte, sur la ligne donnée) → B. */
function carveBypass(map: GameMap, start: Hex, goal: Hex, row: number): GameMap {
  const waypoint = { col: Math.floor((start.col + goal.col) / 2), row };
  return carveCorridor(carveCorridor(map, start, waypoint), waypoint, goal);
}

/** Nombre de cases dont le terrain diffère entre deux cartes de même taille. */
function changedCells(before: GameMap, after: GameMap): number {
  return after.terrain.filter((terrain, i) => terrain !== before.terrain[i]).length;
}

/**
 * Favorise les itinéraires alternatifs (SF-02 §3) : si la carte ne laisse qu'un passage, creuse un
 * contournement, au nord ou au sud, en retenant le côté qui modifie le moins de relief (le nord à
 * égalité). Une carte qui offre déjà un contournement n'est pas modifiée. Sans aléa : une même
 * carte donne toujours le même résultat.
 */
function withAlternativeRoute(map: GameMap, start: Hex, goal: Hex): GameMap {
  if (hasAlternativeRoute(map, start, goal)) return map;
  const candidates = BYPASS_ROW_RATIOS.map((ratio) =>
    carveBypass(map, start, goal, Math.round((map.height - 1) * ratio)),
  ).filter((candidate) => hasAlternativeRoute(candidate, start, goal));
  return candidates.sort((a, b) => changedCells(map, a) - changedCells(map, b))[0] ?? map;
}

/** Colonne située à une part `ratio` de la largeur (0 = bord ouest, 1 = bord est). */
export function columnAtRatio(width: number, ratio: number): number {
  return Math.round(ratio * (width - 1));
}

/**
 * Lutte navale : les alliés partent de l'ouest, au milieu de la carte, à la colonne donnée par
 * `startColumnRatio` (AB-14).
 */
export function generateNavalCombatMap(
  width: number,
  height: number,
  rng: Rng,
  startColumnRatio: number,
): ScenarioMap {
  const map = generateTerrain(width, height, rng);
  const target = { col: columnAtRatio(width, startColumnRatio), row: Math.floor(height / 2) };
  return { map, start: nearestNavigableHex(map, target, 'submarine'), goal: null };
}

/**
 * Carte d'escorte : A à l'ouest, B à l'est. Garantit au moins un trajet navigable A→B pour le
 * porte-avions ; si le relief le coupe, un couloir de mer classique est creusé (SF-02 §3). Un
 * contournement est ensuite favorisé quand la carte n'en offre pas (`withAlternativeRoute`).
 */
export function generateEscortMap(
  width: number,
  height: number,
  rng: Rng,
  startColumnRatio: number,
  goalColumnRatio: number,
): EscortMap {
  const generated = generateTerrain(width, height, rng);
  const middle = Math.floor(height / 2);
  const startTarget = { col: columnAtRatio(width, startColumnRatio), row: middle };
  const goalTarget = { col: columnAtRatio(width, goalColumnRatio), row: middle };
  const start = nearestNavigableHex(generated, startTarget, 'carrier');
  const goal = nearestNavigableHex(generated, goalTarget, 'carrier');
  const connected = shortestPath(generated, start, goal, 'carrier') !== null;
  const reachable = connected ? generated : carveCorridor(generated, start, goal);
  return { map: withAlternativeRoute(reachable, start, goal), start, goal };
}
