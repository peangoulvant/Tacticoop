import { create } from 'zustand';

/**
 * Retour explicite de la dernière action spéciale (balayage, tir), affiché pendant quelques
 * secondes (AB-30, AB-45). Il ne garde que le texte et sa gravité : le détail est dans le journal.
 * `serial` redémarre l'affichage quand deux actions se suivent.
 */
interface ActionResultStore {
  result: { message: string; severity: 'success' | 'info'; serial: number } | null;
  show: (message: string, severity: 'success' | 'info') => void;
  clear: () => void;
}

export const useActionResultStore = create<ActionResultStore>((set) => ({
  result: null,
  show: (message, severity) =>
    set((s) => ({ result: { message, severity, serial: (s.result?.serial ?? 0) + 1 } })),
  clear: () => set({ result: null }),
}));
