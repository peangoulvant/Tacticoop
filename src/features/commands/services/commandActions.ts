import * as engine from '../../../engine';
import { useCarrierOrderDraftStore } from '../../../store/useCarrierOrderDraftStore';
import { dispatchAndCloseDrafts } from '../../../store/dispatchAndCloseDrafts';
import { useGameStore } from '../../../store/useGameStore';
import { useMoveDraftStore } from '../../../store/useMoveDraftStore';
import { useSelectionStore } from '../../../store/useSelectionStore';

export function confirmMove(unitId: string, destination: engine.Hex): void {
  dispatchAndCloseDrafts({ type: 'MOVE_UNIT', unitId, destination });
}

export function endActivation(unitId: string): void {
  dispatchAndCloseDrafts({ type: 'END_ACTIVATION', unitId });
}

export function endCycleEarly(): void {
  dispatchAndCloseDrafts({ type: 'END_CYCLE_EARLY' });
}

/** Prépare un déplacement ; un seul brouillon à la fois, celui d'un ordre de navigation est abandonné. */
export function startMoveDraft(unitId: string): void {
  useCarrierOrderDraftStore.getState().cancelDraft();
  useMoveDraftStore.getState().startDraft(unitId);
}

/**
 * Termine la mission, abandonnée ou réussie : retour à la préparation d'une nouvelle partie, sans
 * sélection ni brouillon résiduel.
 */
export function closeMission(): void {
  useGameStore.getState().reset();
  useMoveDraftStore.getState().cancelDraft();
  useCarrierOrderDraftStore.getState().cancelDraft();
  useSelectionStore.getState().selectUnit(null);
  useSelectionStore.getState().selectHex(null);
}
