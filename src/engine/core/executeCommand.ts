import * as labelEngine from '../../shared/label-engine';
import type { GameConfig } from '../config/gameConfig';
import { executeMissionCommand, isMissionCommand } from './missionCommands';
import { executePreparationCommand, isPreparationCommand } from './preparationCommands';
import { reject } from './results';
import type { CommandResult, GameCommand, GameState } from './types';

/**
 * Point d'entrée unique du moteur (AT-04). Fonction pure : l'état reçu n'est jamais muté
 * et une commande rejetée renvoie une erreur sans état. Une commande n'est acceptée que dans
 * la phase qui la concerne : préparation ou mission en cours.
 */
export function executeCommand(
  state: GameState,
  command: GameCommand,
  config: GameConfig,
): CommandResult {
  if (state.status === 'preparation') {
    return isPreparationCommand(command)
      ? executePreparationCommand(state.setup, command, config)
      : reject('WRONG_PHASE', labelEngine.commandRefusalMessages.MISSION_NOT_LAUNCHED);
  }
  return isMissionCommand(command)
    ? executeMissionCommand(state, command, config)
    : reject('WRONG_PHASE', labelEngine.commandRefusalMessages.PREPARATION_LOCKED);
}
