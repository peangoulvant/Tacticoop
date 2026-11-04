import type { GameConfig } from '../config/gameConfig';
import {
  type MoveBlocker,
  BLOCKER_MESSAGES,
  moveBlocker,
  orderBlocker,
} from '../missions/activation';
import { closeCycleIfDone, hasActivationInProgress, startNextCycle } from '../missions/cycle';
import { MOVE_REFUSAL_MESSAGES, planMove } from '../units/movement';
import type { Unit } from '../units/unit';
import { accept, reject } from './results';
import type {
  CommandResult,
  GameCommand,
  GameErrorCode,
  MissionCommand,
  MissionState,
} from './types';

type CommandOf<T extends MissionCommand['type']> = Extract<MissionCommand, { type: T }>;

/** Traitement d'une commande de mission en cours : reçoit la mission, renvoie le résultat. */
type Handler<T extends MissionCommand['type']> = (
  mission: MissionState,
  command: CommandOf<T>,
  config: GameConfig,
) => CommandResult;

const BLOCKER_CODES: Record<MoveBlocker, GameErrorCode> = {
  NOT_ACTIVABLE: 'UNIT_NOT_ACTIVABLE',
  ALREADY_ACTIVATED: 'UNIT_ALREADY_ACTIVATED',
  OTHER_ACTIVATION_IN_PROGRESS: 'ACTIVATION_IN_PROGRESS',
  ALREADY_MOVED: 'ALREADY_MOVED',
};

/** Refus correspondant à un motif d'impossibilité d'ordre. */
function blockerRejection(blocker: MoveBlocker): CommandResult {
  return reject(BLOCKER_CODES[blocker], BLOCKER_MESSAGES[blocker]);
}

/**
 * Retrouve l'unité visée par son identifiant et vérifie qu'elle peut recevoir un ordre
 * maintenant. Renvoie l'unité, ou le refus à transmettre tel quel au joueur.
 */
function findOrderableUnit(
  mission: MissionState,
  unitId: string,
): { unit: Unit } | { rejection: CommandResult } {
  const unit = mission.units.find((u) => u.id === unitId);
  if (!unit) return { rejection: reject('UNIT_NOT_FOUND', 'Unité inconnue.') };
  const blocker = orderBlocker(mission.units, unit);
  return blocker ? { rejection: blockerRejection(blocker) } : { unit };
}

/** Nouvelle mission où seule l'unité `unitId` est modifiée (position, activation…). */
function updateUnitInMission(
  mission: MissionState,
  unitId: string,
  patch: Partial<Unit>,
): MissionState {
  return {
    ...mission,
    units: mission.units.map((u) => (u.id === unitId ? { ...u, ...patch } : u)),
  };
}

/** Un déplacement par activation, exécuté après validation ; l'activation reste engagée (SF-03.3). */
const moveUnit: Handler<'MOVE_UNIT'> = (mission, { unitId, destination }, config) => {
  const found = findOrderableUnit(mission, unitId);
  if ('rejection' in found) return found.rejection;
  const { unit } = found;
  const blocker = moveBlocker(mission.units, unit);
  if (blocker) return blockerRejection(blocker);
  const plan = planMove(mission, unit, destination, config);
  if (!plan.ok) {
    return reject('MOVE_REFUSED', MOVE_REFUSAL_MESSAGES[plan.reason], { moveRefusal: plan.reason });
  }
  const moved = updateUnitInMission(mission, unitId, {
    position: destination,
    activation: 'in_progress',
    hasMoved: true,
  });
  return accept(moved, [
    {
      type: 'UNIT_MOVED',
      unitId,
      shipClass: unit.shipClass,
      from: unit.position,
      to: destination,
      cycle: mission.cycle,
    },
  ]);
};

/**
 * Clôture explicite de l'activation, même sans déplacement (SF-03.1, SF-03.2). Quand toutes les
 * activations sont achevées, le cycle se clôt et le suivant s'ouvre automatiquement (SF-03.4).
 * La réaction ennemie et la progression des projectiles, qui suivent normalement une activation
 * (G-06.6), n'existent pas encore.
 */
const endActivation: Handler<'END_ACTIVATION'> = (mission, { unitId }) => {
  const found = findOrderableUnit(mission, unitId);
  if ('rejection' in found) return found.rejection;
  const ended = updateUnitInMission(mission, unitId, { activation: 'activated' });
  const { state, events } = closeCycleIfDone(ended);
  return accept(state, events);
};

/** Fin anticipée : possible entre deux séquences complètes, jamais pendant une activation (SF-03.5). */
const endCycleEarly: Handler<'END_CYCLE_EARLY'> = (mission) => {
  if (hasActivationInProgress(mission.units)) {
    return blockerRejection('OTHER_ACTIVATION_IN_PROGRESS');
  }
  const { state, events } = startNextCycle(mission);
  return accept(state, events);
};

const handlers: { [T in MissionCommand['type']]: Handler<T> } = {
  MOVE_UNIT: moveUnit,
  END_ACTIVATION: endActivation,
  END_CYCLE_EARLY: endCycleEarly,
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
  // Même lien commande → gestionnaire que pour la préparation, garanti par le type de `handlers`.
  const handler = handlers[command.type] as Handler<MissionCommand['type']>;
  return handler(mission, command, config);
}
