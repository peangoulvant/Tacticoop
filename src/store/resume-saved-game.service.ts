import { cancelAllDrafts } from './cancel-drafts.service';
import { useGameStore } from './game.store';
import { useSaveStore } from './save.store';
import { useSweepResultStore } from './sweep-result.store';
import { useSelectionStore } from './selection.store';

/**
 * Reprend la partie trouvée au démarrage : l'état et le journal sont restaurés, la sélection et les
 * brouillons sont réinitialisés (ils ne sont jamais sauvegardés). Sans effet s'il n'y a rien à reprendre.
 */
export function resumeSavedGame(): void {
  const found = useSaveStore.getState().found;
  if (!found) return;
  useGameStore.getState().restore(found.state, found.events);
  useSaveStore.getState().dismissFound();
  cancelAllDrafts();
  useSweepResultStore.getState().clear();
  useSelectionStore.getState().selectUnit(null);
  useSelectionStore.getState().selectHex(null);
}
