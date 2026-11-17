/*
 * Types centraux du moteur : l'état de la partie, les commandes que le joueur peut envoyer, les
 * événements que le moteur produit et les erreurs qu'il renvoie.
 *
 * Le moteur est une fonction pure : `executeCommand(état, commande, config)` renvoie soit
 * `{ ok: true, state, events }` (nouvel état et événements du journal), soit
 * `{ ok: false, error }` (refus, sans nouvel état). L'état reçu n'est jamais modifié.
 *
 *   commande ──► executeCommand ──► gestionnaire de la commande ──► règles (units/, detection/…)
 *                                          │
 *                                          └─► CommandResult { ok, state, events } ou { ok: false, error }
 *
 * Exemple : { type: 'MOVE_UNIT', unitId: 'friend-fremm-1', destination: { col: 4, row: 2 } }
 * accepté produit un état où la FREMM est en (4, 2) et l'événement UNIT_MOVED.
 */

import type { PurchasableShipClass, ShipClass, WeaponKind } from '../config/game.config';
import type { FireRefusal, Loss, Projectile, ShotTarget } from '../combat/projectile.types';
import type { Contact, Identification } from '../detection/contact.types';
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
import type { DefeatCause, VictoryCause } from '../missions/outcome.service';
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
  /** Cause principale du résultat, affichée avec lui (G-13.2 Q2) ; `null` tant que la mission continue. */
  outcomeCause: VictoryCause | DefeatCause | null;
  /** Contacts du camp ami : zones de la veille et navires identifiés (SF-04, AB-18, AB-25). */
  friendContacts: Contact[];
  /** Numéro du prochain contact du camp ami : les identifiants ne sont jamais réutilisés (AB-21). */
  nextContactNumber: number;
  /**
   * Contacts du camp hostile (l'IA), construits comme ceux du camp ami (AB-35). Jamais exposés au
   * joueur : ni projection, ni événement, ni journal (SF-06 §2).
   */
  hostileContacts: Contact[];
  /** Numéro du prochain contact du camp hostile (numérotation propre à chaque camp). */
  nextHostileContactNumber: number;
  /** Projectiles en vol des deux camps, jamais exposés tels quels (AB-47, AB-49). */
  projectiles: Projectile[];
  /** Numéro du prochain lancement : l'ordre fixe des projectiles (AB-48). */
  nextLaunchNumber: number;
  /** Navires détruits des deux camps, dans l'ordre des destructions (G-13.3). */
  losses: Loss[];
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

/** Commandes d'une mission en cours : déplacement, activations et action spéciale (SF-02 §6, SF-03). */
export type MissionCommand =
  | { type: 'MOVE_UNIT'; unitId: string; destination: Hex }
  | { type: 'END_ACTIVATION'; unitId: string }
  | { type: 'END_CYCLE_EARLY' }
  | { type: 'ORDER_CARRIER'; order: CarrierOrder }
  | { type: 'SWEEP'; unitId: string }
  | { type: 'FIRE'; unitId: string; weapon: WeaponKind; target: ShotTarget }
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
  /** Contact suspect issu de la veille : sans cible, classe ni détecteur (AB-21). */
  | { type: 'CONTACT_DETECTED'; contactId: string; cycle: number; zone: Hex[] }
  /**
   * Balayage du camp ami, toujours journalisée (AB-28) : l'unité émettrice et les navires
   * identifiés. Ni cible réelle, ni zone retirée, ni tirage.
   */
  | {
      type: 'SWEEP_PERFORMED';
      cycle: number;
      unitId: string;
      shipClass: ShipClass;
      identified: Identification[];
    }
  /** Tir du camp ami : arme et cible désignée (contact, et hexagone pour une zone suspecte, AB-46). */
  | {
      type: 'SHOT_FIRED';
      cycle: number;
      unitId: string;
      shipClass: ShipClass;
      weapon: WeaponKind;
      contactId: string;
      hex?: Hex;
    }
  /** Projectile adverse identifié d'office près d'une unité alliée : arme et position (AB-49). */
  | {
      type: 'PROJECTILE_DETECTED';
      cycle: number;
      projectileId: string;
      weapon: WeaponKind;
      position: Hex;
    }
  /**
   * Impact d'un projectile. Côté ami : l'unité touchée et l'arme, jamais le tireur. Un navire
   * hostile touché n'est identifié ni par type ni par classe ; un impact raté sur lui n'est pas
   * annoncé (AB-49).
   */
  | {
      type: 'PROJECTILE_IMPACT';
      cycle: number;
      projectileId: string;
      weapon: WeaponKind;
      result: 'hit' | 'missed' | 'destroyed';
      victim: { side: 'friend'; unitId: string; shipClass: ShipClass } | { side: 'hostile' };
    }
  /** Projectile neutralisé sans impact (fin de portée, obstacle, case visée atteinte), annoncé s'il est connu. */
  | { type: 'PROJECTILE_NEUTRALISED'; cycle: number; projectileId: string; weapon: WeaponKind }
  | { type: 'MISSION_WON'; cycle: number; cause: VictoryCause }
  | { type: 'MISSION_LOST'; cycle: number; cause: DefeatCause };

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
  | 'SPECIAL_ACTION_USED'
  | 'ON_COOLDOWN'
  | 'NO_SENSORS'
  | 'NO_AMMO'
  | 'FIRE_REFUSED'
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
  /** Renseigné pour FIRE_REFUSED : le motif connu du refus. */
  fireRefusal?: FireRefusal;
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
