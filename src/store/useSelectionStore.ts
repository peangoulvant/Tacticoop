import { create } from 'zustand';
import type { Hex } from '../engine';

/** Sélection : seulement des identifiants, jamais de données métier. La vue de la carte reste locale. */
interface SelectionStore {
  selectedUnitId: string | null;
  selectedHex: Hex | null;
  selectUnit: (id: string | null) => void;
  selectHex: (hex: Hex | null) => void;
}

export const useSelectionStore = create<SelectionStore>((set) => ({
  selectedUnitId: null,
  selectedHex: null,
  selectUnit: (id) => set({ selectedUnitId: id }),
  selectHex: (hex) => set({ selectedHex: hex }),
}));
