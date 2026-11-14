import type { MissionState } from '../core/game.types';
import type { Side } from '../units/unit.model';
import type { Contact } from './contact.types';

/*
 * Chaque camp a ses propres contacts (AB-35) : le joueur lit `friendContacts`, l'IA `hostileContacts`.
 * Les deux listes se construisent de la même façon ; ce module ne fait que choisir la bonne, pour
 * que la veille et le balayage s'écrivent une seule fois pour les deux camps.
 */

/** Contacts d'un camp et prochain numéro de contact : `C-1`, `C-2`… sont propres à chaque camp. */
export interface SideContacts {
  contacts: Contact[];
  nextNumber: number;
}

/** Le camp d'en face : celui qu'un détecteur de `side` cherche à détecter. */
export function opposingSide(side: Side): Side {
  return side === 'friend' ? 'hostile' : 'friend';
}

/** Contacts d'un camp, avec son compteur de numéros. */
export function contactsOf(mission: MissionState, side: Side): SideContacts {
  return side === 'friend'
    ? { contacts: mission.friendContacts, nextNumber: mission.nextContactNumber }
    : { contacts: mission.hostileContacts, nextNumber: mission.nextHostileContactNumber };
}

/**
 * Enregistre les contacts d'un camp dans la mission : c'est le pendant de `contactsOf`, qui les lit.
 * Elle écrit la bonne liste (`friendContacts` ou `hostileContacts`) et le bon compteur selon le
 * camp, pour que la veille et le balayage n'aient pas à choisir eux-mêmes. L'autre camp n'est
 * jamais modifié : ce que l'IA apprend ne change rien pour le joueur, et inversement.
 *
 * Exemple : `withContacts(mission, 'hostile', { contacts, nextNumber: 3 })` met à jour
 * `hostileContacts` et `nextHostileContactNumber`, et laisse `friendContacts` tel quel.
 */
export function withContacts(mission: MissionState, side: Side, value: SideContacts): MissionState {
  return side === 'friend'
    ? { ...mission, friendContacts: value.contacts, nextContactNumber: value.nextNumber }
    : {
        ...mission,
        hostileContacts: value.contacts,
        nextHostileContactNumber: value.nextNumber,
      };
}
