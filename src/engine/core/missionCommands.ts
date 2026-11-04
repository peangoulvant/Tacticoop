import type { GameConfig } from '../config/gameConfig';
import { closeCycleIfDone, hasActivationInProgress, startNextCycle } from '../missions/cycle';
import { planMove, type MoveRefusal } from '../units/movement';
import type { Unit } from '../units/unit';
import { accept, reject } from './results';
import type { CommandResult, GameCommand, GameError, MissionCommand, MissionState } from './types';

type CommandOf<T extends MissionCommand['type']> = Extract<MissionCommand, { type: T }>;

/** Traitement d'une commande de mission en cours : reçoit la mission, renvoie le résultat. */
type Handler<T extends MissionCommand['type']> = (
  mission: MissionState,
  command: CommandOf<T>,
  config: GameConfig,
) => CommandResult;

const ENGAGED: GameError = {
  code: 'ACTIVATION_IN_PROGRESS',
  message: 'Une autre unité est en cours d’activation : terminez-la d’abord.',
};

/** Motifs d'impossibilité tirés de l'état d'activation de l'unité (SF-03.1, SF-03.8). */
const STATUS_ERRORS: Partial<Record<Unit['activation'], GameError>> = {
  not_activable: { code: 'UNIT_NOT_ACTIVABLE', message: 'Cette unité ne reçoit pas d’activation.' },
  activated: {
    code: 'UNIT_ALREADY_ACTIVATED',
    message: 'Cette unité a déjà été activée pendant ce cycle.',
  },
};

const MOVE_REFUSALS: Record<MoveRefusal, string> = {
  SAME_HEX: 'La destination est la position actuelle de l’unité.',
  NOT_NAVIGABLE: 'Terrain infranchissable pour cette unité.',
  OCCUPIED: 'La destination est occupée par une autre unité.',
  OUT_OF_RANGE: 'Destination hors de portée de mouvement.',
  NO_PATH: 'Aucun chemin navigable ne mène à cette destination.',
};

function orderError(mission: MissionState, unit: Unit): GameError | null {
  const byStatus = STATUS_ERRORS[unit.activation];
  if (byStatus) return byStatus;
  const otherEngaged = mission.units.some(
    (u) => u.id !== unit.id && u.activation === 'in_progress',
  );
  return otherEngaged ? ENGAGED : null;
}

/** L'unité visée par un ordre, si elle peut en recevoir un : seule l'unité en cours reçoit des ordres. */
function findOrderableUnit(
  mission: MissionState,
  unitId: string,
): { unit: Unit } | { error: GameError } {
  const unit = mission.units.find((u) => u.id === unitId);
  if (!unit) return { error: { code: 'UNIT_NOT_FOUND', message: 'Unité inconnue.' } };
  const error = orderError(mission, unit);
  return error ? { error } : { unit };
}

const withUnit = (mission: MissionState, unitId: string, patch: Partial<Unit>): MissionState => ({
  ...mission,
  units: mission.units.map((u) => (u.id === unitId ? { ...u, ...patch } : u)),
});

const fail = ({ code, message, ...extra }: GameError): CommandResult =>
  reject(code, message, extra);

/** Un déplacement par activation, exécuté après validation ; l'activation reste engagée (SF-03.3). */
const moveUnit: Handler<'MOVE_UNIT'> = (mission, { unitId, destination }, config) => {
  const found = findOrderableUnit(mission, unitId);
  if ('error' in found) return fail(found.error);
  const { unit } = found;
  if (unit.hasMoved)
    return reject('ALREADY_MOVED', 'Cette unité s’est déjà déplacée pendant son activation.');
  const plan = planMove(mission, unit, destination, config);
  if (!plan.ok)
    return reject('MOVE_REFUSED', MOVE_REFUSALS[plan.reason], { moveRefusal: plan.reason });
  const moved = withUnit(mission, unitId, {
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
  if ('error' in found) return fail(found.error);
  const { state, events } = closeCycleIfDone(
    withUnit(mission, unitId, { activation: 'activated' }),
  );
  return accept(state, events);
};

/** Fin anticipée : possible entre deux séquences complètes, jamais pendant une activation (SF-03.5). */
const endCycleEarly: Handler<'END_CYCLE_EARLY'> = (mission) => {
  if (hasActivationInProgress(mission.units)) return fail(ENGAGED);
  const { state, events } = startNextCycle(mission);
  return accept(state, events);
};

const handlers: { [T in MissionCommand['type']]: Handler<T> } = {
  MOVE_UNIT: moveUnit,
  END_ACTIVATION: endActivation,
  END_CYCLE_EARLY: endCycleEarly,
};

export const isMissionCommand = (command: GameCommand): command is MissionCommand =>
  Object.hasOwn(handlers, command.type);

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
