import { create } from 'zustand';

/**
 * Brouillon de balayage : l'action en préparation, pas encore confirmée (AB-30). Elle n'a
 * aucun paramètre : seule l'unité qui cherche est conservée, la portée et les cases surlignées sont
 * recalculées par le moteur. Annuler ne consomme rien ; consulter d'autres unités le conserve.
 */
interface SweepDraftStore {
  unitId: string | null;
  startDraft: (unitId: string) => void;
  cancelDraft: () => void;
}

export const useSweepDraftStore = create<SweepDraftStore>((set) => ({
  unitId: null,
  startDraft: (unitId) => set({ unitId }),
  cancelDraft: () => set({ unitId: null }),
}));
