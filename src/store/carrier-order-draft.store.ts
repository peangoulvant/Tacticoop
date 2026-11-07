import { create } from 'zustand';
import * as engine from '../engine';

/**
 * Brouillon d'ordre de navigation du porte-avions : l'ordre en préparation, pas encore confirmé
 * (SF-03 §5). Il ne consomme pas le quota tant qu'il n'est pas exécuté. Seuls le type d'ordre et
 * le point de passage choisi sont conservés : le trajet et les refus sont recalculés.
 */
interface CarrierOrderDraftStore {
  kind: engine.CarrierOrderKind | null;
  waypoint: engine.Hex | null;
  startDraft: (kind: engine.CarrierOrderKind) => void;
  previewWaypoint: (waypoint: engine.Hex) => void;
  cancelDraft: () => void;
}

export const useCarrierOrderDraftStore = create<CarrierOrderDraftStore>((set) => ({
  kind: null,
  waypoint: null,
  startDraft: (kind) => set({ kind, waypoint: null }),
  previewWaypoint: (waypoint) => set({ waypoint }),
  cancelDraft: () => set({ kind: null, waypoint: null }),
}));
