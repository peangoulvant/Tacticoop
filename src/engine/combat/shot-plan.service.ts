import type { GameConfig, WeaponKind } from '../config/game.config';
import type { MissionState } from '../core/game.types';
import type { Contact } from '../detection/contact.types';
import { readContacts } from '../detection/side-contacts.service';
import { hexDistance, sameHex, type Hex } from '../map/hex.service';
import type { Unit } from '../units/unit.model';
import type { FireRefusal, ShotTarget } from './projectile.types';
import { missileTrajectory, torpedoTrajectory } from './trajectory.service';

/*
 * Plan d'un tir (AB-45, AB-46, AB-47) : à partir d'un contact du camp, calcule la case visée, le
 * trajet et le navire désigné, ou le motif du refus. Calcul pur, sans effet : il sert à la
 * commande de tir et, plus tard, à l'aperçu de l'interface (tracé, avertissement de ligne de tir).
 */

/** Tir accepté : où il va, par où, et sur quoi il est désigné. */
export interface ShotPlanAccepted {
  ok: true;
  aimedHex: Hex;
  /** Cases jusqu'à la case visée, sans la case du tireur. */
  route: Hex[];
  /** Navire désigné (donnée interne) : seulement pour un contact identifié et une torpille. */
  targetId: string | null;
  onSuspectZone: boolean;
}

export type ShotPlan = ShotPlanAccepted | { ok: false; reason: FireRefusal };

/** Cible résolue : la case visée et ce qu'on en sait. */
type ResolvedTarget =
  | { ok: true; aimedHex: Hex; contact: Contact; onSuspectZone: boolean }
  | { ok: false; reason: FireRefusal };

/**
 * Retrouve le contact du camp du tireur et la case visée (AB-46) : un contact identifié du cycle
 * courant (position exacte) ou un hexagone d'une zone suspecte ; un contact identifié ancien est
 * refusé tant qu'il n'a pas été rebalayé.
 */
function resolveTarget(mission: MissionState, unit: Unit, target: ShotTarget): ResolvedTarget {
  const contact = readContacts(mission, unit.side).contacts.find((c) => c.id === target.contactId);
  if (!contact) return { ok: false, reason: 'UNKNOWN_CONTACT' };
  if (contact.kind === 'identified') {
    return contact.cycle < mission.cycle
      ? { ok: false, reason: 'STALE_CONTACT' }
      : { ok: true, aimedHex: contact.position, contact, onSuspectZone: false };
  }
  if (!target.hex) return { ok: false, reason: 'ZONE_HEX_REQUIRED' };
  const chosen = target.hex;
  return contact.zone.some((hex) => sameHex(hex, chosen))
    ? { ok: true, aimedHex: chosen, contact, onSuspectZone: true }
    : { ok: false, reason: 'HEX_NOT_IN_ZONE' };
}

/**
 * Un missile touche les navires de surface ; il est refusé contre un contact identifié « sous-marin ».
 * Une torpille touche tous les navires (AB-46). Sur une zone, le type est inconnu : aucun refus.
 */
function isCompatibleTarget(weapon: WeaponKind, resolved: ResolvedTarget & { ok: true }): boolean {
  const { contact } = resolved;
  return !(weapon === 'missile' && contact.kind === 'identified' && contact.targetType === 'submarine');
}

/** Trajet de l'arme jusqu'à la case visée, ou `null` (torpille sans chemin maritime ou trop long). */
function routeOf(
  mission: MissionState,
  unit: Unit,
  weapon: WeaponKind,
  aimedHex: Hex,
  config: GameConfig,
): Hex[] | null {
  if (weapon === 'missile') return missileTrajectory(unit.position, aimedHex);
  const route = torpedoTrajectory(mission.map, unit.position, aimedHex);
  const { autonomy } = config.combat.weapons.torpedo;
  return route && (autonomy === null || route.length <= autonomy) ? route : null;
}

/**
 * Plan du tir de `unit` avec `weapon` sur `target`. Ne contrôle ni l'activation ni le stock (motifs
 * d'ordre et d'action spéciale, `specialActionBlocker`) : seulement la cible, la portée et le trajet.
 *
 * Exemple : une torpille sur un contact identifié à 3 hexagones, relié par l'eau, est acceptée ;
 * le même tir contre une île est refusé `NO_MARITIME_PATH`.
 */
export function planShot(
  mission: MissionState,
  unit: Unit,
  weapon: WeaponKind,
  target: ShotTarget,
  config: GameConfig,
): ShotPlan {
  const resolved = resolveTarget(mission, unit, target);
  if (!resolved.ok) return resolved;
  const { aimedHex, contact, onSuspectZone } = resolved;
  if (sameHex(aimedHex, unit.position)) return { ok: false, reason: 'SAME_HEX' };
  if (!isCompatibleTarget(weapon, resolved)) return { ok: false, reason: 'INCOMPATIBLE_TARGET' };
  if (hexDistance(unit.position, aimedHex) > config.combat.weapons[weapon].range) {
    return { ok: false, reason: 'OUT_OF_RANGE' };
  }
  const route = routeOf(mission, unit, weapon, aimedHex, config);
  if (!route) return { ok: false, reason: 'NO_MARITIME_PATH' };
  // Tir sur zone : aucun navire désigné, sinon l'autodirecteur révélerait la cible réelle (AB-47).
  const targetId = weapon === 'torpedo' && !onSuspectZone ? contact.source : null;
  return { ok: true, aimedHex, route, targetId, onSuspectZone };
}
