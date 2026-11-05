import * as labelEngine from '../../shared/label-engine';
import type { GameConfig } from '../config/gameConfig';
import { launchMission } from '../missions/launch';
import {
  areConstraintsValid,
  computeBudget,
  drawConstraints,
  emptyForce,
  launchBlockers,
  type MissionSetup,
} from '../missions/setup';
import { accept, reject } from './results';
import { createRng } from './rng';
import type { CommandResult, GameCommand, PreparationCommand } from './types';

type CommandOf<T extends PreparationCommand['type']> = Extract<PreparationCommand, { type: T }>;

/** Traitement d'une commande de préparation : reçoit les choix courants, renvoie le résultat. */
type Handler<T extends PreparationCommand['type']> = (
  setup: MissionSetup,
  command: CommandOf<T>,
  config: GameConfig,
) => CommandResult;

function acceptSetup(setup: MissionSetup): CommandResult {
  return accept({ status: 'preparation', setup });
}

function invalidConstraints(max: number): CommandResult {
  return reject('INVALID_CONSTRAINTS', labelEngine.invalidConstraintsMessage(max));
}

/** Changer de mission conserve la difficulté mais réinitialise contraintes et force (SF-01 §2). */
const selectMission: Handler<'SELECT_MISSION'> = (setup, { mission }) =>
  acceptSetup({ mission, difficulty: setup.difficulty, constraints: [], force: emptyForce() });

const setDifficulty: Handler<'SET_DIFFICULTY'> = (setup, { difficulty }) =>
  acceptSetup({ ...setup, difficulty });

/** Un budget réduit sous le coût de la force n'efface rien : seul le lancement sera bloqué. */
const setConstraints: Handler<'SET_CONSTRAINTS'> = (setup, { constraints }, config) =>
  areConstraintsValid(constraints, config.constraints.maxCount)
    ? acceptSetup({ ...setup, constraints: [...constraints] })
    : invalidConstraints(config.constraints.maxCount);

const drawRandomConstraints: Handler<'DRAW_RANDOM_CONSTRAINTS'> = (
  setup,
  { count, seed },
  config,
) => {
  const max = config.constraints.maxCount;
  const valid = Number.isInteger(count) && count >= 0 && count <= max;
  return valid
    ? acceptSetup({ ...setup, constraints: drawConstraints(count, createRng(seed)) })
    : invalidConstraints(max);
};

function withShipCount(setup: MissionSetup, shipClass: keyof MissionSetup['force'], delta: number) {
  return {
    ...setup,
    force: { ...setup.force, [shipClass]: setup.force[shipClass] + delta },
  };
}

/** On ne peut pas dépasser le budget en ajoutant ; seule une contrainte peut créer un dépassement. */
const addShip: Handler<'ADD_SHIP'> = (setup, { shipClass }, config) => {
  const next = withShipCount(setup, shipClass, 1);
  return computeBudget(next, config).overrun > 0
    ? reject('BUDGET_EXCEEDED', labelEngine.commandRefusalMessages.SHIP_BUDGET_EXCEEDED)
    : acceptSetup(next);
};

const removeShip: Handler<'REMOVE_SHIP'> = (setup, { shipClass }) =>
  setup.force[shipClass] < 1
    ? reject('NO_SHIP_TO_REMOVE', labelEngine.commandRefusalMessages.NO_SHIP_TO_REMOVE)
    : acceptSetup(withShipCount(setup, shipClass, -1));

const launch: Handler<'LAUNCH_MISSION'> = (setup, { seed }, config) => {
  const blockers = launchBlockers(setup, config);
  if (blockers.length > 0) {
    return reject('LAUNCH_BLOCKED', labelEngine.commandRefusalMessages.LAUNCH_BLOCKED, {
      blockers,
    });
  }
  return accept({ status: 'in_progress', setup, cycle: 1, ...launchMission(setup, config, seed) }, [
    { type: 'MISSION_LAUNCHED', mission: setup.mission, cycle: 1 },
  ]);
};

const handlers: { [T in PreparationCommand['type']]: Handler<T> } = {
  SELECT_MISSION: selectMission,
  SET_DIFFICULTY: setDifficulty,
  SET_CONSTRAINTS: setConstraints,
  DRAW_RANDOM_CONSTRAINTS: drawRandomConstraints,
  ADD_SHIP: addShip,
  REMOVE_SHIP: removeShip,
  LAUNCH_MISSION: launch,
};

export function isPreparationCommand(command: GameCommand): command is PreparationCommand {
  return Object.hasOwn(handlers, command.type);
}

/** Exécute une commande de préparation sur les choix courants. */
export function executePreparationCommand(
  setup: MissionSetup,
  command: PreparationCommand,
  config: GameConfig,
): CommandResult {
  // TypeScript ne relie pas le type de la commande à son gestionnaire : le lien est garanti
  // par le type de `handlers`, qui impose un gestionnaire pour chaque type de commande.
  const handler = handlers[command.type] as Handler<PreparationCommand['type']>;
  return handler(setup, command, config);
}
