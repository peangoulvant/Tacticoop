import type { NavalCategory } from '../map/terrain';

/**
 * Valeurs provisoires et configurables (arbitrages D-03 et SF-01, octobre 2026).
 * Elles seront équilibrées par les tests ; aucune n'est codée en dur dans l'UI.
 */
export type ShipClass = 'fremm' | 'frigate_da' | 'frigate_asm' | 'submarine' | 'carrier';

/** Classes que le joueur peut acheter (le porte-avions est fourni par le scénario). */
export type PurchasableShipClass = Exclude<ShipClass, 'carrier'>;

export interface ShipSpec {
  label: string;
  description: string;
  category: NavalCategory;
  /** Coût en points ; 0 pour le porte-avions, hors budget. */
  cost: number;
  maxHp: number;
  /** Mouvement en hexagones (0 à 2 pour la navigation automatique du porte-avions). */
  movement: number;
  missiles: number;
  torpedoes: number;
  helicopters: number;
}

export interface GameConfig {
  map: { width: number; height: number };
  budget: { normal: number; limitedMeans: number };
  constraints: {
    /** Nombre maximal de contraintes initiales (0 à ce maximum, SF-01 §4). */
    maxCount: number;
    /** Dotation conservée avec « Stocks de munitions limités » (arrondi inférieur). */
    ammoFactor: number;
    /** Plafond de déplacement des unités alliées avec « Météo défavorable ». */
    badWeatherMaxMovement: number;
  };
  ships: Record<ShipClass, ShipSpec>;
}

export const PURCHASABLE_CLASSES: readonly PurchasableShipClass[] = [
  'fremm',
  'frigate_da',
  'frigate_asm',
  'submarine',
];

export const defaultConfig: GameConfig = {
  map: { width: 35, height: 35 },
  budget: { normal: 100, limitedMeans: 70 },
  constraints: { maxCount: 2, ammoFactor: 0.7, badWeatherMaxMovement: 2 },
  ships: {
    fremm: {
      label: 'FREMM multimission',
      description: 'Polyvalente, plus coûteuse.',
      category: 'frigate',
      cost: 35,
      maxHp: 110,
      movement: 3,
      missiles: 4,
      torpedoes: 4,
      helicopters: 1,
    },
    frigate_da: {
      label: 'Frégate DA',
      description: 'Défense antiaérienne.',
      category: 'frigate',
      cost: 25,
      maxHp: 100,
      movement: 3,
      missiles: 6,
      torpedoes: 2,
      helicopters: 1,
    },
    frigate_asm: {
      label: 'Frégate ASM',
      description: 'Lutte anti-sous-marine.',
      category: 'frigate',
      cost: 25,
      maxHp: 100,
      movement: 3,
      missiles: 2,
      torpedoes: 6,
      helicopters: 2,
    },
    submarine: {
      label: 'Sous-marin',
      description: 'Discret, torpilles uniquement.',
      category: 'submarine',
      cost: 50,
      maxHp: 80,
      movement: 2,
      missiles: 0,
      torpedoes: 4,
      helicopters: 0,
    },
    carrier: {
      label: 'Porte-avions',
      description: 'Fourni par le scénario, navigation automatique.',
      category: 'carrier',
      cost: 0,
      maxHp: 200,
      movement: 2,
      missiles: 0,
      torpedoes: 0,
      helicopters: 0,
    },
  },
};
