import type { GameConfig } from '../config/game.config';
import * as labelEngine from '../../shared/engine.label';
import { inBounds, shortestPath, terrainAt, type GameMap } from '../map/game-map.service';
import { sameHex, type Hex } from '../map/hex.service';
import { isNavigable } from '../map/terrain.model';
import type { Unit } from './unit.model';
import type { MissionKind } from '../missions/setup.service';

/**
 * Types d'ordre de navigation du porte-avions (G-03.2.3) : Poursuivre, Stopper, Modifier
 * l'itinéraire. Valeurs sérialisables telles quelles : à utiliser plutôt que des chaînes en dur.
 */
export const CarrierOrderKind = {
  CONTINUE: 'continue',
  STOP: 'stop',
  REROUTE: 'reroute',
} as const;
export type CarrierOrderKind = (typeof CarrierOrderKind)[keyof typeof CarrierOrderKind];

/** Mode de déplacement en vigueur : les deux ordres qui ne portent pas de point de passage. */
export type CarrierMode = typeof CarrierOrderKind.CONTINUE | typeof CarrierOrderKind.STOP;

/**
 * Ordre de navigation du porte-avions : continuer sa route, s'arrêter, ou passer par un
 * hexagone intermédiaire avant de repartir vers B.
 */
export type CarrierOrder =
  | { kind: typeof CarrierOrderKind.CONTINUE }
  | { kind: typeof CarrierOrderKind.STOP }
  | { kind: typeof CarrierOrderKind.REROUTE; waypoint: Hex };

/**
 * État de navigation du porte-avions, propre à la mission d'escorte. Un ordre actif persiste
 * jusqu'à son remplacement ou son accomplissement (G-03.2.10).
 */
export interface CarrierNavigation {
  /** `continue` : il avance en fin de cycle ; `stop` : il reste en place jusqu'à un nouvel ordre. */
  mode: CarrierMode;
  /** Point de passage actif (Modifier l'itinéraire), effacé quand le porte-avions l'atteint. */
  waypoint: Hex | null;
  /** Le quota d'un ordre de navigation par cycle est utilisé (G-03.2.4, G-06.5.6). */
  orderUsed: boolean;
}

/** Résultat binaire de la mission (SF-08) ; la défaite viendra avec le combat. */
export type MissionOutcome = 'victory' | 'defeat';

/** Pourquoi un point de passage est refusé (SF-02 §5) : la demande est sans effet ni quota. */
export type WaypointRefusal = 'NOT_NAVIGABLE' | 'SAME_HEX' | 'NO_PATH';

export const WAYPOINT_REFUSAL_MESSAGES = labelEngine.waypointRefusalMessages satisfies Record<
  WaypointRefusal,
  string
>;

/** Seule la mission d'escorte a un porte-avions à piloter ; avant tout ordre, il continue vers B. */
export function initialCarrierNavigation(mission: MissionKind): CarrierNavigation | null {
  return mission === 'escort'
    ? { mode: CarrierOrderKind.CONTINUE, waypoint: null, orderUsed: false }
    : null;
}

/** Le porte-avions de la mission, ou `undefined` en lutte navale (il n'y en a pas). */
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

/**
 * Nouvel état de navigation après un ordre accepté : le quota du cycle est consommé.
 *
 * Exemples : « Stopper » met le mode à `stop` (le porte-avions reste en place jusqu'à un nouvel
 * ordre) ; « Modifier l'itinéraire » vers (12, 8) fixe ce point de passage et remet le mode à
 * `continue` : il s'y rendra, puis repartira vers B.
 */
export function applyOrder(
  carrierNavigation: CarrierNavigation,
  order: CarrierOrder,
): CarrierNavigation {
  switch (order.kind) {
    case CarrierOrderKind.CONTINUE:
      return { ...carrierNavigation, mode: CarrierOrderKind.CONTINUE, orderUsed: true };
    case CarrierOrderKind.STOP:
      return { ...carrierNavigation, mode: CarrierOrderKind.STOP, orderUsed: true };
    case CarrierOrderKind.REROUTE:
      return { mode: CarrierOrderKind.CONTINUE, waypoint: order.waypoint, orderUsed: true };
  }
}
