import { create } from 'zustand';
import * as persistence from '../persistence';

/**
 * État de la sauvegarde automatique, affiché par l'interface. Il ne contient aucune donnée de jeu :
 * la partie reste dans `useGameStore`.
 */
interface SaveStore {
  /** Sauvegarde valide trouvée au démarrage et proposée à la reprise ; `null` sinon. */
  found: persistence.SaveFile | null;
  /** Dernière écriture échouée et pas encore suivie d'une réussite (avertissement affiché). */
  writeFailed: boolean;
  /** Heure de la dernière écriture **confirmée** ; `null` tant qu'aucune ne l'est. */
  lastSavedAt: Date | null;
  setFound: (save: persistence.SaveFile) => void;
  /** Cache la proposition de reprise sans toucher à la sauvegarde stockée. */
  dismissFound: () => void;
  markSaved: (at: Date) => void;
  /** Efface l'heure de sauvegarde et l'avertissement (la sauvegarde stockée a été supprimée). */
  markCleared: () => void;
  markWriteFailed: () => void;
}

export const useSaveStore = create<SaveStore>((set) => ({
  found: null,
  writeFailed: false,
  lastSavedAt: null,
  setFound: (save) => set({ found: save }),
  dismissFound: () => set({ found: null }),
  markSaved: (at) => set({ lastSavedAt: at, writeFailed: false }),
  markCleared: () => set({ lastSavedAt: null, writeFailed: false }),
  markWriteFailed: () => set({ writeFailed: true }),
}));
