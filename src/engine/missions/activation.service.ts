import * as labelEngine from '../../shared/engine.label';
import type { GameConfig } from '../config/game.config';
import type { Unit } from '../units/unit.model';

/** Pourquoi une unité ne peut pas recevoir d'ordre maintenant (SF-03.1, SF-03.8). */
export type OrderBlocker = 'NOT_ACTIVABLE' | 'ALREADY_ACTIVATED' | 'OTHER_ACTIVATION_IN_PROGRESS';

/** Pourquoi une unité ne peut pas se déplacer maintenant : un ordre impossible, ou déjà déplacée. */
export type MoveBlocker = OrderBlocker | 'ALREADY_MOVED';

/** Messages présentés au joueur, communs aux refus du moteur et à l'interface. */
export const BLOCKER_MESSAGES = labelEngine.moveBlockerMessages satisfies Record<
  MoveBlocker,
  string
>;

/**
 * Motif pour lequel l'unité ne peut pas recevoir d'ordre, ou `null` si elle le peut. Ne reçoivent
 * pas d'ordre : le porte-avions et les unités ennemies (non activables), une unité déjà activée
 * ce cycle, et toute unité tant qu'une autre est en cours d'activation (seule celle-ci reçoit des
 * ordres).
 */
export function orderBlocker(units: readonly Unit[], unit: Unit): OrderBlocker | null {
  if (unit.activation === 'not_activable') return 'NOT_ACTIVABLE';
  if (unit.activation === 'activated') return 'ALREADY_ACTIVATED';
  const otherEngaged = units.some((u) => u.id !== unit.id && u.activation === 'in_progress');
  return otherEngaged ? 'OTHER_ACTIVATION_IN_PROGRESS' : null;
}

/** Motif pour lequel l'unité ne peut pas se déplacer : un seul déplacement par activation (SF-03.1). */
export function moveBlocker(units: readonly Unit[], unit: Unit): MoveBlocker | null {
  return orderBlocker(units, unit) ?? (unit.hasMoved ? 'ALREADY_MOVED' : null);
}

/** Pourquoi une unité ne peut pas utiliser son action spéciale maintenant (G-07.7, AB-30). */
export type SpecialActionBlocker = OrderBlocker | 'SPECIAL_ACTION_USED' | 'NO_SENSORS';

/** Messages des motifs propres à l'action spéciale, en plus de ceux des ordres. */
export const SPECIAL_ACTION_BLOCKER_MESSAGES =
  labelEngine.specialActionBlockerMessages satisfies Record<
    Exclude<SpecialActionBlocker, OrderBlocker>,
    string
  >;

/**
 * Motif pour lequel l'unité ne peut pas lancer une recherche active, ou `null` si elle le peut :
 * elle doit pouvoir recevoir un ordre, ne pas avoir utilisé son action spéciale et porter des
 * capteurs (G-07.7). La mission en cours est vérifiée par la commande. L'ordre des motifs est
 * celui du joueur : l'unité d'abord, puis l'action, puis le matériel.
 */
export function specialActionBlocker(
  units: readonly Unit[],
  unit: Unit,
  config: GameConfig,
): SpecialActionBlocker | null {
  const orderReason = orderBlocker(units, unit);
  if (orderReason) return orderReason;
  if (unit.specialActionUsed) return 'SPECIAL_ACTION_USED';
  return config.ships[unit.shipClass].detection === null ? 'NO_SENSORS' : null;
}
