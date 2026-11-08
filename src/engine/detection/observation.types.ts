import type { Contact } from './contact.types';
import type { GameMap } from '../map/game-map.service';
import type { Hex } from '../map/hex.service';
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
  /** Unités connues du joueur : les siennes, et plus tard les hostiles identifiés (recherche active). */
  units: Unit[];
  /** Contacts suspects de la veille passive : zones approximatives, jamais une unité (AB-23). */
  contacts: Contact[];
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
