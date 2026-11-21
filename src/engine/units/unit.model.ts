import type { GameConfig, ShipClass, SpecialActionKind } from '../config/game.config';
import { sameHex, type Hex } from '../map/hex.service';
import type { NavalCategory } from '../map/terrain.model';

export const SIDES = ['friend', 'hostile'] as const;
export type Side = (typeof SIDES)[number];

/**
 * État d'activation dans le cycle (SF-03.6). « En cours » commence au premier ordre exécuté
 * (SF-03.3). Le porte-avions n'est pas activable. Une unité hostile est activée par l'IA, jamais
 * par le joueur (AB-39) ; une unité hostile n'est jamais « en cours » entre deux décisions du
 * joueur, car sa réaction est résolue entièrement.
 */
export const ACTIVATION_STATUSES = [
  'available',
  'in_progress',
  'activated',
  'not_activable',
] as const;
export type ActivationStatus = (typeof ACTIVATION_STATUSES)[number];

/**
 * Unité navale : seulement l'état courant. Les caractéristiques fixes de sa classe (PV maximum,
 * catégorie de navigation, coût…) restent dans `GameConfig.ships[shipClass]` (`ShipSpec`).
 */
export interface Unit {
  id: string;
  side: Side;
  shipClass: ShipClass;
  position: Hex;
  hp: number;
  /** Déplacement maximal par activation, en hexagones, contraintes initiales comprises. */
  movement: number;
  /** Stocks courants, dotation initiale comprise après contraintes. */
  missiles: number;
  torpedoes: number;
  /** Hélicoptères embarqués (un seul utilisable à la fois : règle de D-03, non gérée ici). */
  helicopters: number;
  activation: ActivationStatus;
  /** Un déplacement a déjà été exécuté pendant l'activation en cours (un seul par activation). */
  hasMoved: boolean;
  /** L'action spéciale de l'activation en cours est consommée (une par activation, G-07.1). */
  specialActionUsed: boolean;
  /**
   * Cycle du dernier usage de chaque action spéciale ; sert au délai de récupération et au bruit
   * du balayage (AB-33, AB-34). Une action jamais utilisée n'a pas d'entrée.
   */
  lastSpecialActionCycle: Partial<Record<SpecialActionKind, number>>;
}

export interface UnitModifiers {
  /** Facteur appliqué aux dotations (missiles, torpilles), arrondi inférieur. */
  ammoFactor: number;
  /** Plafond de déplacement, ou null. Ne s'applique pas au porte-avions. */
  movementCap: number | null;
}

/**
 * Toute unité navale hors porte-avions est activable (G-03.2.4) : les alliées par le joueur, les
 * hostiles par l'IA (AB-39). Exemple : une frégate hostile commence disponible, le porte-avions
 * allié non.
 */
export function initialActivation(_side: Side, category: NavalCategory): ActivationStatus {
  return category === 'carrier' ? 'not_activable' : 'available';
}

/**
 * Crée une unité à sa dotation de départ, d'après la fiche de sa classe dans `GameConfig` et les
 * contraintes de la mission.
 *
 * Exemple : une frégate DA (6 missiles) avec « Stocks de munitions limités » (facteur 0,7) reçoit
 * 4 missiles (6 × 0,7 = 4,2 arrondi à l'inférieur) ; avec « Météo défavorable » son déplacement de
 * 3 est plafonné à 2. Le porte-avions n'est jamais plafonné.
 */
export function createUnit(
  id: string,
  side: Side,
  shipClass: ShipClass,
  position: Hex,
  config: GameConfig,
  modifiers: UnitModifiers,
): Unit {
  const spec = config.ships[shipClass];
  const capped =
    modifiers.movementCap !== null && spec.category !== 'carrier'
      ? Math.min(spec.movement, modifiers.movementCap)
      : spec.movement;
  return {
    id,
    side,
    shipClass,
    position,
    hp: spec.maxHp,
    movement: capped,
    missiles: Math.floor(spec.missiles * modifiers.ammoFactor),
    torpedoes: Math.floor(spec.torpedoes * modifiers.ammoFactor),
    helicopters: spec.helicopters,
    activation: initialActivation(side, spec.category),
    hasMoved: false,
    specialActionUsed: false,
    lastSpecialActionCycle: {},
  };
}

/**
 * Unité en jeu sur la case donnée, ou `undefined` (une seule unité navale par hexagone, SF-02).
 * Exemple : `unitAt(units, { col: 4, row: 2 })` rend la frégate qui s'y trouve.
 */
export function unitAt(units: readonly Unit[], hex: Hex): Unit | undefined {
  return units.find((unit) => sameHex(unit.position, hex));
}
