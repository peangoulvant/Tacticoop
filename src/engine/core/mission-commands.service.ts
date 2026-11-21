import * as labelEngine from '../../shared/engine.label';
import type { GameConfig } from '../config/game.config';
import type { Hex } from '../map/hex.service';
import {
  CarrierOrderKind,
  WAYPOINT_REFUSAL_MESSAGES,
  applyOrder,
  carrierOf,
  waypointRefusal,
  type CarrierNavigation,
  type CarrierOrder,
} from '../units/carrier-orders.service';
import {
  closeCycle,
  closeCycleIfDone,
  endActivationsInProgress,
  resolveSequenceEnd,
  hasActivationInProgress,
  isAwaitingFinalOrder,
} from '../missions/cycle.service';
import { reactToFriendActivation } from '../ai/turn.ai.service';
import { accept, reject } from './results.service';
import { blockerRejection, finishActivation, fire, moveUnit, sweep } from './unit-commands.service';
import type { CommandResult, GameCommand, MissionCommand, MissionState } from './game.types';

/*****************************
 *
 * PARTIE COMMUNE : types partagés
 *
 *****************************/

type CommandOf<T extends MissionCommand['type']> = Extract<MissionCommand, { type: T }>;

/** Traitement d'une commande de mission en cours : reçoit la mission, renvoie le résultat. */
type Handler<T extends MissionCommand['type']> = (
  mission: MissionState,
  command: CommandOf<T>,
  config: GameConfig,
) => CommandResult;

/*****************************
 *
 * PARTIE UNITÉS : fin d'activation
 *
 *****************************/

/**
 * Clôture explicite de l'activation, même sans déplacement (SF-03.1, SF-03.2). Une unité ennemie
 * réagit aussitôt, résolue entièrement avant la prochaine décision du joueur (AB-39) ; puis,
 * quand toutes les activations sont achevées, le cycle se clôt et le suivant s'ouvre
 * automatiquement (SF-03.4). Entre les deux, les projectiles progressent et la fin de mission est
 * vérifiée (G-06.6, AB-48).
 */
const endActivation: Handler<'END_ACTIVATION'> = (mission, command, config) => {
  const finished = finishActivation(mission, command, config);
  if (!finished.ok) return finished;
  // `finishActivation` renvoie toujours une mission en cours.
  const reacted = reactToFriendActivation(finished.state as MissionState, config);
  const sequence = resolveSequenceEnd(reacted, config);
  if (sequence.state.outcome) return accept(sequence.state, sequence.events);
  const closed = closeCycleIfDone(sequence.state, config);
  return accept(closed.state, [...sequence.events, ...closed.events]);
};

/*****************************
 *
 * PARTIE CLÔTURE DU CYCLE : fin anticipée
 *
 *****************************/

/**
 * Fin anticipée du cycle (SF-03.5, AB-31) : l'activation en cours, s'il y en a une, est d'abord
 * terminée comme par « Terminer l'activation », puis le cycle se clôt ; les unités non activées
 * perdent leur activation. Le joueur n'a donc plus à terminer l'activation avant le cycle.
 */
const endCycleEarly: Handler<'END_CYCLE_EARLY'> = (mission, _command, config) => {
  const hadActivation = hasActivationInProgress(mission.units);
  const settled = { ...mission, units: endActivationsInProgress(mission.units) };
  // L'activation terminée d'office compte comme une séquence : les projectiles progressent, même
  // sans réaction ennemie (AB-48). Sans activation en cours, rien ne progresse.
  const sequence = hadActivation
    ? resolveSequenceEnd(settled, config)
    : { state: settled, events: [] };
  if (sequence.state.outcome) return accept(sequence.state, sequence.events);
  const closed = closeCycle(sequence.state, config);
  return accept(closed.state, [...sequence.events, ...closed.events]);
};

/*****************************
 *
 * PARTIE PORTE-AVIONS : ordres de navigation
 *
 *****************************/

