/**
 * API publique du moteur : le reste de l'application (interface, store, persistance) n'importe que
 * depuis ce module, sous le nom `engine` (`import * as engine from '../../engine'`). Ce qui n'est
 * pas exporté ici est interne au moteur.
 *
 * Repères : `executeCommand` est le point d'entrée ; `observeFriend` donne à l'interface ce que le
 * joueur a le droit de savoir (jamais l'état réel) ; `defaultConfig` porte toutes les valeurs du
 * jeu.
 */
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
export {
  defaultConfig,
  FIRE_ACTION,
  PURCHASABLE_CLASSES,
  SPECIAL_ACTION_KINDS,
  WEAPON_KINDS,
} from './config/game.config';
export type { WeaponKind } from './config/game.config';
export type {
  FireRefusal,
  Loss,
  ObservedProjectile,
  Projectile,
  ProjectileStatus,
  ShotTarget,
} from './combat/projectile.types';
export { PROJECTILE_STATUSES } from './combat/projectile.types';
export type { ObservedWreck } from './combat/wreck-observation.service';
export { SHOT_WARNINGS, previewShot, shotCandidates } from './combat/shot-preview.service';
export type {
  ShotCandidate,
  ShotPreview,
  ShotPreviewAccepted,
  ShotWarning,
} from './combat/shot-preview.service';
export { DEFEAT_CAUSES, VICTORY_CAUSES } from './missions/outcome.service';
export type { DefeatCause, VictoryCause } from './missions/outcome.service';
export type {
  GameConfig,
  PurchasableShipClass,
  ShipClass,
  ShipSpec,
  SpecialActionKind,
} from './config/game.config';
export { availableFromCycle, cooldownRemaining } from './units/special-action.service';
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
export { AXIAL_DIRECTIONS, hexDistance, sameHex } from './map/hex.service';
export { TERRAINS } from './map/terrain.model';
export type { Terrain } from './map/terrain.model';
export { ACTIVATION_STATUSES, SIDES } from './units/unit.model';
export type { ActivationStatus, Side, Unit } from './units/unit.model';
export { MOVE_REFUSAL_MESSAGES, planMove, reachableHexes } from './units/unit-movement.service';
export {
  BLOCKER_MESSAGES,
  SPECIAL_ACTION_BLOCKER_MESSAGES,
  moveBlocker,
  orderBlocker,
  specialActionBlocker,
} from './missions/activation.service';
export type {
  MoveBlocker,
  OrderBlocker,
  SpecialActionBlocker,
} from './missions/activation.service';
export { hasActivationInProgress, isAwaitingFinalOrder } from './missions/cycle.service';
export { plannedRoute } from './units/carrier-movement.service';
export { observeFriend, observeHostile } from './detection/observation.service';
export { sweepArea, effectiveSweepRange } from './detection/sweep.service';
export {
  CONTACT_ID_PATTERN,
  CONTACT_TARGET_TYPES,
  contactHexes,
  contactNumber,
} from './detection/contact.types';
export type {
  Contact,
  ContactTargetType,
  ObservedContact,
  IdentifiedContact,
  Identification,
  SuspectContact,
} from './detection/contact.types';
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
