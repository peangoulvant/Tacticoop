import * as engine from '../engine';
import { cancelAllDrafts } from './cancel-drafts.service';
import { useGameStore } from './game.store';

/**
 * Envoie la commande au moteur ; s'il est accepté, les brouillons en préparation (déplacement,
 * ordre de navigation ou balayage) sont abandonnés. Partagée par les features qui envoient des
 * commandes.
 */
export function dispatchAndCloseDrafts(command: engine.GameCommand): void {
  if (!useGameStore.getState().dispatch(command)) return;
  cancelAllDrafts();
}
