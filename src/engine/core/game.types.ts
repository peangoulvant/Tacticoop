import type { PurchasableShipClass, ShipClass } from '../config/game.config';
import type { Contact } from '../detection/contact.types';
import type { GameMap } from '../map/game-map.service';
import type { Hex } from '../map/hex.service';
import type {
  CarrierNavigation,
  CarrierOrder,
  MissionOutcome,
  WaypointRefusal,
} from '../units/carrier-orders.service';
import type {
  Constraint,
  Difficulty,
  LaunchBlocker,
  MissionKind,
  MissionSetup,
} from '../missions/setup.service';
import type { MoveRefusal } from '../units/unit-movement.service';
import type { Unit } from '../units/unit.model';

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
  /** Navigation du porte-avions ; `null` hors mission d'escorte. */
  carrierNavigation: CarrierNavigation | null;
  /** Résultat de la mission une fois terminée ; les commandes sont alors refusées. */
  outcome: MissionOutcome | null;
  /** Contacts suspects du camp ami, issus de la veille passive (SF-04, AB-18). */
  friendContacts: Contact[];
  /** Numéro du prochain contact : les identifiants ne sont jamais réutilisés (AB-21). */
  nextContactNumber: number;
  /** État du générateur de hasard, conservé pour que la reprise poursuive la même suite (AB-24). */
  rngState: number;
}

export type GameState = PreparationState | MissionState;

/** Commandes de préparation et de lancement (SF-01). */
export type PreparationCommand =
  | { type: 'SELECT_MISSION'; mission: MissionKind }
  | { type: 'SET_DIFFICULTY'; difficulty: Difficulty }
  | { type: 'SET_CONSTRAINTS'; constraints: Constraint[] }
  | { type: 'DRAW_RANDOM_CONSTRAINTS'; count: number; seed: number }
  | { type: 'ADD_SHIP'; shipClass: PurchasableShipClass }
  | { type: 'REMOVE_SHIP'; shipClass: PurchasableShipClass }
  | { type: 'LAUNCH_MISSION'; seed: number };

/** Commandes d'une mission en cours : déplacement et activations (SF-02 §6, SF-03). */
export type MissionCommand =
  | { type: 'MOVE_UNIT'; unitId: string; destination: Hex }
  | { type: 'END_ACTIVATION'; unitId: string }
  | { type: 'END_CYCLE_EARLY' }
  | { type: 'ORDER_CARRIER'; order: CarrierOrder }
  | { type: 'CLOSE_CYCLE' };

export type GameCommand = PreparationCommand | MissionCommand;

export type GameEvent =
  | { type: 'MISSION_LAUNCHED'; mission: MissionKind; cycle: number }
  | {
      type: 'UNIT_MOVED';
      unitId: string;
      shipClass: ShipClass;
      from: Hex;
      to: Hex;
      cycle: number;
      /** Déplacement interrompu avant la destination par un obstacle inconnu du joueur (SF-02.15). */
      interrupted?: true;
    }
  | { type: 'CYCLE_STARTED'; cycle: number }
  | { type: 'CARRIER_ORDERED'; order: CarrierOrder; cycle: number }
  | { type: 'CARRIER_MOVED'; from: Hex; to: Hex; cycle: number }
  /** Contact suspect issu de la veille passive : sans cible, classe ni détecteur (AB-21). */
  | { type: 'CONTACT_DETECTED'; contactId: string; cycle: number; zone: Hex[] }
  | { type: 'MISSION_WON'; cycle: number };

export type GameErrorCode =
  | 'WRONG_PHASE'
  | 'INVALID_CONSTRAINTS'
  | 'BUDGET_EXCEEDED'
  | 'NO_SHIP_TO_REMOVE'
  | 'LAUNCH_BLOCKED'
  | 'UNIT_NOT_FOUND'
  | 'UNIT_NOT_ACTIVABLE'
  | 'UNIT_ALREADY_ACTIVATED'
  | 'ACTIVATION_IN_PROGRESS'
  | 'ALREADY_MOVED'
  | 'MOVE_REFUSED'
  | 'NOT_ESCORT_MISSION'
  | 'NAVIGATION_QUOTA_USED'
  | 'WAYPOINT_REFUSED'
  | 'NOT_AT_CYCLE_END'
  | 'MISSION_ENDED';

/** Erreur métier explicite ; une commande rejetée ne modifie jamais l'état. */
export interface GameError {
  code: GameErrorCode;
  message: string;
  /** Renseigné pour LAUNCH_BLOCKED. */
  blockers?: LaunchBlocker[];
  /** Renseigné pour MOVE_REFUSED : le motif connu du refus. */
  moveRefusal?: MoveRefusal;
  /** Renseigné pour WAYPOINT_REFUSED : le motif connu du refus. */
  waypointRefusal?: WaypointRefusal;
}

export type CommandResult =
  { ok: true; state: GameState; events: GameEvent[] } | { ok: false; error: GameError };

/** Résultat d'une transition automatique : le nouvel état et les événements produits. */
export interface Progress {
  state: MissionState;
  events: GameEvent[];
}
