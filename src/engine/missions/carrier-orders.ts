import type { GameConfig } from '../config/gameConfig';
import * as labelEngine from '../../shared/label-engine';
import { inBounds, shortestPath, terrainAt, type GameMap } from '../map/gameMap';
import { sameHex, type Hex } from '../map/hex';
import { isNavigable } from '../map/terrain';
import type { Unit } from '../units/unit';
import type { MissionKind } from './setup';

/**
 * Ordre de navigation du porte-avions (G-03.2.3) : continuer sa route, s'arrêter, ou passer par
 * un hexagone intermédiaire avant de repartir vers B.
 */
export type CarrierOrder =
  { kind: 'continue' } | { kind: 'stop' } | { kind: 'reroute'; waypoint: Hex };

/**
 * État de navigation du porte-avions, propre à la mission d'escorte. Un ordre actif persiste
 * jusqu'à son remplacement ou son accomplissement (G-03.2.10).
 */
export interface CarrierNavigation {
  /** `continue` : il avance en fin de cycle ; `stop` : il reste en place jusqu'à un nouvel ordre. */
  mode: 'continue' | 'stop';
  /** Point de passage actif (Modifier l'itinéraire), effacé quand le porte-avions l'atteint. */
  waypoint: Hex | null;
  /** Le quota d'un ordre de navigation par cycle est utilisé (G-03.2.4, G-06.5.6). */
  orderUsed: boolean;
}

/** Résultat binaire de la mission (SF-08) ; la défaite viendra avec le combat. */
export type MissionOutcome = 'victory';

/** Pourquoi un point de passage est refusé (SF-02 §5) : la demande est sans effet ni quota. */
export type WaypointRefusal = 'NOT_NAVIGABLE' | 'SAME_HEX' | 'NO_PATH';

export const WAYPOINT_REFUSAL_MESSAGES = labelEngine.waypointRefusalMessages satisfies Record<
  WaypointRefusal,
  string
>;

/** Seule la mission d'escorte a un porte-avions à piloter ; avant tout ordre, il continue vers B. */
export function initialNavigation(mission: MissionKind): CarrierNavigation | null {
  return mission === 'escort' ? { mode: 'continue', waypoint: null, orderUsed: false } : null;
}

export function carrierOf(units: readonly Unit[]): Unit | undefined {
  return units.find((unit) => unit.shipClass === 'carrier');
}

/**
 * Motif de refus d'un point de passage, ou `null` s'il est valide. La validité ne dépend que du
 * terrain et du chemin : une case occupée est acceptée, le blocage est géré au déplacement.
 */
export function waypointRefusal(
  map: GameMap,
  carrier: Unit,
  waypoint: Hex,
  config: GameConfig,
): WaypointRefusal | null {
  const category = config.ships[carrier.shipClass].category;
  if (sameHex(carrier.position, waypoint)) return 'SAME_HEX';
  if (!inBounds(map, waypoint) || !isNavigable(terrainAt(map, waypoint), category)) {
    return 'NOT_NAVIGABLE';
  }
  return shortestPath(map, carrier.position, waypoint, category) ? null : 'NO_PATH';
}

/** Nouvel état de navigation après un ordre accepté : le quota du cycle est consommé. */
export function applyOrder(navigation: CarrierNavigation, order: CarrierOrder): CarrierNavigation {
  switch (order.kind) {
    case 'continue':
      return { ...navigation, mode: 'continue', orderUsed: true };
    case 'stop':
      return { ...navigation, mode: 'stop', orderUsed: true };
    case 'reroute':
      return { mode: 'continue', waypoint: order.waypoint, orderUsed: true };
  }
}
