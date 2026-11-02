import type { GameConfig, ShipClass } from '../config/gameConfig';
import type { Hex } from '../map/hex';
import type { NavalCategory } from '../map/terrain';

export type Side = 'friend' | 'hostile';

/** Unité navale. L'état courant (PV, stocks) est la seule copie : l'UI ne le duplique pas. */
export interface Unit {
  id: string;
  side: Side;
  shipClass: ShipClass;
  category: NavalCategory;
  position: Hex;
  hp: number;
  maxHp: number;
  /** Déplacement maximal par activation, en hexagones. */
  movement: number;
  missiles: number;
  torpedoes: number;
  /** Hélicoptères embarqués (un seul utilisable à la fois : règle de D-03, non gérée ici). */
  helicopters: number;
}

export interface UnitModifiers {
  /** Facteur appliqué aux dotations (missiles, torpilles), arrondi inférieur. */
  ammoFactor: number;
  /** Plafond de déplacement, ou null. Ne s'applique pas au porte-avions. */
  movementCap: number | null;
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
    category: spec.category,
    position,
    hp: spec.maxHp,
    maxHp: spec.maxHp,
    movement: capped,
    missiles: Math.floor(spec.missiles * modifiers.ammoFactor),
    torpedoes: Math.floor(spec.torpedoes * modifiers.ammoFactor),
    helicopters: spec.helicopters,
  };
}
