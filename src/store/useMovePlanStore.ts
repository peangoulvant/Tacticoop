import { create } from 'zustand';
import type { Hex } from '../engine';

/**
 * Déplacement en préparation, pas encore confirmé (SF-03.12). Il reste associé à l'unité active
 * même quand le joueur consulte d'autres fiches ; il ne consomme rien tant qu'il n'est pas exécuté.
 * Seuls un identifiant et une case sont conservés : le chemin est recalculé par le moteur.
 */
interface MovePlanStore {
  unitId: string | null;
  destination: Hex | null;
  start: (unitId: string) => void;
  preview: (destination: Hex) => void;
  cancel: () => void;
}

export const useMovePlanStore = create<MovePlanStore>((set) => ({
  unitId: null,
  destination: null,
  start: (unitId) => set({ unitId, destination: null }),
  preview: (destination) => set({ destination }),
  cancel: () => set({ unitId: null, destination: null }),
}));
