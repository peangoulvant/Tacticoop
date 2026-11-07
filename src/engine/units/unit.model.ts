import type { GameConfig, ShipClass } from '../config/game.config';
import type { Hex } from '../map/hex.service';
import type { NavalCategory } from '../map/terrain.model';

export const SIDES = ['friend', 'hostile'] as const;
export type Side = (typeof SIDES)[number];

/**
 * État d'activation dans le cycle (SF-03.6). « En cours » commence au premier ordre exécuté
 * (SF-03.3). Le porte-avions et les unités hostiles ne reçoivent pas d'activation du joueur.
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
}

export interface UnitModifiers {
  /** Facteur appliqué aux dotations (missiles, torpilles), arrondi inférieur. */
  ammoFactor: number;
  /** Plafond de déplacement, ou null. Ne s'applique pas au porte-avions. */
  movementCap: number | null;
}

/** Seules les unités alliées autres que le porte-avions sont activées par le joueur (G-03.2.4). */
export function initialActivation(side: Side, category: NavalCategory): ActivationStatus {
  return side === 'friend' && category !== 'carrier' ? 'available' : 'not_activable';
}

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
  };
}
