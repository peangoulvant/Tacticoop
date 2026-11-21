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
 * Validation des projectiles en vol et des pertes d'une sauvegarde (AB-47, AB-48) : un projectile
 * lu dans le stockage n'est jamais fiable avant ces contrôles (PERSISTANCE.md).
 */

/** Cap d'une torpille : l'une des six directions vers un voisin (axial), ou `null` avant son premier pas. */
function isHeading(value: unknown): boolean {
  if (value === null) return true;
  return (
    isRecord(value) &&
    engine.AXIAL_DIRECTIONS.some((direction) => direction.q === value.q && direction.r === value.r)
  );
}

/** Identité du projectile : numéro de lancement, arme, camp, tireur. */
function checkProjectileIdentity(p: Json): Problem {
  if (!isPositive(p.launchNumber) || p.id !== `P-${String(p.launchNumber)}`) {
    return 'identifiant de projectile invalide';
  }
  if (!isOneOf(engine.WEAPON_KINDS, p.weapon)) return `arme inconnue pour ${String(p.id)}`;
  if (!isOneOf(engine.SIDES, p.side)) return `camp inconnu pour ${String(p.id)}`;
  return typeof p.launcherId === 'string' && isPositive(p.launchCycle)
    ? null
    : `tireur invalide pour ${String(p.id)}`;
}

/** Position, case visée et trajet restant : tous sur la carte. */
function checkProjectileGeometry(p: Json, map: engine.GameMap): Problem {
  const valid =
    isHexOn(map, p.position) &&
    isHexOn(map, p.aimedHex) &&
    Array.isArray(p.route) &&
    p.route.every((hex) => isHexOn(map, hex));
  return valid ? null : `trajectoire invalide pour ${String(p.id)}`;
}

/** Le trajet restant est une chaîne de cases voisines, qui part d'un voisin de la position. */
function isContinuousRoute(p: Json): boolean {
  const cells = [p.position, ...(p.route as engine.Hex[])] as engine.Hex[];
  return cells.every((hex, i) => i === 0 || engine.hexDistance(cells[i - 1]!, hex) === 1);
}

/** Types des champs communs : cible désignée, drapeaux, cap, autonomie. */
function checkProjectileFields(p: Json): Problem {
  const target = p.targetId === null || typeof p.targetId === 'string';
  const flags =
    typeof p.onSuspectZone === 'boolean' &&
    typeof p.tracking === 'boolean' &&
    typeof p.detected === 'boolean';
  const autonomy = p.autonomyLeft === null || isCount(p.autonomyLeft);
  return target && flags && autonomy && isHeading(p.heading)
    ? null
    : `état invalide pour ${String(p.id)}`;
}

/**
 * Invariants d'un missile (AB-47) : ligne droite jusqu'à la case visée, ni cap, ni autonomie, ni
 * autodirecteur, ni cible désignée. Un missile sans trajet restant a déjà disparu.
 */
function isConsistentMissile(p: Json): boolean {
  const route = p.route as engine.Hex[];
  const last = route[route.length - 1];
  return (
    route.length > 0 &&
    !!last &&
    engine.sameHex(last, p.aimedHex as engine.Hex) &&
    p.heading === null &&
    p.autonomyLeft === null &&
    p.tracking === false &&
    p.targetId === null
  );
}

/**
 * Invariants d'une torpille (AB-47) : une autonomie restante positive (à zéro elle a disparu) et
 * bornée par celle de l'arme ; sans trajet restant elle a un cap ; un tir sur zone n'a aucune cible
 * désignée ; l'autodirecteur ne suit qu'une cible désignée et après un premier pas.
 */
function isConsistentTorpedo(p: Json): boolean {
  const { autonomy } = engine.defaultConfig.combat.weapons.torpedo;
  const left = p.autonomyLeft;
  const autonomyValid = isPositive(left) && (autonomy === null || (left as number) <= autonomy);
  const hasPath = (p.route as engine.Hex[]).length > 0 || p.heading !== null;
  const zoneValid = !p.onSuspectZone || p.targetId === null;
  const trackingValid = !p.tracking || (p.targetId !== null && p.heading !== null);
  return autonomyValid && hasPath && zoneValid && trackingValid;
}

/** Cohérence du projectile avec son arme et continuité de son trajet. */
function checkProjectileState(p: Json): Problem {
  const fields = checkProjectileFields(p);
  if (fields) return fields;
  const consistent = p.weapon === 'missile' ? isConsistentMissile(p) : isConsistentTorpedo(p);
  return consistent && isContinuousRoute(p) ? null : `état incohérent pour ${String(p.id)}`;
}

function checkProjectile(projectile: unknown, map: engine.GameMap): Problem {
  if (!isRecord(projectile)) return 'projectile illisible';
  return firstProblem([
    () => checkProjectileIdentity(projectile),
    () => checkProjectileGeometry(projectile, map),
    () => checkProjectileState(projectile),
  ]);
}

/** Pertes : un navire détruit n'est plus une unité, et n'est consigné qu'une fois. */
function checkLosses(state: Json): Problem {
  const { losses, units } = state;
  if (!Array.isArray(losses)) return 'pertes illisibles';
  const live = new Set((units as engine.Unit[]).map((u) => u.id));
  const valid = losses.every(
    (l) =>
      isRecord(l) &&
      typeof l.unitId === 'string' &&
      !live.has(l.unitId) &&
      isOneOf(engine.SIDES, l.side) &&
      isShipClass(l.shipClass) &&
      isPositive(l.cycle),
  );
  if (!valid) return 'perte invalide';
  return new Set(losses.map((l: Json) => l.unitId)).size === losses.length
    ? null
    : 'pertes en double';
}

/** Projectiles : formes valides, identifiants uniques, compteur de lancement supérieur à chacun. */
function checkProjectiles(state: Json, map: engine.GameMap): Problem {
  const { projectiles, nextLaunchNumber } = state;
  if (!Array.isArray(projectiles)) return 'projectiles illisibles';
  if (!isPositive(nextLaunchNumber)) return 'compteur de lancement invalide';
  const invalid = projectiles.map((p) => checkProjectile(p, map)).find((problem) => problem);
  if (invalid) return invalid;
  const numbers = (projectiles as Json[]).map((p) => p.launchNumber as number);
  if (new Set(numbers).size !== numbers.length) return 'projectiles en double';
  return numbers.every((n) => n < nextLaunchNumber) ? null : 'compteur de lancement incohérent';
}

/** Projectiles en vol et pertes. */
export function checkCombat(state: Json, map: engine.GameMap): Problem {
  return checkProjectiles(state, map) ?? checkLosses(state);
}
