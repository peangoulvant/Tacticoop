import type { GameConfig, ShipClass } from '../config/gameConfig';
import { PURCHASABLE_CLASSES } from '../config/gameConfig';
import { createRng } from '../core/rng';
import { generateEscortMap, generateTerrain } from '../map/generate';
import { type GameMap, indexOf, terrainAt } from '../map/gameMap';
import { type Hex, hexDistance } from '../map/hex';
import { isNavigable, type NavalCategory } from '../map/terrain';
import { createUnit, type Unit } from '../units/unit';
import type { MissionSetup } from './setup';

export interface LaunchedMission {
  map: GameMap;
  /** Point A (départ allié) ; point B uniquement en escorte. */
  start: Hex;
  goal: Hex | null;
  units: Unit[];
}

/**
 * Crée la carte et place les unités alliées automatiquement (SF-02 §4, aucun déploiement manuel).
 * La force ennemie n'est pas créée : sa composition et ses zones de départ ne sont pas arbitrées.
 */
export function launchMission(
  setup: MissionSetup,
  config: GameConfig,
  seed: number,
): LaunchedMission {
  const rng = createRng(seed);
  const { width, height } = config.map;

  let map: GameMap;
  let start: Hex;
  let goal: Hex | null = null;
  if (setup.mission === 'escort') {
    ({ map, start, goal } = generateEscortMap(width, height, rng));
  } else {
    map = generateTerrain(width, height, rng);
    start = nearestNavigable(map, { col: 2, row: Math.floor(height / 2) }, 'submarine');
  }

  const classes: ShipClass[] = [];
  if (setup.mission === 'escort') classes.push('carrier');
  for (const cls of PURCHASABLE_CLASSES) {
    for (let i = 0; i < setup.force[cls]; i++) classes.push(cls);
  }

  const modifiers = {
    ammoFactor: setup.constraints.includes('limited_ammo') ? config.constraints.ammoFactor : 1,
    movementCap: setup.constraints.includes('bad_weather')
      ? config.constraints.badWeatherMaxMovement
      : null,
  };

  const taken = new Set<number>();
  const counters: Partial<Record<ShipClass, number>> = {};
  const units = classes.map((cls) => {
    const category = config.ships[cls].category;
    const position = freeHexNear(map, start, category, taken);
    taken.add(indexOf(map, position));
    const n = (counters[cls] = (counters[cls] ?? 0) + 1);
    return createUnit(`friend-${cls}-${n}`, 'friend', cls, position, config, modifiers);
  });

  return { map, start, goal, units };
}

/** Hexagones triés par distance au point de départ puis par position : placement déterministe. */
function freeHexNear(map: GameMap, origin: Hex, category: NavalCategory, taken: Set<number>): Hex {
  let best: Hex | null = null;
  let bestDistance = Infinity;
  for (let row = 0; row < map.height; row++) {
    for (let col = 0; col < map.width; col++) {
      const hex = { col, row };
      if (taken.has(indexOf(map, hex)) || !isNavigable(terrainAt(map, hex), category)) continue;
      const d = hexDistance(hex, origin);
      if (d < bestDistance) {
        best = hex;
        bestDistance = d;
      }
    }
  }
  if (!best) throw new Error('Aucun hexagone libre pour placer une unité');
  return best;
}

const nearestNavigable = (map: GameMap, target: Hex, category: NavalCategory): Hex =>
  freeHexNear(map, target, category, new Set());
