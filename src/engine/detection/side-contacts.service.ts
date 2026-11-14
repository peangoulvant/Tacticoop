import type { MissionState } from '../core/game.types';
import type { Side } from '../units/unit.model';
import type { Contact } from './contact.types';

/*
 * Chaque camp a ses propres contacts (AB-35) : le joueur lit `friendContacts`, l'IA `hostileContacts`.
 * Les deux listes se construisent de la même façon. Ce fichier ne fait que lire et écrire la bonne
 * liste selon le camp, pour que la veille et le balayage s'écrivent une seule fois pour les deux.
 */

/** Les contacts d'un camp, avec le numéro du prochain contact (`C-1`, `C-2`… propres à chaque camp). */
export interface SideContacts {
  contacts: Contact[];
  nextNumber: number;
}

/** Le camp d'en face : celui qu'un détecteur de `side` cherche à détecter. */
export function opposingSide(side: Side): Side {
  return side === 'friend' ? 'hostile' : 'friend';
}

/** Lit les contacts d'un camp et son compteur : `friendContacts` pour 'friend', `hostileContacts` pour 'hostile'. */
export function readContacts(mission: MissionState, side: Side): SideContacts {
  return side === 'friend'
    ? { contacts: mission.friendContacts, nextNumber: mission.nextContactNumber }
    : { contacts: mission.hostileContacts, nextNumber: mission.nextHostileContactNumber };
}

/**
 * Écrit les contacts d'un camp et son compteur dans la mission ; l'autre camp n'est pas modifié.
 * Exemple : `writeContacts(mission, 'hostile', { contacts, nextNumber: 3 })` met à jour
 * `hostileContacts` et `nextHostileContactNumber`, et laisse `friendContacts` tel quel.
 */
export function writeContacts(
  mission: MissionState,
  side: Side,
  value: SideContacts,
): MissionState {
  return side === 'friend'
    ? { ...mission, friendContacts: value.contacts, nextContactNumber: value.nextNumber }
    : {
        ...mission,
        hostileContacts: value.contacts,
        nextHostileContactNumber: value.nextNumber,
      };
}