/** Refus d'un point de passage invalide : motif connu, sans consommer le quota (SF-02 §5). */
function waypointRejection(
  mission: MissionState,
  waypoint: Hex,
  config: GameConfig,
): CommandResult | null {
  const carrier = carrierOf(mission.units);
  const reason = carrier && waypointRefusal(mission.map, carrier, waypoint, config);
  return reason
    ? reject('WAYPOINT_REFUSED', WAYPOINT_REFUSAL_MESSAGES[reason], { waypointRefusal: reason })
    : null;
}

/**
 * Motif de refus d'un ordre de navigation, ou `null` s'il est acceptable : aucun ordre ne peut
 * interrompre une activation (G-06.5.3), un seul ordre par cycle (G-03.2.4), point de passage
 * valide.
 */
function carrierOrderRejection(
  mission: MissionState,
  carrierNavigation: CarrierNavigation,
  order: CarrierOrder,
  config: GameConfig,
): CommandResult | null {
  if (hasActivationInProgress(mission.units)) {
    return blockerRejection('OTHER_ACTIVATION_IN_PROGRESS');
  }
  if (carrierNavigation.orderUsed) {
    return reject(
      'NAVIGATION_QUOTA_USED',
      labelEngine.commandRefusalMessages.NAVIGATION_QUOTA_USED,
    );
  }
  return order.kind === CarrierOrderKind.REROUTE
    ? waypointRejection(mission, order.waypoint, config)
    : null;
}

/**
 * Ordre de navigation du porte-avions : consomme le quota du cycle. Donné en dernière occasion
 * (toutes les activations achevées), il déclenche aussitôt la clôture du cycle.
 */
const orderCarrier: Handler<'ORDER_CARRIER'> = (mission, { order }, config) => {
  const { carrierNavigation } = mission;
  if (!carrierNavigation) {
    return reject('NOT_ESCORT_MISSION', labelEngine.commandRefusalMessages.NOT_ESCORT_MISSION);
  }
  const rejection = carrierOrderRejection(mission, carrierNavigation, order, config);
  if (rejection) return rejection;
  const ordered = { ...mission, carrierNavigation: applyOrder(carrierNavigation, order) };
  const closed = closeCycleIfDone(ordered, config);
  return accept(closed.state, [
    { type: 'CARRIER_ORDERED', order, cycle: mission.cycle },
    ...closed.events,
  ]);
};

/** « Clôturer le cycle » : décline la dernière occasion d'ordre ; le porte-avions suit son ordre. */
const closeCycleWithoutOrder: Handler<'CLOSE_CYCLE'> = (mission, _command, config) => {
  if (!isAwaitingFinalOrder(mission)) {
    return reject('NOT_AT_CYCLE_END', labelEngine.commandRefusalMessages.NOT_AT_CYCLE_END);
  }
  const { state, events } = closeCycle(mission, config);
  return accept(state, events);
};

/*****************************
 *
 * PARTIE AIGUILLAGE : une commande, un gestionnaire
 *
 *****************************/

const handlers: { [T in MissionCommand['type']]: Handler<T> } = {
  MOVE_UNIT: moveUnit,
  END_ACTIVATION: endActivation,
  SWEEP: sweep,
  FIRE: fire,
  END_CYCLE_EARLY: endCycleEarly,
  ORDER_CARRIER: orderCarrier,
  CLOSE_CYCLE: closeCycleWithoutOrder,
};

export function isMissionCommand(command: GameCommand): command is MissionCommand {
  return Object.hasOwn(handlers, command.type);
}

/** Exécute une commande sur une mission en cours. */
export function executeMissionCommand(
  mission: MissionState,
  command: MissionCommand,
  config: GameConfig,
): CommandResult {
  if (mission.outcome) {
    return reject('MISSION_ENDED', labelEngine.commandRefusalMessages.MISSION_ENDED);
  }
  // Même lien commande → gestionnaire que pour la préparation, garanti par le type de `handlers`.
  const handler = handlers[command.type] as Handler<MissionCommand['type']>;
  return handler(mission, command, config);
}
