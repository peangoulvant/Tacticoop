import type { MissionState } from '../core/game.types';
import type { Unit } from '../units/unit.model';
import type { FriendObservation, HostileObservation } from './observation.types';

/**
 * Une unité est connue du camp ami si elle est amie. Une unité hostile ne l'est qu'une fois
 * détectée (SF-04) : aucun contact n'existe encore, donc aucune n'est connue. C'est le seul point
 * à étendre quand les contacts seront implémentés.
 */
function isKnownToFriend(unit: Unit): boolean {
  return unit.side === 'friend';
}

/** Une unité est connue de l'IA si elle est hostile ; les alliés ne le seront qu'une fois détectés. */
function isKnownToHostile(unit: Unit): boolean {
  return unit.side === 'hostile';
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
    units: mission.units.filter(isKnownToFriend),
  };
}

/** Projection autorisée du camp hostile (IA) sur l'état réel : carte et unités connues seulement. */
export function observeHostile(mission: MissionState): HostileObservation {
  return {
    map: mission.map,
    cycle: mission.cycle,
    outcome: mission.outcome,
    units: mission.units.filter(isKnownToHostile),
  };
}
