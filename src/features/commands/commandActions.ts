import type { GameCommand, Hex } from '../../engine';
import { useGameStore } from '../../store/useGameStore';
import { useMovePlanStore } from '../../store/useMovePlanStore';
import { useSelectionStore } from '../../store/useSelectionStore';

/** Envoie la commande au moteur ; si elle est acceptée, le déplacement en préparation est abandonné. */
function dispatchAndClosePlan(command: GameCommand): void {
  if (useGameStore.getState().dispatch(command)) useMovePlanStore.getState().cancel();
}

export function confirmMove(unitId: string, destination: Hex): void {
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
  useMovePlanStore.getState().cancel();
  useSelectionStore.getState().selectUnit(null);
  useSelectionStore.getState().selectHex(null);
}
