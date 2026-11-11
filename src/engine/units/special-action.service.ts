import type { GameConfig, SpecialActionKind } from '../config/game.config';
import type { Unit } from './unit.model';

/**
 * Délais de récupération des actions spéciales (AB-34). Le moteur retient, pour chaque unité, le
 * cycle du dernier usage de chaque action (`Unit.lastSpecialActionCycle`) ; tout le reste se
 * déduit de ce numéro de cycle et de la configuration. Ajouter une action spéciale ne demande
 * donc aucun code ici : un nouveau `SpecialActionKind` et son `cooldownCycles` suffisent.
 */

/** Enregistre l'usage d'une action pendant le cycle donné ; renvoie une nouvelle unité. */
export function recordSpecialAction(unit: Unit, kind: SpecialActionKind, cycle: number): Unit {
  return { ...unit, lastSpecialActionCycle: { ...unit.lastSpecialActionCycle, [kind]: cycle } };
}

/**
 * Premier cycle où l'action est de nouveau possible : le cycle suivant l'usage, plus le délai.
 * Une action jamais utilisée est possible dès le cycle 1.
 *
 * Exemple avec `cooldownCycles = 1` : usage au cycle 3, de nouveau possible au cycle 5
 * (le cycle 4 est la récupération).
 */
export function availableFromCycle(
  unit: Unit,
  kind: SpecialActionKind,
  config: GameConfig,
): number {
  const lastUse = unit.lastSpecialActionCycle[kind];
  return lastUse === undefined ? 1 : lastUse + 1 + config.specialActions[kind].cooldownCycles;
}

/** L'action est en récupération au cycle donné. */
export function isOnCooldown(
  unit: Unit,
  kind: SpecialActionKind,
  cycle: number,
  config: GameConfig,
): boolean {
  return cycle < availableFromCycle(unit, kind, config);
}

/**
 * L'unité a utilisé cette action pendant le cycle donné. Sert au bruit du balayage : l'émission
 * active rend l'unité plus facile à détecter par la veille de fin de ce même cycle (AB-33).
 */
export function usedActionDuringCycle(unit: Unit, kind: SpecialActionKind, cycle: number): boolean {
  return unit.lastSpecialActionCycle[kind] === cycle;
}
