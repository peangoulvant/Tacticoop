import type { FriendContact } from './contact.types';
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
  contacts: FriendContact[];
}

/**
 * Ce que l'IA ennemie est autorisée à connaître pour décider (SF-06 §2) : jamais les positions
 * réelles non détectées du camp ami. Pas encore consommée : l'IA n'existe pas.
 */
export interface HostileObservation {
  map: GameMap;
  cycle: number;
  outcome: MissionOutcome | null;
  /** Unités connues de l'IA : les siennes, et plus tard les alliés détectés. */
  units: Unit[];
}
