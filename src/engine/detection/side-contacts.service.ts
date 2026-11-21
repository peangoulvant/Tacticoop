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

/**
 * Efface les contacts identifiés d'un camp qui désignent la cible `targetId`, détruite par ce camp
 * (AB-49). Les zones de veille de la même cible ne sont pas touchées (point ouvert, PR suivante).
 */
export function removeIdentifiedContactsOf(
  mission: MissionState,
  side: Side,
  targetId: string,
): MissionState {
  const { contacts, nextNumber } = readContacts(mission, side);
  const kept = contacts.filter((c) => !(c.kind === 'identified' && c.source === targetId));
  return writeContacts(mission, side, { contacts: kept, nextNumber });
}
