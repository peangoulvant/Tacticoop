import * as engine from '../../../engine';
import * as labels from '../../../shared/ui.label';
import { cancelAllDrafts } from '../../../store/cancel-drafts.service';
import { dispatchAndCloseDrafts } from '../../../store/dispatch-and-close-drafts.service';
import { useGameStore } from '../../../store/game.store';
import { useFireDraftStore } from '../../../store/fire-draft.store';
import { useMoveDraftStore } from '../../../store/move-draft.store';
import { useSweepDraftStore } from '../../../store/sweep-draft.store';
import { useActionResultStore } from '../../../store/action-result.store';
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
  cancelAllDrafts();
  useMoveDraftStore.getState().startDraft(unitId);
}

/** Prépare un balayage ; un seul brouillon à la fois, les autres sont abandonnés. */
export function startSweepDraft(unitId: string): void {
  cancelAllDrafts();
  useSweepDraftStore.getState().startDraft(unitId);
}

/**
 * Confirme le balayage : le moteur le résout sur-le-champ. S'il est accepté, le retour
 * explicite est affiché, que des navires soient identifiés ou non (SF-04 §3, AB-30).
 */
export function confirmSweep(unitId: string): void {
  const before = useGameStore.getState().events.length;
  dispatchAndCloseDrafts({ type: 'SWEEP', unitId });
  const performed = useGameStore
    .getState()
    .events.slice(before)
    .find((event) => event.type === 'SWEEP_PERFORMED');
  if (performed) {
    const identified = performed.identified.length;
    useActionResultStore
      .getState()
      .show(labels.sweepResultLabel(identified), identified > 0 ? 'success' : 'info');
  }
}

/** Prépare un tir ; un seul brouillon à la fois, les autres sont abandonnés. */
export function startFireDraft(unitId: string, weapon: engine.WeaponKind): void {
  cancelAllDrafts();
  useFireDraftStore.getState().startDraft(unitId, weapon);
}

/**
 * Confirme le tir : le moteur lance le projectile, le stock baisse et l'action est consommée ; le
 * résultat (touché, détruit, sans effet) viendra au journal après la progression (AB-45, AB-49).
 * S'il est accepté, le retour explicite est affiché.
 */
export function confirmFire(
  unitId: string,
  weapon: engine.WeaponKind,
  target: engine.ShotTarget,
): void {
  const before = useGameStore.getState().events.length;
  dispatchAndCloseDrafts({ type: 'FIRE', unitId, weapon, target });
  const fired = useGameStore
    .getState()
    .events.slice(before)
    .some((event) => event.type === 'SHOT_FIRED');
  if (fired) useActionResultStore.getState().show(labels.fireResultLabel[weapon], 'success');
}

/**
 * Termine la mission, abandonnée ou réussie : retour à la préparation d'une nouvelle partie, sans
 * sélection ni brouillon résiduel.
 */
export function closeMission(): void {
  useGameStore.getState().reset();
  cancelAllDrafts();
  useActionResultStore.getState().clear();
  useSelectionStore.getState().selectUnit(null);
  useSelectionStore.getState().selectHex(null);
}
