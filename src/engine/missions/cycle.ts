import type { GameEvent, MissionState } from '../core/types';
import type { Unit } from '../units/unit';

/** Une unité alliée peut encore recevoir des ordres ce cycle. */
const isPending = (unit: Unit): boolean =>
  unit.activation === 'available' || unit.activation === 'in_progress';

export const hasPendingActivation = (units: readonly Unit[]): boolean => units.some(isPending);

export const hasActivationInProgress = (units: readonly Unit[]): boolean =>
  units.some((unit) => unit.activation === 'in_progress');

/** Début d'un cycle : les unités activables redeviennent disponibles, leur déplacement est renouvelé. */
const reopen = (unit: Unit): Unit =>
  unit.activation === 'not_activable'
    ? unit
    : { ...unit, activation: 'available', hasMoved: false };

export interface Progress {
  state: MissionState;
  events: GameEvent[];
}

/**
 * Ouvre le cycle suivant. Les unités qui n'ont pas été activées perdent leur activation :
 * aucune n'est reportée (G-06.4.3).
 */
export function startNextCycle(mission: MissionState): Progress {
  const cycle = mission.cycle + 1;
  return {
    state: { ...mission, cycle, units: mission.units.map(reopen) },
    events: [{ type: 'CYCLE_STARTED', cycle }],
  };
}

/**
 * Clôture automatique du cycle lorsque toutes les activations sont achevées, sans confirmation
 * (SF-03.4). La navigation du porte-avions et les phases de fin de cycle ne sont pas encore
 * implémentées : elles viendront s'insérer ici.
 */
export function closeCycleIfDone(mission: MissionState): Progress {
  return hasPendingActivation(mission.units)
    ? { state: mission, events: [] }
    : startNextCycle(mission);
}
