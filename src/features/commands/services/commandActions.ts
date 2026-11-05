import * as engine from '../../../engine';
import { useGameStore } from '../../../store/useGameStore';
import { useMoveDraftStore } from '../../../store/useMoveDraftStore';
import { useSelectionStore } from '../../../store/useSelectionStore';

/** Envoie la commande au moteur ; si elle est acceptée, le brouillon de déplacement est abandonné. */
function dispatchAndClosePlan(command: engine.GameCommand): void {
  if (useGameStore.getState().dispatch(command)) useMoveDraftStore.getState().cancelDraft();
}

export function confirmMove(unitId: string, destination: engine.Hex): void {
  dispatchAndClosePlan({ type: 'MOVE_UNIT', unitId, destination });
}

export function endActivation(unitId: string): void {
  dispatchAndClosePlan({ type: 'END_ACTIVATION', unitId });
}

export function endCycleEarly(): void {
  dispatchAndClosePlan({ type: 'END_CYCLE_EARLY' });
}

/** Abandonne la mission : retour à la préparation, sans sélection ni déplacement résiduel. */
export function abandonMission(): void {
  useGameStore.getState().reset();
  useMoveDraftStore.getState().cancelDraft();
  useSelectionStore.getState().selectUnit(null);
  useSelectionStore.getState().selectHex(null);
}
