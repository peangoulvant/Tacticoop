import * as engine from '../../engine';
import {
  firstProblem,
  isCount,
  isHexOn,
  isOneOf,
  isPositive,
  isRecord,
  isShipClass,
  type Json,
  type Problem,
} from './guards.validator';

/*
 * Validation des unités d'une sauvegarde : identité, valeurs, unicité, porte-avions. Les valeurs
 * lues dans le stockage ne sont jamais fiables avant ces contrôles (PERSISTANCE.md).
 */

function checkUnitIdentity(unit: Json): Problem {
  if (typeof unit.id !== 'string' || unit.id === '') return 'identifiant d’unité invalide';
  if (!isOneOf(engine.SIDES, unit.side)) return `camp inconnu pour l’unité ${unit.id}`;
  return isShipClass(unit.shipClass) ? null : `classe de bâtiment inconnue pour l’unité ${unit.id}`;
}

const UNIT_COUNTERS = ['hp', 'movement', 'missiles', 'torpedoes', 'helicopters'] as const;

/** Cycle du dernier usage de chaque action spéciale : une action connue, un cycle positif (AB-34). */
function checkSpecialActionCycles(unit: Json): Problem {
  const cycles = unit.lastSpecialActionCycle;
  if (!isRecord(cycles))
    return `usages d’actions spéciales illisibles pour l’unité ${String(unit.id)}`;
  const valid = Object.entries(cycles).every(
    ([kind, cycle]) => isOneOf(engine.SPECIAL_ACTION_KINDS, kind) && isPositive(cycle),
  );
  return valid ? null : `usages d’actions spéciales invalides pour l’unité ${String(unit.id)}`;
}

/** Composants hors service : une liste de composants connus, sans doublon (AB-54). */
function checkDisabledComponents(unit: Json): Problem {
  const list = unit.disabledComponents;
  const valid =
    Array.isArray(list) &&
    list.every((kind) => isOneOf(engine.COMPONENT_KINDS, kind)) &&
    new Set(list).size === list.length;
  return valid ? null : `composants hors service invalides pour l’unité ${String(unit.id)}`;
}

/** État d'activation et drapeaux : activation connue, déplacement et action spéciale booléens. */
function checkActivationFlags(unit: Json): Problem {
  if (!isOneOf(engine.ACTIVATION_STATUSES, unit.activation)) return 'état d’activation inconnu';
  if (typeof unit.hasMoved !== 'boolean') return 'état de déplacement illisible';
  return typeof unit.specialActionUsed === 'boolean' ? null : 'état de l’action spéciale illisible';
}

function checkUnitState(unit: Json, map: engine.GameMap): Problem {
  if (!isHexOn(map, unit.position)) return `unité ${String(unit.id)} hors de la carte`;
  if (!UNIT_COUNTERS.every((key) => isCount(unit[key]))) {
    return `valeurs numériques invalides pour l’unité ${String(unit.id)}`;
  }
  return (
    checkActivationFlags(unit) ?? checkSpecialActionCycles(unit) ?? checkDisabledComponents(unit)
  );
}

function checkUnit(unit: unknown, map: engine.GameMap): Problem {
  if (!isRecord(unit)) return 'unité illisible';
  return checkUnitIdentity(unit) ?? checkUnitState(unit, map);
}

function checkUniqueness(units: readonly engine.Unit[]): Problem {
  if (new Set(units.map((u) => u.id)).size !== units.length)
    return 'identifiants d’unité en double';
  const cells = new Set(units.map((u) => `${u.position.col},${u.position.row}`));
  return cells.size === units.length ? null : 'deux unités sur la même case';
}

/** Le porte-avions existe, une seule fois, si et seulement si la mission est une escorte. */
function checkCarrierPresence(units: readonly engine.Unit[], escort: boolean): Problem {
  const carriers = units.filter((u) => u.shipClass === 'carrier').length;
  return carriers === (escort ? 1 : 0) ? null : 'porte-avions incohérent avec la mission';
}

/** Une sauvegarde n'est faite qu'entre deux séquences complètes (PERSISTANCE.md). */
function checkNoActivationInProgress(units: readonly engine.Unit[]): Problem {
  return units.some((u) => u.activation === 'in_progress')
    ? 'activation en cours : sauvegarde incomplète'
    : null;
}

export function checkUnits(state: Json, map: engine.GameMap, escort: boolean): Problem {
  const units = state.units;
  if (!Array.isArray(units)) return 'unités illisibles';
  const first = units.map((unit) => checkUnit(unit, map)).find((problem) => problem !== null);
  if (first) return first;
  const valid = units as engine.Unit[];
  return firstProblem([
    () => checkUniqueness(valid),
    () => checkCarrierPresence(valid, escort),
    () => checkNoActivationInProgress(valid),
  ]);
}
