import { create } from 'zustand';

/**
 * Brouillon de recherche active : l'action en préparation, pas encore confirmée (AB-30). Elle n'a
 * aucun paramètre : seule l'unité qui cherche est conservée, la portée et les cases surlignées sont
 * recalculées par le moteur. Annuler ne consomme rien ; consulter d'autres unités le conserve.
 */
interface SearchDraftStore {
  unitId: string | null;
  startDraft: (unitId: string) => void;
  cancelDraft: () => void;
}

export const useSearchDraftStore = create<SearchDraftStore>((set) => ({
  unitId: null,
  startDraft: (unitId) => set({ unitId }),
  cancelDraft: () => set({ unitId: null }),
}));
