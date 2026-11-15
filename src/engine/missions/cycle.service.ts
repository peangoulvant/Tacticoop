/*
 * Cycle tactique (SF-03, G-06) : un cycle est une suite d'activations des unités alliées, puis la
 * clôture (navigation du porte-avions, veille, résultat) et l'ouverture du cycle suivant.
 *
 *   activations des unités ──► clôture : `closeCycle`
 *                                  1. `resolveCycleEnd`  (porte-avions, veille)
 *                                  2. `determineOutcome` (victoire ?)
 *                                  3. fin de mission, ou `startNextCycle`
 */

import type { GameConfig } from '../config/game.config';
import type { MissionState, Progress } from '../core/game.types';
import { playRemainingHostileActivations } from '../ai/turn.ai.service';
import { resolveWatch } from '../detection/watch-sensor.service';
import type { Unit } from '../units/unit.model';
import { hasCarrierArrived, moveCarrier } from '../units/carrier-movement.service';
import type { MissionOutcome } from '../units/carrier-orders.service';

/**
 * Une unité alliée peut encore recevoir des ordres ce cycle (« disponible » ou « en cours »). Les
 * unités hostiles ne comptent pas : elles jouent à la réaction et à la clôture, jamais à la main
 * du joueur, et ne retardent donc pas la fin du cycle.
 */
function isPending(unit: Unit): boolean {
  return (
    unit.side === 'friend' && (unit.activation === 'available' || unit.activation === 'in_progress')
  );
}

/** Il reste au moins une unité à activer : le cycle ne se clôt pas tout seul. */
export function hasPendingActivation(units: readonly Unit[]): boolean {
  return units.some(isPending);
}

/** Une unité a commencé son activation (un ordre exécuté) sans l'avoir terminée. */
export function hasActivationInProgress(units: readonly Unit[]): boolean {
  return units.some((unit) => unit.side === 'friend' && unit.activation === 'in_progress');
}

/**
 * Termine l'activation de chaque unité « en cours » (fin anticipée du cycle). Les unités encore
 * « disponibles » ne sont pas touchées : elles perdent leur activation à l'ouverture du cycle
 * suivant (G-06.4.3).
 */
export function endActivationsInProgress(units: readonly Unit[]): Unit[] {
  return units.map((unit) =>
    unit.activation === 'in_progress' ? { ...unit, activation: 'activated' } : unit,
  );
}

/** Début d'un cycle : les unités activables redeviennent disponibles, leur déplacement et leur action spéciale sont renouvelés. */
function reopen(unit: Unit): Unit {
  return unit.activation === 'not_activable'
    ? unit
    : { ...unit, activation: 'available', hasMoved: false, specialActionUsed: false };
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
 * Phases de fin de cycle, dans l'ordre de SF-03 §4 : activations des unités ennemies restantes
 * (AB-39), navigation automatique du porte-avions, puis
 * veille avec actualisation et expiration des contacts (G-08, chronologie), puis (à venir)
 * progression des projectiles restants et bilan. Les phases à venir s'ajouteront ici, **avant** la
 * détermination du résultat. Cette étape ne déclare jamais la fin de la mission.
 */
export function resolveCycleEnd(mission: MissionState, config: GameConfig): Progress {
  const played = playRemainingHostileActivations(mission, config);
  const moved = moveCarrier(played, config);
  const sensed = resolveWatch(moved.state, config);
  return { state: sensed.state, events: [...moved.events, ...sensed.events] };
}

/**
 * Résultat de la mission une fois les phases de fin de cycle résolues, ou `null` si elle continue.
 * Les conditions de défaite prévalent sur la victoire (AB-01, G-13) ; aucune n'existe encore faute
 * de dégâts (AB-03). Victoire : le porte-avions est arrivé en B (G-03.2.9). C'est ici, et nulle
 * part ailleurs, que se décide la fin d'une mission.
 */
export function determineOutcome(mission: MissionState): MissionOutcome | null {
  return hasCarrierArrived(mission) ? 'victory' : null;
}

/**
 * Déclare la fin de la mission : le résultat est posé et enregistré au journal, et la mission
 * n'ouvre pas de cycle suivant. Les projectiles encore en vol cesseraient alors de progresser
 * (AB-02) ; il n'y en a pas encore.
 */
function declareOutcome(mission: MissionState, outcome: MissionOutcome): Progress {
  return {
    state: { ...mission, outcome },
    events: [{ type: 'MISSION_WON', cycle: mission.cycle }],
  };
}

/**
 * Clôture du cycle, en trois temps : résolution des phases de fin de cycle (`resolveCycleEnd`),
 * détermination du résultat (`determineOutcome`), puis fin de mission ou ouverture du cycle
 * suivant (SF-03 §4, AB-01). Une mission déjà terminée n'est jamais prolongée (SF-03 §4).
 */
export function closeCycle(mission: MissionState, config: GameConfig): Progress {
  if (mission.outcome) return { state: mission, events: [] };
  const resolved = resolveCycleEnd(mission, config);
  const outcome = determineOutcome(resolved.state);
  const next = outcome ? declareOutcome(resolved.state, outcome) : startNextCycle(resolved.state);
  return { state: next.state, events: [...resolved.events, ...next.events] };
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
