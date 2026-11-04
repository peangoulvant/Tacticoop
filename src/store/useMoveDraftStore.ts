import { create } from 'zustand';
import type { Hex } from '../engine';

/**
 * Brouillon de déplacement : déplacement en préparation, pas encore confirmé (SF-03.12). Il reste
 * associé à l'unité active même quand le joueur consulte d'autres fiches ; il ne consomme rien tant
 * qu'il n'est pas exécuté. Seuls un identifiant et une case sont conservés : le chemin est
 * recalculé par le moteur.
 */
interface MoveDraftStore {
  unitId: string | null;
  destination: Hex | null;
  startDraft: (unitId: string) => void;
  previewDestination: (destination: Hex) => void;
  cancelDraft: () => void;
}

export const useMoveDraftStore = create<MoveDraftStore>((set) => ({
  unitId: null,
  destination: null,
  startDraft: (unitId) => set({ unitId, destination: null }),
  previewDestination: (destination) => set({ destination }),
  cancelDraft: () => set({ unitId: null, destination: null }),
}));
