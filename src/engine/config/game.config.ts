import type { NavalCategory, Terrain } from '../map/terrain.model';

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

/**
 * Portées en hexagones et probabilités de détection d'un type de bâtiment (G-08.4, SF-04 §2-§3).
 * La *veille* est la détection continue de fin de cycle ; le *balayage* est l'action du joueur.
 */
export interface DetectorSpec {
  watchRange: number;
  /** Probabilité de base de la veille, avant les bonus de `DetectionConfig` (AB-33). */
  watchProbability: number;
  sweepRange: number;
  sweepProbability: number;
}

/**
 * Actions spéciales d'une unité (G-07) : balayage et tirs (AB-44). Réparation et leurre
 * viendront s'ajouter ici, chacune avec son délai de récupération.
 */
export const SPECIAL_ACTION_KINDS = ['sweep', 'fire_missile', 'fire_torpedo'] as const;
export type SpecialActionKind = (typeof SPECIAL_ACTION_KINDS)[number];

/** Paramètres d'une action spéciale. */
export interface SpecialActionSpec {
  /**
   * Nombre de cycles pendant lesquels l'action reste indisponible après son usage (AB-34).
   * Exemple : avec 1, une action faite au cycle 3 est impossible au cycle 4, de nouveau possible
   * au cycle 5. Avec 0, elle est possible à chaque cycle.
   */
  cooldownCycles: number;
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

/** Armes de tir (AB-44) : une action spéciale de tir par arme, un stock par arme. */
export const WEAPON_KINDS = ['missile', 'torpedo'] as const;
export type WeaponKind = (typeof WEAPON_KINDS)[number];

/** Action spéciale qui tire chaque arme. */
export const FIRE_ACTION: Record<WeaponKind, SpecialActionKind> = {
  missile: 'fire_missile',
  torpedo: 'fire_torpedo',
};

/**
 * Paramètres d'une arme (D-05, AB-43, AB-47), tous provisoires (équilibrage G-03.1.5).
 *
 * Échelle de référence : 1 hexagone ≈ 20 km et 1 cycle ≈ 1 heure (un mouvement de 3 hexagones fait
 * environ 32 nœuds). Missile 8 = 160 km (Exocet MM40 bloc 3, NSM : environ 180 km) ; torpille
 * 3 = 60 km (torpilles lourdes : environ 50 km). Un missile porte plus loin que les capteurs du
 * tireur : la cible est désignée par un contact du camp, comme avec un hélicoptère.
 */
export interface WeaponSpec {
  /** Portée de tir, en hexagones. */
  range: number;
  /** Hexagones parcourus à chaque progression des projectiles (G-09). */
  progression: number;
  /** Plage de dégâts d'un impact réussi, bornes comprises (G-09.3.2). Exemple : 30 à 50 PV. */
  damage: { min: number; max: number };
  /** Probabilité d'impact sur une unité compatible rencontrée. */
  impactProbability: number;
  /** Hexagones que le projectile peut parcourir avant d'être neutralisé ; `null` : jusqu'à la case visée. */
  autonomy: number | null;
  /**
   * Portée d'acquisition de la cible désignée par les capteurs du projectile, en hexagones,
   * sans tirage (G-09 §2.2) ; 0 pour une arme sans autodirecteur.
   */
  acquisitionRange: number;
}

/** Paramètres de combat (AB-47, AB-49). */
export interface CombatConfig {
  weapons: Record<WeaponKind, WeaponSpec>;
  /** Points de probabilité d'impact perdus par un tir sur une zone suspecte (AB-47). */
  suspectZoneImpactPenalty: number;
  /**
   * Distance, en hexagones, à laquelle un projectile adverse est identifié d'office par toute
   * unité alliée, porte-avions compris, sans tirage ni capteurs (AB-49).
   */
  projectileDetectionRange: number;
}

/** Paramètres communs de la veille (AB-20, AB-22, AB-33). */
export interface DetectionConfig {
  /** Nombre d'hexagones d'une zone de contact, cible comprise (G-08.2.2). */
  zoneSize: number;
  /** Tentatives pour obtenir une zone sans terre avant le repli (AB-20). */
  zoneMaxAttempts: number;
  /** Points de probabilité de détection de veille gagnés contre un sous-marin en mer côtière (AB-22). */
  coastalSubmarineWatchBonus: number;
  /**
   * Points de probabilité de veille gagnés contre une unité qui a fait un balayage pendant le
   * cycle : l'émission active fait du bruit (AB-33). Se cumule avec le bonus côtier.
   */
  sweepNoiseWatchBonus: number;
  /** Points de probabilité de veille gagnés contre une unité qui a tiré pendant le cycle (AB-49). */
  fireNoiseWatchBonus: number;
}

/**
 * Génération procédurale de la carte (SF-02 §1, §3). Valeurs provisoires, GD-06 non arbitré :
 * modifier ces valeurs change l'aspect des cartes, jamais les règles du jeu.
 */
export interface MapGenerationConfig {
  /**
   * Part de la carte attribuée à chaque terrain ; la somme vaut 1. Exemple : 0,3 de mer profonde
   * sur une carte de 35 × 35 = 1225 cases donne environ 368 cases de mer profonde.
   */
  terrainShares: Record<Terrain, number>;
  /** Nombre de lissages du bruit : plus il est grand, plus les ensembles de terrain sont vastes. */
  smoothingPasses: number;
  /**
   * Lignes (en part de la hauteur) par lesquelles passe un itinéraire de contournement du
   * porte-avions : 0,2 est au nord, 0,8 au sud de la ligne droite A→B.
   */
  bypassRowRatios: readonly number[];
}

/**
 * Paramètres de l'IA ennemie (AB-40). Les arrêts de l'IA se déduisent des portées de détection de
 * l'unité (`DetectorSpec`) : aucune distance d'arrêt propre à l'IA.
 */
export interface AiConfig {
  /**
   * Lutte navale : colonne de la station de départ des unités ennemies, en part de la largeur. Le
   * centre (0,5) est la seule ancre qui n'indique pas le point de départ allié, ignoré de l'IA
   * (AB-37). Exemple : 0,5 sur une carte de 35 de large donne la colonne 17.
   */
  navalCombatStationColumnRatio: number;
}

export interface GameConfig {
  map: { width: number; height: number; generation: MapGenerationConfig };
  missions: MissionsConfig;
  combat: CombatConfig;
  detection: DetectionConfig;
  ai: AiConfig;
  specialActions: Record<SpecialActionKind, SpecialActionSpec>;
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

/**
 * Portées et probabilités initiales de la frégate et du sous-marin, identiques (G-08.4, AB-43).
 * Échelle de référence : 1 hexagone ≈ 20 km. Veille 3 = 60 km (horizon radar de 40-50 km, plus
 * l'écoute des émissions ennemies) ; balayage 6 = 120 km (radar actif et hélicoptère). Hiérarchie
 * : torpille ≤ veille < balayage < missile, vérifiée par `game.config.test.ts`.
 */
const DETECTOR: DetectorSpec = {
  watchRange: 3,
  watchProbability: 0.5,
  sweepRange: 6,
  sweepProbability: 0.9,
};

export const defaultConfig: GameConfig = {
  map: {
    width: 35,
    height: 35,
    generation: {
      terrainShares: {
        deep_sea: 0.3,
        sea: 0.25,
        coastal_sea: 0.12,
        beach: 0.05,
        plain: 0.18,
        mountain: 0.1,
      },
      smoothingPasses: 9,
      bypassRowRatios: [0.2, 0.8],
    },
  },
  missions: {
    navalCombat: {
      alliedStartColumnRatio: 0.06,
      hostileZoneWidthRatio: 0.25,
      minStartDistanceRatio: 0.45,
      hostile: HOSTILE_FORCE,
    },
    escort: {
      startColumnRatio: 0.06,
      goalColumnRatio: 0.94,
      interceptionZone: { fromRatio: 0.3, toRatio: 0.85 },
      minDistanceFromStartRatio: 0.45,
      minDistanceFromGoalRatio: 0.25,
      hostile: HOSTILE_FORCE,
    },
  },
  combat: {
    weapons: {
      missile: {
        range: 8,
        progression: 2,
        damage: { min: 30, max: 50 },
        impactProbability: 0.75,
        autonomy: null,
        acquisitionRange: 0,
      },
      torpedo: {
        range: 4,
        progression: 1,
        damage: { min: 40, max: 60 },
        impactProbability: 0.7,
        autonomy: 6,
        acquisitionRange: 2,
      },
    },
    suspectZoneImpactPenalty: 0.25,
    projectileDetectionRange: 3,
  },
  detection: {
    zoneSize: 7,
    zoneMaxAttempts: 200,
    coastalSubmarineWatchBonus: 0.2,
    sweepNoiseWatchBonus: 0.2,
    fireNoiseWatchBonus: 0.2,
  },
  ai: { navalCombatStationColumnRatio: 0.5 },
  specialActions: {
    sweep: { cooldownCycles: 1 },
    fire_missile: { cooldownCycles: 0 },
    fire_torpedo: { cooldownCycles: 0 },
  },
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
