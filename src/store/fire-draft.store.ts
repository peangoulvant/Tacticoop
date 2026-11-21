import { create } from 'zustand';
import * as engine from '../engine';

/**
 * Brouillon de tir : le tir en préparation, pas encore confirmé (AB-45, SF-03.12). Il garde
 * l'unité, l'arme et la cible choisie (un contact, et pour une zone suspecte l'hexagone visé) ;
 * le trajet, la portée et les avertissements sont recalculés par le moteur. Annuler ne consomme
 * rien ; consulter d'autres unités le conserve.
 */
interface FireDraftStore {
  unitId: string | null;
  weapon: engine.WeaponKind | null;
  contactId: string | null;
  /** Hexagone choisi dans une zone suspecte ; `null` pour un contact identifié. */
  hex: engine.Hex | null;
  startDraft: (unitId: string, weapon: engine.WeaponKind) => void;
  chooseTarget: (contactId: string, hex: engine.Hex | null) => void;
  cancelDraft: () => void;
}

export const useFireDraftStore = create<FireDraftStore>((set) => ({
  unitId: null,
  weapon: null,
  contactId: null,
  hex: null,
  startDraft: (unitId, weapon) => set({ unitId, weapon, contactId: null, hex: null }),
  chooseTarget: (contactId, hex) => set({ contactId, hex }),
  cancelDraft: () => set({ unitId: null, weapon: null, contactId: null, hex: null }),
}));
