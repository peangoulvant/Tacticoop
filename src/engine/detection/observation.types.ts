import type { ObservedContact } from './contact.types';
import type { GameMap } from '../map/game-map.service';
import type { Hex } from '../map/hex.service';
import type { Constraint } from '../missions/setup.service';
import type { CarrierNavigation, MissionOutcome } from '../units/carrier-orders.service';
import type { Unit } from '../units/unit.model';

/**
 * Ce que le joueur (camp ami) est autorisé à connaître de la partie, calculé depuis l'état réel
 * (`MissionState`). L'interface, les aperçus de déplacement et leurs messages d'erreur s'appuient
 * sur cette projection, jamais sur l'état réel : aucune information hostile non détectée ne doit
 * en sortir (SF-04 §1, G-08).
 */
export interface FriendObservation {
  map: GameMap;
  start: Hex;
  goal: Hex | null;
  cycle: number;
  outcome: MissionOutcome | null;
  carrierNavigation: CarrierNavigation | null;
  /** Contraintes choisies par le joueur (« Capteurs dégradés » réduit la portée de veille et de balayage). */
  constraints: readonly Constraint[];
  /** Unités connues du joueur : les siennes ; un hostile identifié n'est jamais une unité (AB-30). */
  units: Unit[];
  /**
   * Contacts du camp ami : zones suspectes de la veille et navires identifiés par
   * balayage, jamais une unité (AB-23, AB-30). Sans la cible interne (AB-26).
   */
  contacts: ObservedContact[];
}

/**
 * Ce que l'IA ennemie est autorisée à connaître pour décider (SF-06 §2, AB-35) : ses unités et ses
 * propres contacts, jamais les positions réelles non détectées du camp ami. Symétrique de
 * `FriendObservation`. Pas encore consommée : l'IA ne joue pas encore.
 */
export interface HostileObservation {
  map: GameMap;
  cycle: number;
  outcome: MissionOutcome | null;
  /** Unités connues de l'IA : les siennes ; un navire allié identifié n'est jamais une unité. */
  units: Unit[];
  /** Contacts de l'IA (zones de veille, navires identifiés), sans la cible interne (AB-26). */
  contacts: ObservedContact[];
}
