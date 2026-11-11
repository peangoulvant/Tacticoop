import type { GameConfig, ShipClass } from '../config/game.config';
import { PURCHASABLE_CLASSES } from '../config/game.config';
import { createRng, type Rng } from '../core/rng.service';
import type { Contact } from '../detection/contact.types';
import {
  generateEscortMap,
  generateNavalCombatMap,
  type ScenarioMap,
} from '../map/generate.service';
import { indexOf, nearestNavigableHex } from '../map/game-map.service';
import { createUnit, type Unit, type UnitModifiers } from '../units/unit.model';
import { initialCarrierNavigation, type CarrierNavigation } from '../units/carrier-orders.service';
import {
  createHostileUnits,
  drawHostileClasses,
  hostileForceSpecOf,
  hostileZoneOf,
} from '../units/hostile-force.service';
import type { MissionSetup } from './setup.service';

export interface LaunchedMission extends ScenarioMap {
  units: Unit[];
  carrierNavigation: CarrierNavigation | null;
  friendContacts: Contact[];
  nextContactNumber: number;
  hostileContacts: Contact[];
  nextHostileContactNumber: number;
  /** État du générateur après les tirages du lancement (AB-24). */
  rngState: number;
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

/** Génère la carte du scénario, avec les colonnes de départ lues dans `GameConfig` (AB-14, AB-16). */
function generateScenario(setup: MissionSetup, config: GameConfig, rng: Rng): ScenarioMap {
  const { width, height } = config.map;
  const { navalCombat, escort } = config.missions;
  return setup.mission === 'escort'
    ? generateEscortMap(
        width,
        height,
        rng,
        escort.startColumnRatio,
        escort.goalColumnRatio,
        config.map.generation,
      )
    : generateNavalCombatMap(
        width,
        height,
        rng,
        navalCombat.alliedStartColumnRatio,
        config.map.generation,
      );
}

/**
 * Crée la carte, place les unités alliées automatiquement (aucun déploiement manuel), puis la
 * force ennemie : composition tirée, puis positions tirées dans la zone de départ du scénario
 * (AB-11 à AB-13). Ordre des tirages : carte, composition, classes de frégate, positions.
 */
export function launchMission(
  setup: MissionSetup,
  config: GameConfig,
  seed: number,
): LaunchedMission {
  const rng = createRng(seed);
  const scenario = generateScenario(setup, config, rng);
  const allies = placeUnits(rosterOf(setup), scenario, config, modifiersOf(setup, config));
  const classes = drawHostileClasses(hostileForceSpecOf(setup.mission, config), rng);
  const zone = hostileZoneOf(setup.mission, scenario, config);
  const taken = new Set(allies.map((unit) => indexOf(scenario.map, unit.position)));
  // Météo défavorable : seule contrainte qui plafonne aussi le déplacement de l'ennemi (AB-36).
  const { movementCap } = modifiersOf(setup, config);
  const hostiles = createHostileUnits(classes, scenario.map, zone, taken, config, rng, movementCap);
  return {
    ...scenario,
    units: [...allies, ...hostiles],
    carrierNavigation: initialCarrierNavigation(setup.mission),
    friendContacts: [],
    nextContactNumber: 1,
    hostileContacts: [],
    nextHostileContactNumber: 1,
    rngState: rng.state(),
  };
}
