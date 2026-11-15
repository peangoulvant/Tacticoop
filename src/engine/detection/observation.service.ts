import type { MissionState } from '../core/game.types';
import type { Unit } from '../units/unit.model';
import type { Contact, ObservedContact } from './contact.types';
import type { FriendObservation, HostileObservation } from './observation.types';

/**
 * Une unité est connue du camp ami si elle est amie. Un navire hostile identifié n'est jamais
 * une unité connue (AB-30) : il n'existe pour le joueur que sous forme de contact, sans état
 * réel (PV, stocks, classe).
 */
function isKnownToFriend(unit: Unit): boolean {
  return unit.side === 'friend';
}

/** Une unité est connue de l'IA si elle est hostile ; les alliés ne le seront qu'une fois détectés. */
function isKnownToHostile(unit: Unit): boolean {
  return unit.side === 'hostile';
}

/**
 * Contact tel que son camp le voit (joueur ou IA) : la cible interne (`source`) est retirée, et un contact
 * identifié détecté avant le cycle courant est marqué « ancien » (AB-26, AB-27).
 */
function toObservedContact(contact: Contact, cycle: number): ObservedContact {
  const { id, cycle: detectedAt } = contact;
  if (contact.kind === 'suspect')
    return { kind: 'suspect', id, cycle: detectedAt, zone: contact.zone };
  const { targetType, position } = contact;
  return {
    kind: 'identified',
    id,
    cycle: detectedAt,
    targetType,
    position,
    stale: detectedAt < cycle,
  };
}

/** Projection autorisée du camp ami sur l'état réel : carte, objectifs, et unités connues seulement. */
export function observeFriend(mission: MissionState): FriendObservation {
  return {
    map: mission.map,
    start: mission.start,
    goal: mission.goal,
    cycle: mission.cycle,
    outcome: mission.outcome,
    carrierNavigation: mission.carrierNavigation,
    constraints: mission.setup.constraints,
    units: mission.units.filter(isKnownToFriend),
    contacts: mission.friendContacts.map((contact) => toObservedContact(contact, mission.cycle)),
  };
}

/**
 * Projection autorisée du camp hostile (IA) sur l'état réel : carte, ses unités et ses propres
 * contacts, comme `observeFriend` pour le joueur (AB-35). Les unités alliées n'y figurent jamais.
 */
export function observeHostile(mission: MissionState): HostileObservation {
  return {
    map: mission.map,
    missionKind: mission.setup.mission,
    // En lutte navale, B n'existe pas ; en escorte, l'IA le connaît comme le joueur (AB-37).
    goal: mission.goal,
    cycle: mission.cycle,
    outcome: mission.outcome,
    units: mission.units.filter(isKnownToHostile),
    contacts: mission.hostileContacts.map((contact) => toObservedContact(contact, mission.cycle)),
  };
}
