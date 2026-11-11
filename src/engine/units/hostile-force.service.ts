import type {
  HostileComposition,
  HostileForceSpec,
  HostileFrigateClass,
  GameConfig,
  ShipClass,
} from '../config/game.config';
import { pickWeighted, randomInt, type Rng } from '../core/rng.service';
import { indexOf, terrainAt, type GameMap } from '../map/game-map.service';
import type { ScenarioMap } from '../map/generate.service';
import { hexDistance, type Hex } from '../map/hex.service';
import { isNavigable, type NavalCategory } from '../map/terrain.model';
import { createUnit, type Unit } from './unit.model';
import type { MissionKind } from '../missions/setup.service';

/** Les contraintes initiales ne s'appliquent qu'aux alliés (SF-01 §4) : l'ennemi garde sa fiche. */
const NO_MODIFIERS = { ammoFactor: 1, movementCap: null } as const;

/** Distance minimale à respecter vis-à-vis d'un point de la carte. */
interface MinDistance {
  from: Hex;
  distance: number;
}

/** Zone de départ ennemie : colonnes autorisées (bornes incluses) et distances minimales (AB-12, AB-13). */
export interface HostileZone {
  fromCol: number;
  toCol: number;
  minDistances: MinDistance[];
}

/**
 * Distance en hexagones correspondant à une part de la largeur de la carte.
 * Exemple : 0,4 sur une carte de 35 de large donne 14 hexagones.
 */
function distanceOfRatio(width: number, ratio: number): number {
  return Math.round(width * ratio);
}

/**
 * Zone de départ ennemie du scénario, calculée à partir de la carte générée et de `GameConfig`.
 * Lutte navale : bande est, loin du point de départ allié. Escorte : partie centrale, loin de A
 * et de B (SF-02 §4). L'itinéraire initial du porte-avions n'est pas exclu (AB-09).
 */
export function hostileZoneOf(
  mission: MissionKind,
  { map, start, goal }: ScenarioMap,
  config: GameConfig,
): HostileZone {
  const { width } = map;
  if (mission === 'naval_combat') {
    const cfg = config.missions.navalCombat;
    return {
      fromCol: width - Math.floor(width * cfg.hostileZoneWidthRatio),
      toCol: width - 1,
      minDistances: [{ from: start, distance: distanceOfRatio(width, cfg.minStartDistanceRatio) }],
    };
  }
  const cfg = config.missions.escort;
  const minDistances = [
    { from: start, distance: distanceOfRatio(width, cfg.minDistanceFromStartRatio) },
  ];
  if (goal) {
    minDistances.push({
      from: goal,
      distance: distanceOfRatio(width, cfg.minDistanceFromGoalRatio),
    });
  }
  return {
    fromCol: Math.floor(width * cfg.interceptionZone.fromRatio),
    toCol: Math.floor(width * cfg.interceptionZone.toRatio),
    minDistances,
  };
}

/** Force ennemie du scénario (AB-11, AB-13). */
export function hostileForceSpecOf(mission: MissionKind, config: GameConfig): HostileForceSpec {
  return mission === 'escort'
    ? config.missions.escort.hostile
    : config.missions.navalCombat.hostile;
}

/**
 * Tire la composition de la force ennemie : d'abord la configuration (frégates et sous-marins),
 * puis la classe de chaque frégate, indépendamment (AB-11). Les frégates précèdent les
 * sous-marins dans le résultat. La difficulté n'intervient pas (G-10.10).
 */
export function drawHostileClasses(force: HostileForceSpec, rng: Rng): ShipClass[] {
  const composition: HostileComposition = pickWeighted(force.compositions, (c) => c.weight, rng);
  const frigateClasses = Object.keys(force.frigateClassWeights) as HostileFrigateClass[];
  const frigates = Array.from({ length: composition.frigates }, () =>
    pickWeighted(frigateClasses, (cls) => force.frigateClassWeights[cls], rng),
  );
  const submarines = Array<ShipClass>(composition.submarines).fill('submarine');
  return [...frigates, ...submarines];
}

/** Vrai si l'hexagone respecte toutes les distances minimales de la zone. */
function farEnough(hex: Hex, minDistances: readonly MinDistance[]): boolean {
  return minDistances.every(({ from, distance }) => hexDistance(hex, from) >= distance);
}

/**
 * Hexagones libres de la zone où une unité de la catégorie peut partir : dans les colonnes de la
 * zone, sur un terrain navigable pour elle, hors cases déjà prises, et assez loin des points à
 * éviter. Le parcours ligne par ligne rend la liste déterministe.
 */
function candidateHexes(
  map: GameMap,
  zone: HostileZone,
  category: NavalCategory,
  taken: ReadonlySet<number>,
): Hex[] {
  const isFree = (hex: Hex) =>
    !taken.has(indexOf(map, hex)) && isNavigable(terrainAt(map, hex), category);
  const candidates: Hex[] = [];
  for (let row = 0; row < map.height; row++) {
    for (let col = zone.fromCol; col <= zone.toCol; col++) {
      const hex = { col, row };
      if (isFree(hex) && farEnough(hex, zone.minDistances)) candidates.push(hex);
    }
  }
  return candidates;
}

/**
 * Crée les unités ennemies et les place au hasard dans la zone, une par hexagone (SF-02 §2),
 * indépendamment les unes des autres. Les cases déjà occupées (`taken`, indices) sont exclues.
 * Si aucun hexagone ne convient, le lancement échoue plutôt que d'élargir la zone (AB-12).
 */
export function createHostileUnits(
  classes: readonly ShipClass[],
  map: GameMap,
  zone: HostileZone,
  taken: ReadonlySet<number>,
  config: GameConfig,
  rng: Rng,
): Unit[] {
  const occupied = new Set(taken);
  const counters = new Map<ShipClass, number>();
  return classes.map((cls) => {
    const candidates = candidateHexes(map, zone, config.ships[cls].category, occupied);
    if (candidates.length === 0) {
      throw new Error(`Aucun hexagone de départ ennemi disponible pour la classe ${cls}`);
    }
    const position = candidates[randomInt(rng, candidates.length)] as Hex;
    occupied.add(indexOf(map, position));
    const n = (counters.get(cls) ?? 0) + 1;
    counters.set(cls, n);
    return createUnit(`hostile-${cls}-${n}`, 'hostile', cls, position, config, NO_MODIFIERS);
  });
}
