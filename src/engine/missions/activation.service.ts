import * as labelEngine from '../../shared/engine.label';
import type { GameConfig, SpecialActionKind } from '../config/game.config';
import { isOnCooldown } from '../units/special-action.service';
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
 *
 * Exemples : le porte-avions reçoit `NOT_ACTIVABLE` ; une frégate déjà activée `ALREADY_ACTIVATED` ;
 * si la FREMM est « en cours », la frégate DA reçoit `OTHER_ACTIVATION_IN_PROGRESS` alors que la
 * FREMM elle-même peut encore recevoir des ordres (`null`).
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

/** Pourquoi une unité ne peut pas utiliser une action spéciale maintenant (G-07.7, AB-30, AB-34). */
export type SpecialActionBlocker =
  OrderBlocker | 'SPECIAL_ACTION_USED' | 'ON_COOLDOWN' | 'NO_SENSORS';

/** Messages des motifs propres aux actions spéciales, en plus de ceux des ordres. */
export const SPECIAL_ACTION_BLOCKER_MESSAGES =
  labelEngine.specialActionBlockerMessages satisfies Record<
    Exclude<SpecialActionBlocker, OrderBlocker>,
    string
  >;

/**
 * Motif pour lequel l'unité ne peut pas utiliser l'action `kind` maintenant, ou `null` si elle le
 * peut. L'ordre des motifs est celui que le joueur peut corriger le plus vite : l'unité (peut-elle
 * recevoir un ordre ?), puis l'activation (action déjà faite ?), puis le délai de récupération,
 * puis le matériel (capteurs). La mission en cours est vérifiée par la commande.
 *
 * Exemple : une frégate qui a fait son balayage au cycle 3 reçoit `SPECIAL_ACTION_USED` au cycle 3
 * (action déjà faite pendant l'activation) et `ON_COOLDOWN` au cycle 4.
 */
export function specialActionBlocker(
  units: readonly Unit[],
  unit: Unit,
  kind: SpecialActionKind,
  cycle: number,
  config: GameConfig,
): SpecialActionBlocker | null {
  const orderReason = orderBlocker(units, unit);
  if (orderReason) return orderReason;
  if (unit.specialActionUsed) return 'SPECIAL_ACTION_USED';
  if (isOnCooldown(unit, kind, cycle, config)) return 'ON_COOLDOWN';
  return config.ships[unit.shipClass].detection === null ? 'NO_SENSORS' : null;
}
