import { create } from 'zustand';
import * as engine from '../engine';

/**
 * Sélection : seulement des identifiants, jamais de données métier. La vue de la carte reste
 * locale. Une unité et un projectile allié ne sont jamais sélectionnés ensemble : choisir l'un
 * désélectionne l'autre.
 */
interface SelectionStore {
  selectedUnitId: string | null;
  selectedProjectileId: string | null;
  selectedHex: engine.Hex | null;
  selectUnit: (id: string | null) => void;
  selectProjectile: (id: string | null) => void;
  selectHex: (hex: engine.Hex | null) => void;
}

export const useSelectionStore = create<SelectionStore>((set) => ({
  selectedUnitId: null,
  selectedProjectileId: null,
  selectedHex: null,
  selectUnit: (id) => set({ selectedUnitId: id, selectedProjectileId: null }),
  selectProjectile: (id) => set({ selectedProjectileId: id, selectedUnitId: null }),
  selectHex: (hex) => set({ selectedHex: hex }),
}));
