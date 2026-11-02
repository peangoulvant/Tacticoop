import type { GameConfig } from '../config/gameConfig';
import { launchMission } from '../missions/launch';
import {
  areConstraintsValid,
  computeBudget,
  drawConstraints,
  emptyForce,
  launchBlockers,
  MAX_CONSTRAINTS,
  type MissionSetup,
} from '../missions/setup';
import { createRng } from './rng';
import type { CommandResult, GameCommand, GameError, GameErrorCode, GameState } from './types';

const reject = (
  code: GameErrorCode,
  message: string,
  extra?: Partial<GameError>,
): CommandResult => ({
  ok: false,
  error: { code, message, ...extra },
});

const withSetup = (setup: MissionSetup): CommandResult => ({
  ok: true,
  state: { status: 'preparation', setup },
  events: [],
});

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
  const { setup } = state;

  switch (command.type) {
    case 'SELECT_MISSION':
      // Changer de mission conserve la difficulté mais réinitialise contraintes et force (SF-01 §2).
      return withSetup({
        mission: command.mission,
        difficulty: setup.difficulty,
        constraints: [],
        force: emptyForce(),
      });

    case 'SET_DIFFICULTY':
      return withSetup({ ...setup, difficulty: command.difficulty });

    case 'SET_CONSTRAINTS':
      // Un budget réduit sous le coût de la force n'efface rien : le lancement sera bloqué.
      if (!areConstraintsValid(command.constraints)) {
        return reject(
          'INVALID_CONSTRAINTS',
          `Choisir entre 0 et ${MAX_CONSTRAINTS} contraintes distinctes.`,
        );
      }
      return withSetup({ ...setup, constraints: [...command.constraints] });

    case 'DRAW_RANDOM_CONSTRAINTS':
      if (
        !Number.isInteger(command.count) ||
        command.count < 0 ||
        command.count > MAX_CONSTRAINTS
      ) {
        return reject(
          'INVALID_CONSTRAINTS',
          `Choisir entre 0 et ${MAX_CONSTRAINTS} contraintes distinctes.`,
        );
      }
      return withSetup({
        ...setup,
        constraints: drawConstraints(command.count, createRng(command.seed)),
      });

    case 'ADD_SHIP': {
      const next = {
        ...setup,
        force: { ...setup.force, [command.shipClass]: setup.force[command.shipClass] + 1 },
      };
      // On ne peut pas dépasser le budget en ajoutant ; seule une contrainte peut créer un dépassement.
      if (computeBudget(next, config).overrun > 0) {
        return reject('BUDGET_EXCEEDED', 'Budget insuffisant pour ce bâtiment.');
      }
      return withSetup(next);
    }

    case 'REMOVE_SHIP':
      if (setup.force[command.shipClass] < 1) {
        return reject('NO_SHIP_TO_REMOVE', 'Aucun bâtiment de cette catégorie à retirer.');
      }
      return withSetup({
        ...setup,
        force: { ...setup.force, [command.shipClass]: setup.force[command.shipClass] - 1 },
      });

    case 'LAUNCH_MISSION': {
      const blockers = launchBlockers(setup, config);
      if (blockers.length > 0) {
        return reject('LAUNCH_BLOCKED', 'La composition ne permet pas de lancer la mission.', {
          blockers,
        });
      }
      const launched = launchMission(setup, config, command.seed);
      return {
        ok: true,
        state: { status: 'in_progress', setup, cycle: 1, ...launched },
        events: [{ type: 'MISSION_LAUNCHED', mission: setup.mission, cycle: 1 }],
      };
    }
  }
}
