import * as engine from '../../engine';
import {
  isCount,
  isHexOn,
  isOneOf,
  isPositive,
  isRecord,
  type Json,
  type Problem,
} from './guards.validator';

/*
 * Validation des contacts du camp ami (zones de veille et navires identifiés) et de l'état du
 * générateur de hasard : tout ce que la détection ajoute à l'état de la mission.
 */

/** Zone d'un contact suspect : de 1 à `zoneSize` hexagones, tous dans la carte. */
function checkZone(contact: Json, map: engine.GameMap): Problem {
  const zone = contact.zone;
  const valid =
    Array.isArray(zone) &&
    zone.length >= 1 &&
    zone.length <= engine.defaultConfig.detection.zoneSize &&
    zone.every((hex) => isHexOn(map, hex));
  return valid ? null : `zone invalide pour le contact ${String(contact.id)}`;
}

/** Type et position exacte d'un contact identifié. */
function checkIdentified(contact: Json, map: engine.GameMap): Problem {
  return isOneOf(engine.CONTACT_TARGET_TYPES, contact.targetType) && isHexOn(map, contact.position)
    ? null
    : `identification invalide pour le contact ${String(contact.id)}`;
}

/** Champs communs aux deux formes : identifiant de forme `C-n` et cycle de détection plausible. */
function checkContactIdentity(contact: Json, cycle: number): Problem {
  if (typeof contact.id !== 'string' || !engine.CONTACT_ID_PATTERN.test(contact.id)) {
    return 'identifiant de contact invalide';
  }
  // Un contact ne peut pas dater d'un cycle futur.
  return isPositive(contact.cycle) && contact.cycle <= cycle
    ? null
    : `cycle invalide pour le contact ${contact.id}`;
}

/** Un contact : forme connue, identifiant, cycle plausible, puis zone ou identification. */
function checkContact(contact: unknown, map: engine.GameMap, cycle: number): Problem {
  if (!isRecord(contact)) return 'contact illisible';
  const identityProblem = checkContactIdentity(contact, cycle);
  if (identityProblem) return identityProblem;
  if (contact.kind === 'suspect') return checkZone(contact, map);
  return contact.kind === 'identified'
    ? checkIdentified(contact, map)
    : `forme inconnue pour le contact ${contact.id}`;
}

/** La cible interne d'un contact est un navire hostile de la mission (AB-26). */
function checkContactSources(contacts: readonly Json[], units: readonly engine.Unit[]): Problem {
  const hostiles = new Set(units.filter((u) => u.side === 'hostile').map((u) => u.id));
  if (!contacts.every((c) => typeof c.source === 'string' && hostiles.has(c.source))) {
    return 'cible de contact inconnue';
  }
  // Un seul contact identifié par navire (AB-26).
  const identified = contacts.filter((c) => c.kind === 'identified').map((c) => c.source);
  return new Set(identified).size === identified.length
    ? null
    : 'plusieurs contacts identifiés pour un même navire';
}

/** Compteur de numéros de contact et état du générateur (entier 32 bits, AB-24). */
function checkCounters(state: Json): Problem {
  if (!isPositive(state.nextContactNumber)) return 'compteur de contacts invalide';
  return isCount(state.rngState) && state.rngState <= 0xffffffff ? null : 'état du hasard invalide';
}

/** Contacts du camp ami, compteur de numéros et état du générateur (AB-24). */
export function checkDetection(state: Json, map: engine.GameMap): Problem {
  const counterProblem = checkCounters(state);
  if (counterProblem) return counterProblem;
  const contacts = state.friendContacts;
  if (!Array.isArray(contacts)) return 'contacts illisibles';
  const cycle = state.cycle as number;
  const first = contacts.map((c) => checkContact(c, map, cycle)).find((p) => p !== null);
  if (first) return first;
  const ids = new Set(contacts.map((c: Json) => c.id));
  if (ids.size !== contacts.length) return 'identifiants de contact en double';
  return checkContactSources(contacts as Json[], state.units as engine.Unit[]);
}
