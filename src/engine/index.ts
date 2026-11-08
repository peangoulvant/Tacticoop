/** API publique du moteur : le reste de l'application n'importe que depuis ce module. */
export { executeCommand } from './core/execute-command.service';
export type {
  CommandResult,
  GameCommand,
  MissionCommand,
  PreparationCommand,
  GameError,
  GameEvent,
  GameState,
  MissionState,
  PreparationState,
} from './core/game.types';
export { defaultConfig, PURCHASABLE_CLASSES } from './config/game.config';
export type { GameConfig, PurchasableShipClass, ShipClass, ShipSpec } from './config/game.config';
export {
  CONSTRAINTS,
  DIFFICULTIES,
  MISSIONS,
  computeBudget,
  LAUNCH_BLOCKER_MESSAGES,
  initialSetup,
  launchBlockers,
  shipCount,
} from './missions/setup.service';
export type {
  Budget,
  Constraint,
  Difficulty,
  LaunchBlocker,
  MissionKind,
  MissionSetup,
} from './missions/setup.service';
export type { GameMap } from './map/game-map.service';
export { terrainAt, indexOf } from './map/game-map.service';
export type { Hex } from './map/hex.service';
export { hexDistance, sameHex } from './map/hex.service';
export { TERRAINS } from './map/terrain.model';
export type { Terrain } from './map/terrain.model';
export { ACTIVATION_STATUSES, SIDES } from './units/unit.model';
export type { ActivationStatus, Side, Unit } from './units/unit.model';
export { MOVE_REFUSAL_MESSAGES, planMove, reachableHexes } from './units/unit-movement.service';
export { BLOCKER_MESSAGES, moveBlocker, orderBlocker } from './missions/activation.service';
export type { MoveBlocker, OrderBlocker } from './missions/activation.service';
export { hasActivationInProgress, isAwaitingFinalOrder } from './missions/cycle.service';
export { plannedRoute } from './units/carrier-movement.service';
export { observeFriend, observeHostile } from './detection/observation.service';
export type { FriendObservation, HostileObservation } from './detection/observation.types';
export {
  WAYPOINT_REFUSAL_MESSAGES,
  carrierOf,
  waypointRefusal,
} from './units/carrier-orders.service';
export { CarrierOrderKind } from './units/carrier-orders.service';
export type {
  CarrierMode,
  CarrierNavigation,
  CarrierOrder,
  MissionOutcome,
  WaypointRefusal,
} from './units/carrier-orders.service';
export type { MovePlan, MoveRefusal } from './units/unit-movement.service';
