import * as engine from '../../../engine';
import { useCarrierOrderDraftStore } from '../../../store/carrier-order-draft.store';
import { dispatchAndCloseDrafts } from '../../../store/dispatch-and-close-drafts.service';
import { useGameStore } from '../../../store/game.store';
import { useMoveDraftStore } from '../../../store/move-draft.store';
import { useSearchDraftStore } from '../../../store/search-draft.store';
import { useSearchResultStore } from '../../../store/search-result.store';
import { useSelectionStore } from '../../../store/selection.store';

export function confirmMove(unitId: string, destination: engine.Hex): void {
  dispatchAndCloseDrafts({ type: 'MOVE_UNIT', unitId, destination });
}

export function endActivation(unitId: string): void {
  dispatchAndCloseDrafts({ type: 'END_ACTIVATION', unitId });
}

export function endCycleEarly(): void {
  dispatchAndCloseDrafts({ type: 'END_CYCLE_EARLY' });
}

/** Prépare un déplacement ; un seul brouillon à la fois, les autres sont abandonnés. */
export function startMoveDraft(unitId: string): void {
  useCarrierOrderDraftStore.getState().cancelDraft();
  useSearchDraftStore.getState().cancelDraft();
  useMoveDraftStore.getState().startDraft(unitId);
}

/** Prépare une recherche active ; un seul brouillon à la fois, les autres sont abandonnés. */
export function startSearchDraft(unitId: string): void {
  useCarrierOrderDraftStore.getState().cancelDraft();
  useMoveDraftStore.getState().cancelDraft();
  useSearchDraftStore.getState().startDraft(unitId);
}

/**
 * Confirme la recherche active : le moteur la résout sur-le-champ. Si elle est acceptée, le retour
 * explicite est affiché, que des navires soient identifiés ou non (SF-04 §3, AB-30).
 */
export function confirmSearch(unitId: string): void {
  const before = useGameStore.getState().events.length;
  dispatchAndCloseDrafts({ type: 'ACTIVE_SEARCH', unitId });
  const performed = useGameStore
    .getState()
    .events.slice(before)
    .find((event) => event.type === 'ACTIVE_SEARCH_PERFORMED');
  if (performed) useSearchResultStore.getState().show(performed.identified.length);
}

/**
 * Termine la mission, abandonnée ou réussie : retour à la préparation d'une nouvelle partie, sans
 * sélection ni brouillon résiduel.
 */
export function closeMission(): void {
  useGameStore.getState().reset();
  useMoveDraftStore.getState().cancelDraft();
  useCarrierOrderDraftStore.getState().cancelDraft();
  useSearchDraftStore.getState().cancelDraft();
  useSearchResultStore.getState().clear();
  useSelectionStore.getState().selectUnit(null);
  useSelectionStore.getState().selectHex(null);
}
