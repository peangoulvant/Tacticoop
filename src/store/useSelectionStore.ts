import { create } from 'zustand';
import type { Hex } from '../engine';

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;

/** Sélection et zoom : seulement des identifiants et préférences, jamais de données métier. */
interface SelectionStore {
  selectedUnitId: string | null;
  selectedHex: Hex | null;
  zoom: number;
  selectUnit: (id: string | null) => void;
  selectHex: (hex: Hex | null) => void;
  setZoom: (zoom: number) => void;
}

export const useSelectionStore = create<SelectionStore>((set) => ({
  selectedUnitId: null,
  selectedHex: null,
  zoom: 1,
  selectUnit: (id) => set({ selectedUnitId: id }),
  selectHex: (hex) => set({ selectedHex: hex }),
  setZoom: (zoom) => set({ zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom)) }),
}));
