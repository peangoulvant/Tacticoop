import type { GameConfig } from '../config/gameConfig';
import type { MissionState, Progress } from '../core/types';
import { indexOf, shortestPath, type GameMap } from '../map/gameMap';
import { sameHex, type Hex } from '../map/hex';
import type { NavalCategory } from '../map/terrain';
import type { Unit } from '../units/unit';
import { CarrierOrderKind, carrierOf, type CarrierNavigation } from './carrier-orders';

/** Enchaîne les plus courts chemins de `from` à chaque étape ; `null` si un tronçon est impossible. */
function routeThrough(
  map: GameMap,
  category: NavalCategory,
  from: Hex,
  stops: readonly Hex[],
): Hex[] | null {
  const route: Hex[] = [from];
  let at = from;
  for (const stop of stops) {
    const leg = shortestPath(map, at, stop, category);
    if (!leg) return null;
    route.push(...leg.slice(1));
    at = stop;
  }
  return route;
}

/**
 * Trajet prévu du porte-avions jusqu'à B, en passant par le point de passage actif s'il existe
 * (SF-02 §5, SF-03.15). Chemin le plus court sur le terrain seul, recalculé depuis la position
 * courante : les autres unités ne le modifient jamais, elles ne font que l'interrompre
 * (G-03.2.13). La position courante est le premier hexagone. `null` s'il n'y a pas de porte-avions
 * ou de point B, ou si un tronçon n'a aucun chemin.
 */
export function plannedRoute(mission: MissionState, config: GameConfig): Hex[] | null {
  const carrier = carrierOf(mission.units);
  if (!carrier || !mission.goal) return null;
  const stops = [mission.carrierNavigation?.waypoint, mission.goal].filter((hex) => hex != null);
  const category = config.ships[carrier.shipClass].category;
  return routeThrough(mission.map, category, carrier.position, stops);
}

/** Hexagones que le porte-avions franchit : au plus `movement`, arrêt avant une case occupée. */
function freeSteps(mission: MissionState, route: readonly Hex[], movement: number): Hex[] {
  const occupied = new Set(mission.units.map((unit) => indexOf(mission.map, unit.position)));
  const steps: Hex[] = [];
  for (const hex of route.slice(1, movement + 1)) {
    if (occupied.has(indexOf(mission.map, hex))) break;
    steps.push(hex);
  }
  return steps;
}

/** Ce que le porte-avions peut parcourir en fin de cycle. */
interface Trip {
  carrier: Unit;
  carrierNavigation: CarrierNavigation;
  steps: Hex[];
}

/** Le déplacement du cycle, ou `null` si le porte-avions ne navigue pas (arrêt, lutte navale). */
function tripOf(mission: MissionState, config: GameConfig): Trip | null {
  const carrier = carrierOf(mission.units);
  const { carrierNavigation } = mission;
  if (!carrier || carrierNavigation?.mode !== CarrierOrderKind.CONTINUE) return null;
  const route = plannedRoute(mission, config);
  return route
    ? { carrier, carrierNavigation, steps: freeSteps(mission, route, carrier.movement) }
    : null;
}

/** Place le porte-avions à destination ; un point de passage franchi est effacé. */
function relocateCarrier(mission: MissionState, trip: Trip, to: Hex): MissionState {
  const { waypoint } = trip.carrierNavigation;
  const passed = waypoint !== null && trip.steps.some((hex) => sameHex(hex, waypoint));
  return {
    ...mission,
    units: mission.units.map((u) => (u.id === trip.carrier.id ? { ...u, position: to } : u)),
    carrierNavigation: { ...trip.carrierNavigation, waypoint: passed ? null : waypoint },
  };
}

/**
 * Déplacement automatique du porte-avions, une seule fois en fin de cycle (G-03.2.7), de 0 à
 * `movement` hexagones. À l'arrêt, ou si la case suivante est occupée, il reste en place sans
 * changer d'ordre. Un point de passage franchi est effacé : il repart vers B avec les pas
 * restants. Ce déplacement ne déclenche aucune réaction ennemie (G-03.2.8).
 */
export function moveCarrier(mission: MissionState, config: GameConfig): Progress {
  const trip = tripOf(mission, config);
  const to = trip?.steps.at(-1);
  if (!trip || !to) return { state: mission, events: [] };
  return {
    state: relocateCarrier(mission, trip, to),
    events: [{ type: 'CARRIER_MOVED', from: trip.carrier.position, to, cycle: mission.cycle }],
  };
}

/** Le porte-avions est arrivé en B (G-03.2.9, AB-01). */
export function hasCarrierArrived(mission: MissionState): boolean {
  const carrier = carrierOf(mission.units);
  return !!carrier && !!mission.goal && sameHex(carrier.position, mission.goal);
}
