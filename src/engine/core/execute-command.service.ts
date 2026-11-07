import * as labelEngine from '../../shared/engine.label';
import type { GameConfig } from '../config/game.config';
import { executeMissionCommand, isMissionCommand } from './mission-commands.service';
import { executePreparationCommand, isPreparationCommand } from './preparation-commands.service';
import { reject } from './results.service';
import type { CommandResult, GameCommand, GameState } from './game.types';

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
