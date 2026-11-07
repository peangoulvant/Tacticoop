import * as engine from '../engine';
import { useCarrierOrderDraftStore } from './carrier-order-draft.store';
import { useGameStore } from './game.store';
import { useMoveDraftStore } from './move-draft.store';

/**
 * Envoie la commande au moteur ; si elle est acceptée, les brouillons en préparation (déplacement
 * ou ordre de navigation) sont abandonnés. Partagée par les features qui envoient des commandes.
 */
export function dispatchAndCloseDrafts(command: engine.GameCommand): void {
  if (!useGameStore.getState().dispatch(command)) return;
  useMoveDraftStore.getState().cancelDraft();
  useCarrierOrderDraftStore.getState().cancelDraft();
}
