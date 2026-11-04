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
import { createRng } from './rng';
import type { CommandResult, GameCommand, GameError, GameErrorCode, GameState } from './types';

type CommandOf<T extends GameCommand['type']> = Extract<GameCommand, { type: T }>;

/** Traitement d'une commande de préparation : reçoit les choix courants, renvoie le résultat. */
type Handler<T extends GameCommand['type']> = (
  setup: MissionSetup,
  command: CommandOf<T>,
  config: GameConfig,
) => CommandResult;

const reject = (
  code: GameErrorCode,
  message: string,
  extra?: Partial<GameError>,
): CommandResult => ({
  ok: false,
  error: { code, message, ...extra },
});

const accept = (setup: MissionSetup): CommandResult => ({
  ok: true,
  state: { status: 'preparation', setup },
  events: [],
});

const invalidConstraints = (max: number): CommandResult =>
  reject('INVALID_CONSTRAINTS', `Choisir entre 0 et ${max} contraintes distinctes.`);

/** Changer de mission conserve la difficulté mais réinitialise contraintes et force (SF-01 §2). */
const selectMission: Handler<'SELECT_MISSION'> = (setup, { mission }) =>
  accept({ mission, difficulty: setup.difficulty, constraints: [], force: emptyForce() });

const setDifficulty: Handler<'SET_DIFFICULTY'> = (setup, { difficulty }) =>
  accept({ ...setup, difficulty });

/** Un budget réduit sous le coût de la force n'efface rien : seul le lancement sera bloqué. */
const setConstraints: Handler<'SET_CONSTRAINTS'> = (setup, { constraints }, config) =>
  areConstraintsValid(constraints, config.constraints.maxCount)
    ? accept({ ...setup, constraints: [...constraints] })
    : invalidConstraints(config.constraints.maxCount);

const drawRandomConstraints: Handler<'DRAW_RANDOM_CONSTRAINTS'> = (
  setup,
  { count, seed },
  config,
) => {
  const max = config.constraints.maxCount;
  const valid = Number.isInteger(count) && count >= 0 && count <= max;
  return valid
    ? accept({ ...setup, constraints: drawConstraints(count, createRng(seed)) })
    : invalidConstraints(max);
};

const withShipCount = (
  setup: MissionSetup,
  shipClass: keyof MissionSetup['force'],
  delta: number,
) => ({
  ...setup,
  force: { ...setup.force, [shipClass]: setup.force[shipClass] + delta },
});

/** On ne peut pas dépasser le budget en ajoutant ; seule une contrainte peut créer un dépassement. */
const addShip: Handler<'ADD_SHIP'> = (setup, { shipClass }, config) => {
  const next = withShipCount(setup, shipClass, 1);
  return computeBudget(next, config).overrun > 0
    ? reject('BUDGET_EXCEEDED', 'Budget insuffisant pour ce bâtiment.')
    : accept(next);
};

const removeShip: Handler<'REMOVE_SHIP'> = (setup, { shipClass }) =>
  setup.force[shipClass] < 1
    ? reject('NO_SHIP_TO_REMOVE', 'Aucun bâtiment de cette catégorie à retirer.')
    : accept(withShipCount(setup, shipClass, -1));

const launch: Handler<'LAUNCH_MISSION'> = (setup, { seed }, config) => {
  const blockers = launchBlockers(setup, config);
  if (blockers.length > 0) {
    return reject('LAUNCH_BLOCKED', 'La composition ne permet pas de lancer la mission.', {
      blockers,
    });
  }
  return {
    ok: true,
    state: { status: 'in_progress', setup, cycle: 1, ...launchMission(setup, config, seed) },
    events: [{ type: 'MISSION_LAUNCHED', mission: setup.mission, cycle: 1 }],
  };
};

const handlers: { [T in GameCommand['type']]: Handler<T> } = {
  SELECT_MISSION: selectMission,
  SET_DIFFICULTY: setDifficulty,
  SET_CONSTRAINTS: setConstraints,
  DRAW_RANDOM_CONSTRAINTS: drawRandomConstraints,
  ADD_SHIP: addShip,
  REMOVE_SHIP: removeShip,
  LAUNCH_MISSION: launch,
};

/**
 * Point d'entrée unique du moteur (AT-04). Fonction pure : l'état reçu n'est jamais muté
 * et une commande rejetée renvoie une erreur sans état.
 */
export function executeCommand(
  state: GameState,
  command: GameCommand,
  config: GameConfig,
): CommandResult {
  if (state.status !== 'preparation') {
    return reject('WRONG_PHASE', 'Les choix de préparation sont verrouillés après le lancement.');
  }
  // TypeScript ne relie pas le type de la commande à son gestionnaire : le lien est garanti
  // par le type de `handlers`, qui impose un gestionnaire pour chaque type de commande.
  const handler = handlers[command.type] as Handler<GameCommand['type']>;
  return handler(state.setup, command, config);
}
