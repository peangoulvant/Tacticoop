import { create } from 'zustand';

/**
 * Retour explicite du dernier balayage, affiché pendant quelques secondes (AB-30).
 * Il ne garde que le nombre de navires identifiés : le détail est dans le journal. `serial`
 * redémarre l'affichage quand deux balayages se suivent.
 */
interface SweepResultStore {
  result: { identified: number; serial: number } | null;
  show: (identified: number) => void;
  clear: () => void;
}

export const useSweepResultStore = create<SweepResultStore>((set) => ({
  result: null,
  show: (identified) =>
    set((s) => ({ result: { identified, serial: (s.result?.serial ?? 0) + 1 } })),
  clear: () => set({ result: null }),
}));
