import type { PurchasableShipClass } from '../config/gameConfig';
import type { GameMap } from '../map/gameMap';
import type { Hex } from '../map/hex';
import type {
  Constraint,
  Difficulty,
  LaunchBlocker,
  MissionKind,
  MissionSetup,
} from '../missions/setup';
import type { Unit } from '../units/unit';

/** État réel complet de la partie (AT-03). Un état en préparation n'a ni carte ni unités. */
export interface PreparationState {
  status: 'preparation';
  setup: MissionSetup;
}

export interface MissionState {
  status: 'in_progress';
  /** Choix de préparation, verrouillés après lancement. */
  setup: MissionSetup;
  map: GameMap;
  /** Point A ; point B uniquement en escorte. */
  start: Hex;
  goal: Hex | null;
  units: Unit[];
  cycle: number;
}

export type GameState = PreparationState | MissionState;

/** Commandes disponibles dans cette itération : préparation et lancement (SF-01). */
export type GameCommand =
  | { type: 'SELECT_MISSION'; mission: MissionKind }
  | { type: 'SET_DIFFICULTY'; difficulty: Difficulty }
  | { type: 'SET_CONSTRAINTS'; constraints: Constraint[] }
  | { type: 'DRAW_RANDOM_CONSTRAINTS'; count: number; seed: number }
  | { type: 'ADD_SHIP'; shipClass: PurchasableShipClass }
  | { type: 'REMOVE_SHIP'; shipClass: PurchasableShipClass }
  | { type: 'LAUNCH_MISSION'; seed: number };

export type GameEvent = { type: 'MISSION_LAUNCHED'; mission: MissionKind; cycle: number };

export type GameErrorCode =
  | 'WRONG_PHASE'
  | 'INVALID_CONSTRAINTS'
  | 'BUDGET_EXCEEDED'
  | 'NO_SHIP_TO_REMOVE'
  | 'LAUNCH_BLOCKED';

/** Erreur métier explicite ; une commande rejetée ne modifie jamais l'état. */
export interface GameError {
  code: GameErrorCode;
  message: string;
  /** Renseigné pour LAUNCH_BLOCKED. */
  blockers?: LaunchBlocker[];
}

export type CommandResult =
  { ok: true; state: GameState; events: GameEvent[] } | { ok: false; error: GameError };
