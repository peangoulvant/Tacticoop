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
      : reject('WRONG_PHASE', 'Cette commande n’est disponible qu’une fois la mission lancée.');
  }
  return isMissionCommand(command)
    ? executeMissionCommand(state, command, config)
    : reject('WRONG_PHASE', 'Les choix de préparation sont verrouillés après le lancement.');
}
