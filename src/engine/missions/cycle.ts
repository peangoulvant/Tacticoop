import type { GameConfig } from '../config/gameConfig';
import type { MissionState, Progress } from '../core/types';
import type { Unit } from '../units/unit';
import { hasCarrierArrived, moveCarrier } from './carrier-movement';

/** Une unité alliée peut encore recevoir des ordres ce cycle. */
function isPending(unit: Unit): boolean {
  return unit.activation === 'available' || unit.activation === 'in_progress';
}

export function hasPendingActivation(units: readonly Unit[]): boolean {
  return units.some(isPending);
}

export function hasActivationInProgress(units: readonly Unit[]): boolean {
  return units.some((unit) => unit.activation === 'in_progress');
}

/** Début d'un cycle : les unités activables redeviennent disponibles, leur déplacement est renouvelé. */
function reopen(unit: Unit): Unit {
  return unit.activation === 'not_activable'
    ? unit
    : { ...unit, activation: 'available', hasMoved: false };
}

/**
 * Ouvre le cycle suivant. Les unités qui n'ont pas été activées perdent leur activation :
 * aucune n'est reportée (G-06.4.3). Le quota d'un ordre de navigation est renouvelé (G-06.5.6).
 */
function startNextCycle(mission: MissionState): Progress {
  const cycle = mission.cycle + 1;
  const carrierNavigation = mission.carrierNavigation && {
    ...mission.carrierNavigation,
    orderUsed: false,
  };
  return {
    state: { ...mission, cycle, carrierNavigation, units: mission.units.map(reopen) },
    events: [{ type: 'CYCLE_STARTED', cycle }],
  };
}

/**
 * Dernière occasion de donner l'ordre de navigation (SF-03 §5, C3=B) : toutes les activations
 * sont achevées, mais en escorte le quota n'est pas utilisé. Le cycle attend alors un ordre ou
 * « Clôturer le cycle ».
 */
export function isAwaitingFinalOrder(mission: MissionState): boolean {
  return (
    mission.outcome === null &&
    !hasPendingActivation(mission.units) &&
    mission.carrierNavigation !== null &&
    !mission.carrierNavigation.orderUsed
  );
}

/**
 * Clôture du cycle : navigation automatique du porte-avions, puis arrivée en B ou cycle suivant.
 * Les phases ennemies, la veille passive et le bilan n'existent pas encore (SF-03 §4). Une
 * mission gagnée n'ouvre pas de cycle suivant.
 */
export function closeCycle(mission: MissionState, config: GameConfig): Progress {
  const moved = moveCarrier(mission, config);
  if (hasCarrierArrived(moved.state)) {
    const won: MissionState = { ...moved.state, outcome: 'victory' };
    return { state: won, events: [...moved.events, { type: 'MISSION_WON', cycle: mission.cycle }] };
  }
  const next = startNextCycle(moved.state);
  return { state: next.state, events: [...moved.events, ...next.events] };
}

/**
 * Clôture automatique du cycle lorsque toutes les activations sont achevées, sans confirmation
 * (SF-03.4), sauf si la dernière occasion d'ordre de navigation reste ouverte.
 */
export function closeCycleIfDone(mission: MissionState, config: GameConfig): Progress {
  return hasPendingActivation(mission.units) || isAwaitingFinalOrder(mission)
    ? { state: mission, events: [] }
    : closeCycle(mission, config);
}
