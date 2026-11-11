import type { NavalCategory } from '../map/terrain.model';

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
  /** Capteurs de détection (G-08.4) ; `null` pour une unité qui ne détecte pas (porte-avions, D-04). */
  detection: DetectorSpec | null;
}

/** Portées en hexagones et probabilités de détection d'un type de bâtiment (G-08.4, SF-04 §2-§3). */
export interface DetectorSpec {
  watchRange: number;
  watchProbability: number;
  sweepRange: number;
  sweepProbability: number;
}

/** Classes de frégate que l'ennemi peut aligner (AB-11). */
export type HostileFrigateClass = Extract<ShipClass, 'fremm' | 'frigate_da' | 'frigate_asm'>;

/** Une configuration possible de la force ennemie et son poids de tirage (AB-11). */
export interface HostileComposition {
  frigates: number;
  submarines: number;
  weight: number;
}

/** Force ennemie d'un scénario : configurations pondérées, puis classe de chaque frégate (AB-11, AB-13). */
export interface HostileForceSpec {
  compositions: readonly HostileComposition[];
  frigateClassWeights: Record<HostileFrigateClass, number>;
}

/**
 * Paramètres de chaque scénario (AB-12 à AB-16). Les colonnes sont des parts de la largeur de la
 * carte ; les distances et zones en sont aussi des parts, pour rester valables si la taille change.
 */
export interface MissionsConfig {
  navalCombat: {
    /** Colonne du point de départ allié, en part de la largeur (0 = bord ouest). */
    alliedStartColumnRatio: number;
    /** Largeur de la bande est où partent les ennemis, en part de la largeur de la carte. */
    hostileZoneWidthRatio: number;
    /** Distance minimale entre un ennemi et le point de départ allié, en part de la largeur. */
    minStartDistanceRatio: number;
    hostile: HostileForceSpec;
  };
  escort: {
    /** Colonnes de A et de B, en part de la largeur (0 = bord ouest, 1 = bord est). */
    startColumnRatio: number;
    goalColumnRatio: number;
    /** Colonnes de la zone d'interception, en part de la largeur de la carte. */
    interceptionZone: { fromRatio: number; toRatio: number };
    minDistanceFromStartRatio: number;
    minDistanceFromGoalRatio: number;
    hostile: HostileForceSpec;
  };
}

/**
 * Portées d'armes validées en hexagones (D-05). Elles servent pour l'instant au contrôle de
 * cohérence des distances de départ avec les portées de détection ; le combat les utilisera.
 */
export interface WeaponRangesConfig {
  missile: number;
  torpedo: number;
}

/** Paramètres communs de la veille (AB-20, AB-22). */
export interface DetectionConfig {
  /** Nombre d'hexagones d'une zone de contact, cible comprise (G-08.2.2). */
  zoneSize: number;
  /** Tentatives pour obtenir une zone sans terre avant le repli (AB-20). */
  zoneMaxAttempts: number;
  /** Points de probabilité de détection de veille gagnés contre un sous-marin en mer côtière (AB-22). */
  coastalSubmarineWatchBonus: number;
}

export interface GameConfig {
  map: { width: number; height: number };
  missions: MissionsConfig;
  weaponRanges: WeaponRangesConfig;
  detection: DetectionConfig;
  budget: { normal: number; limitedMeans: number };
  constraints: {
    /** Nombre maximal de contraintes initiales (0 à ce maximum, SF-01 §4). */
    maxCount: number;
    /** Dotation conservée avec « Stocks de munitions limités » (arrondi inférieur). */
    ammoFactor: number;
    /** Plafond de déplacement des unités alliées avec « Météo défavorable ». */
    badWeatherMaxMovement: number;
    /** Part de la portée de détection conservée avec « Capteurs dégradés », arrondie à l'inférieur (SF-01 §4). */
    sensorsFactor: number;
  };
  ships: Record<ShipClass, ShipSpec>;
}

export const PURCHASABLE_CLASSES: readonly PurchasableShipClass[] = [
  'fremm',
  'frigate_da',
  'frigate_asm',
  'submarine',
];

/** Quatre configurations équiprobables, 3 navires (AB-11). */
const HOSTILE_FORCE: HostileForceSpec = {
  compositions: [
    { frigates: 3, submarines: 0, weight: 1 },
    { frigates: 2, submarines: 1, weight: 1 },
    { frigates: 1, submarines: 2, weight: 1 },
    { frigates: 0, submarines: 3, weight: 1 },
  ],
  frigateClassWeights: { fremm: 1, frigate_da: 1, frigate_asm: 1 },
};

/** Portées et probabilités initiales de la frégate et du sous-marin, identiques (G-08.4). */
const DETECTOR: DetectorSpec = {
  watchRange: 2,
  watchProbability: 0.6,
  sweepRange: 4,
  sweepProbability: 0.9,
};

export const defaultConfig: GameConfig = {
  map: { width: 35, height: 35 },
  missions: {
    navalCombat: {
      alliedStartColumnRatio: 0.06,
      hostileZoneWidthRatio: 0.25,
      minStartDistanceRatio: 0.4,
      hostile: HOSTILE_FORCE,
    },
    escort: {
      startColumnRatio: 0.06,
      goalColumnRatio: 0.94,
      interceptionZone: { fromRatio: 0.3, toRatio: 0.85 },
      minDistanceFromStartRatio: 0.4,
      minDistanceFromGoalRatio: 0.25,
      hostile: HOSTILE_FORCE,
    },
  },
  weaponRanges: { missile: 8, torpedo: 5 },
  detection: { zoneSize: 7, zoneMaxAttempts: 200, coastalSubmarineWatchBonus: 0.2 },
  budget: { normal: 100, limitedMeans: 70 },
  constraints: { maxCount: 2, ammoFactor: 0.7, badWeatherMaxMovement: 2, sensorsFactor: 0.8 },
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
      detection: DETECTOR,
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
      detection: DETECTOR,
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
      detection: DETECTOR,
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
      detection: DETECTOR,
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
      detection: null,
    },
  },
};
