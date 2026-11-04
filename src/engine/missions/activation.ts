import type { Unit } from '../units/unit';

/** Pourquoi une unité ne peut pas recevoir d'ordre maintenant (SF-03.1, SF-03.8). */
export type OrderBlocker = 'NOT_ACTIVABLE' | 'ALREADY_ACTIVATED' | 'OTHER_ACTIVATION_IN_PROGRESS';

/** Pourquoi une unité ne peut pas se déplacer maintenant : un ordre impossible, ou déjà déplacée. */
export type MoveBlocker = OrderBlocker | 'ALREADY_MOVED';

/** Messages présentés au joueur, communs aux refus du moteur et à l'interface. */
export const BLOCKER_MESSAGES: Record<MoveBlocker, string> = {
  NOT_ACTIVABLE: 'Cette unité ne reçoit pas d’activation.',
  ALREADY_ACTIVATED: 'Cette unité a déjà été activée pendant ce cycle.',
  OTHER_ACTIVATION_IN_PROGRESS: 'Une autre unité est en cours d’activation : terminez-la d’abord.',
  ALREADY_MOVED: 'Cette unité s’est déjà déplacée pendant son activation.',
};

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
