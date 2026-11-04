import type { GameConfig } from '../config/gameConfig';
import { closeCycleIfDone, hasActivationInProgress, startNextCycle } from '../missions/cycle';
import { planMove, type MoveRefusal } from '../units/movement';
import type { Unit } from '../units/unit';
import { accept, reject } from './results';
import type { CommandResult, GameCommand, MissionCommand, MissionState } from './types';

type CommandOf<T extends MissionCommand['type']> = Extract<MissionCommand, { type: T }>;

/** Traitement d'une commande de mission en cours : reçoit la mission, renvoie le résultat. */
type Handler<T extends MissionCommand['type']> = (
  mission: MissionState,
  command: CommandOf<T>,
  config: GameConfig,
) => CommandResult;

const ENGAGED = reject(
  'ACTIVATION_IN_PROGRESS',
  'Une autre unité est en cours d’activation : terminez-la d’abord.',
);

const UNKNOWN_UNIT = reject('UNIT_NOT_FOUND', 'Unité inconnue.');

/** Refus dû à l'état d'activation de l'unité visée (SF-03.1, SF-03.8). */
const STATUS_REJECTIONS: Partial<Record<Unit['activation'], CommandResult>> = {
  not_activable: reject('UNIT_NOT_ACTIVABLE', 'Cette unité ne reçoit pas d’activation.'),
  activated: reject('UNIT_ALREADY_ACTIVATED', 'Cette unité a déjà été activée pendant ce cycle.'),
};

const MOVE_REFUSALS: Record<MoveRefusal, string> = {
  SAME_HEX: 'La destination est la position actuelle de l’unité.',
  NOT_NAVIGABLE: 'Terrain infranchissable pour cette unité.',
  OCCUPIED: 'La destination est occupée par une autre unité.',
  OUT_OF_RANGE: 'Destination hors de portée de mouvement.',
  NO_PATH: 'Aucun chemin navigable ne mène à cette destination.',
};

/**
 * Refus à opposer à un ordre visant cette unité, ou `null` si elle peut le recevoir. Une unité
 * ne peut pas recevoir d'ordre quand elle n'est pas activable par le joueur (porte-avions,
 * unités ennemies), quand elle est déjà activée ce cycle, ou quand une autre unité est en cours
 * d'activation (seule celle-ci reçoit des ordres).
 */
function orderRejection(mission: MissionState, unit: Unit): CommandResult | null {
  const byStatus = STATUS_REJECTIONS[unit.activation];
  if (byStatus) return byStatus;
  const otherEngaged = mission.units.some(
    (u) => u.id !== unit.id && u.activation === 'in_progress',
  );
  return otherEngaged ? ENGAGED : null;
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
  if (!unit) return { rejection: UNKNOWN_UNIT };
  const rejection = orderRejection(mission, unit);
  return rejection ? { rejection } : { unit };
}

/** Nouvelle mission où seule l'unité `unitId` est modifiée (position, activation…). */
const updateUnitInMission = (
  mission: MissionState,
  unitId: string,
  patch: Partial<Unit>,
): MissionState => ({
  ...mission,
  units: mission.units.map((u) => (u.id === unitId ? { ...u, ...patch } : u)),
});

/** Un déplacement par activation, exécuté après validation ; l'activation reste engagée (SF-03.3). */
const moveUnit: Handler<'MOVE_UNIT'> = (mission, { unitId, destination }, config) => {
  const found = findOrderableUnit(mission, unitId);
  if ('rejection' in found) return found.rejection;
  const { unit } = found;
  if (unit.hasMoved)
    return reject('ALREADY_MOVED', 'Cette unité s’est déjà déplacée pendant son activation.');
  const plan = planMove(mission, unit, destination, config);
  if (!plan.ok)
    return reject('MOVE_REFUSED', MOVE_REFUSALS[plan.reason], { moveRefusal: plan.reason });
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
  const { state, events } = closeCycleIfDone(
    updateUnitInMission(mission, unitId, { activation: 'activated' }),
  );
  return accept(state, events);
};

/** Fin anticipée : possible entre deux séquences complètes, jamais pendant une activation (SF-03.5). */
const endCycleEarly: Handler<'END_CYCLE_EARLY'> = (mission) => {
  if (hasActivationInProgress(mission.units)) return ENGAGED;
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
