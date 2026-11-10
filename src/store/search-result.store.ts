import { create } from 'zustand';

/**
 * Retour explicite de la dernière recherche active, affiché pendant quelques secondes (AB-30).
 * Il ne garde que le nombre de navires identifiés : le détail est dans le journal. `serial`
 * redémarre l'affichage quand deux recherches se suivent.
 */
interface SearchResultStore {
  result: { identified: number; serial: number } | null;
  show: (identified: number) => void;
  clear: () => void;
}

export const useSearchResultStore = create<SearchResultStore>((set) => ({
  result: null,
  show: (identified) =>
    set((s) => ({ result: { identified, serial: (s.result?.serial ?? 0) + 1 } })),
  clear: () => set({ result: null }),
}));
