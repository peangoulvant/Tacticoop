/** API publique du moteur : le reste de l'application n'importe que depuis ce module. */
export { executeCommand } from './core/executeCommand';
export type {
  CommandResult,
  GameCommand,
  GameError,
  GameEvent,
  GameState,
  MissionState,
  PreparationState,
} from './core/types';
export { defaultConfig, PURCHASABLE_CLASSES } from './config/gameConfig';
export type { GameConfig, PurchasableShipClass, ShipClass, ShipSpec } from './config/gameConfig';
export {
  CONSTRAINTS,
  DIFFICULTIES,
  MAX_CONSTRAINTS,
  MISSIONS,
  computeBudget,
  initialSetup,
  launchBlockers,
  shipCount,
} from './missions/setup';
export type {
  Budget,
  Constraint,
  Difficulty,
  LaunchBlocker,
  MissionKind,
  MissionSetup,
} from './missions/setup';
export type { GameMap } from './map/gameMap';
export { terrainAt, indexOf } from './map/gameMap';
export type { Hex } from './map/hex';
export { hexDistance, sameHex } from './map/hex';
export type { Terrain } from './map/terrain';
export type { Unit } from './units/unit';
