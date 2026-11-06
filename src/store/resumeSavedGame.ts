import { useCarrierOrderDraftStore } from './useCarrierOrderDraftStore';
import { useGameStore } from './useGameStore';
import { useMoveDraftStore } from './useMoveDraftStore';
import { useSaveStore } from './useSaveStore';
import { useSelectionStore } from './useSelectionStore';

/**
 * Reprend la partie trouvée au démarrage : l'état et le journal sont restaurés, la sélection et les
 * brouillons sont réinitialisés (ils ne sont jamais sauvegardés). Sans effet s'il n'y a rien à reprendre.
 */
export function resumeSavedGame(): void {
  const found = useSaveStore.getState().found;
  if (!found) return;
  useGameStore.getState().restore(found.state, found.events);
  useSaveStore.getState().dismissFound();
  useMoveDraftStore.getState().cancelDraft();
  useCarrierOrderDraftStore.getState().cancelDraft();
  useSelectionStore.getState().selectUnit(null);
  useSelectionStore.getState().selectHex(null);
}
