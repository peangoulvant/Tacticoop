import * as engine from '../../../engine';
import { useCarrierOrderDraftStore } from '../../../store/useCarrierOrderDraftStore';
import { useGameStore } from '../../../store/useGameStore';
import { useMoveDraftStore } from '../../../store/useMoveDraftStore';
import { useSelectionStore } from '../../../store/useSelectionStore';

/** Envoie la commande au moteur ; si elle est acceptée, les brouillons en préparation sont abandonnés. */
function dispatchAndCloseDrafts(command: engine.GameCommand): void {
  if (!useGameStore.getState().dispatch(command)) return;
  useMoveDraftStore.getState().cancelDraft();
  useCarrierOrderDraftStore.getState().cancelDraft();
}

export function confirmMove(unitId: string, destination: engine.Hex): void {
  dispatchAndCloseDrafts({ type: 'MOVE_UNIT', unitId, destination });
}

export function endActivation(unitId: string): void {
  dispatchAndCloseDrafts({ type: 'END_ACTIVATION', unitId });
}

export function endCycleEarly(): void {
  dispatchAndCloseDrafts({ type: 'END_CYCLE_EARLY' });
}

export function confirmCarrierOrder(order: engine.CarrierOrder): void {
  dispatchAndCloseDrafts({ type: 'ORDER_CARRIER', order });
}

/** « Clôturer le cycle » : décline la dernière occasion d'ordre de navigation (SF-03 §5). */
export function closeCycle(): void {
  dispatchAndCloseDrafts({ type: 'CLOSE_CYCLE' });
}

/** Prépare un déplacement ; un seul brouillon à la fois, celui d'un ordre de navigation est abandonné. */
export function startMoveDraft(unitId: string): void {
  useCarrierOrderDraftStore.getState().cancelDraft();
  useMoveDraftStore.getState().startDraft(unitId);
}

/** Prépare un ordre de navigation ; le brouillon de déplacement éventuel est abandonné. */
export function startCarrierOrderDraft(kind: engine.CarrierOrderKind): void {
  useMoveDraftStore.getState().cancelDraft();
  useCarrierOrderDraftStore.getState().startDraft(kind);
}

/** Abandonne la mission : retour à la préparation, sans sélection ni déplacement résiduel. */
export function abandonMission(): void {
  useGameStore.getState().reset();
  useMoveDraftStore.getState().cancelDraft();
  useCarrierOrderDraftStore.getState().cancelDraft();
  useSelectionStore.getState().selectUnit(null);
  useSelectionStore.getState().selectHex(null);
}
