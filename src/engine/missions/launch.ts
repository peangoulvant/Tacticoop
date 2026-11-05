import type { GameConfig, ShipClass } from '../config/gameConfig';
import { PURCHASABLE_CLASSES } from '../config/gameConfig';
import { createRng } from '../core/rng';
import { generateEscortMap, generateNavalCombatMap, type ScenarioMap } from '../map/generate';
import { indexOf, nearestNavigableHex } from '../map/gameMap';
import { createUnit, type Unit, type UnitModifiers } from '../units/unit';
import type { MissionSetup } from './setup';

export interface LaunchedMission extends ScenarioMap {
  units: Unit[];
}

/** Classes à placer : le porte-avions du scénario d'abord, puis la force choisie. */
function rosterOf(setup: MissionSetup): ShipClass[] {
  return [
    ...(setup.mission === 'escort' ? (['carrier'] as const) : []),
    ...PURCHASABLE_CLASSES.flatMap((cls) => Array<ShipClass>(setup.force[cls]).fill(cls)),
  ];
}

/** Effets des contraintes initiales sur les unités alliées (SF-01 §4). */
function modifiersOf(setup: MissionSetup, config: GameConfig): UnitModifiers {
  return {
    ammoFactor: setup.constraints.includes('limited_ammo') ? config.constraints.ammoFactor : 1,
    movementCap: setup.constraints.includes('bad_weather')
      ? config.constraints.badWeatherMaxMovement
      : null,
  };
}

/** Placement automatique près du point A, sur des hexagones navigables et libres (SF-02 §4). */
function placeUnits(
  roster: readonly ShipClass[],
  { map, start }: ScenarioMap,
  config: GameConfig,
  modifiers: UnitModifiers,
): Unit[] {
  const taken = new Set<number>();
  const counters = new Map<ShipClass, number>();
  return roster.map((cls) => {
    const position = nearestNavigableHex(map, start, config.ships[cls].category, taken);
    taken.add(indexOf(map, position));
    const n = (counters.get(cls) ?? 0) + 1;
    counters.set(cls, n);
    return createUnit(`friend-${cls}-${n}`, 'friend', cls, position, config, modifiers);
  });
}

/**
 * Crée la carte et place les unités alliées automatiquement (aucun déploiement manuel).
 * La force ennemie n'est pas créée : sa composition et ses zones de départ ne sont pas arbitrées.
 */
export function launchMission(
  setup: MissionSetup,
  config: GameConfig,
  seed: number,
): LaunchedMission {
  const rng = createRng(seed);
  const { width, height } = config.map;
  const scenario =
    setup.mission === 'escort'
      ? generateEscortMap(width, height, rng)
      : generateNavalCombatMap(width, height, rng);
  const units = placeUnits(rosterOf(setup), scenario, config, modifiersOf(setup, config));
  return { ...scenario, units };
}
