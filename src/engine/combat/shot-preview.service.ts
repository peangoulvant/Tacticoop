import type { GameConfig, WeaponKind } from '../config/game.config';
import type { MissionState } from '../core/game.types';
import { readContacts } from '../detection/side-contacts.service';
import { sameHex, type Hex } from '../map/hex.service';
import type { Unit } from '../units/unit.model';
import type { FireRefusal, ShotTarget } from './projectile.types';
import { planShot, type ShotPlanAccepted } from './shot-plan.service';

/*
 * Aperçu d'un tir (AB-45, AB-46) : ce que l'interface et l'IA peuvent savoir d'un tir avant de le
 * confirmer. Il enveloppe `planShot` sans jamais renvoyer le navire désigné (donnée interne), et y
 * ajoute les avertissements de ligne de tir. Il ne lit que les contacts du camp du tireur et les
 * unités de ce camp : rien de caché n'en sort.
 */

/** Avertissements de ligne de tir (AB-45) : un tir ami est possible, mais le tireur doit le savoir. */
export const SHOT_WARNINGS = ['FRIENDLY_ON_AIMED_HEX', 'FRIENDLY_ON_ROUTE'] as const;
export type ShotWarning = (typeof SHOT_WARNINGS)[number];

/** Tir envisageable : où il va, par où, et ce dont il faut prévenir le tireur. */
export interface ShotPreviewAccepted {
  ok: true;
  aimedHex: Hex;
  /** Cases jusqu'à la case visée, sans la case du tireur. */
  route: Hex[];
  onSuspectZone: boolean;
  warnings: ShotWarning[];
}

export type ShotPreview = ShotPreviewAccepted | { ok: false; reason: FireRefusal };

/** Une autre unité du camp du tireur occupe cette case. */
function friendlyAt(mission: MissionState, shooter: Unit, hex: Hex): boolean {
  return mission.units.some(
    (unit) => unit.side === shooter.side && unit.id !== shooter.id && sameHex(unit.position, hex),
  );
}

/**
 * Avertissements d'un tir accepté (AB-45). Un missile ne touche que l'unité de la case visée : on
 * avertit si une unité du camp l'occupe. Une torpille touche la première unité compatible de sa
 * route : on avertit si une unité du camp se trouve sur la route. Un navire hostile non identifié
 * ne déclenche jamais d'avertissement (brouillard de guerre).
 *
 * Exemple : une torpille dont la route passe par la case d'une frégate alliée : `FRIENDLY_ON_ROUTE`.
 */
function warningsOf(
  mission: MissionState,
  shooter: Unit,
  weapon: WeaponKind,
  plan: ShotPlanAccepted,
): ShotWarning[] {
  if (weapon === 'missile') {
    return friendlyAt(mission, shooter, plan.aimedHex) ? ['FRIENDLY_ON_AIMED_HEX'] : [];
  }
  return plan.route.some((hex) => friendlyAt(mission, shooter, hex)) ? ['FRIENDLY_ON_ROUTE'] : [];
}

/** Aperçu du tir de `shooter` avec `weapon` sur `target` : plan accepté et avertissements, ou refus. */
export function previewShot(
  mission: MissionState,
  shooter: Unit,
  weapon: WeaponKind,
  target: ShotTarget,
  config: GameConfig,
): ShotPreview {
  const plan = planShot(mission, shooter, weapon, target, config);
  if (!plan.ok) return plan;
  return {
    ok: true,
    aimedHex: plan.aimedHex,
    route: plan.route,
    onSuspectZone: plan.onSuspectZone,
    warnings: warningsOf(mission, shooter, weapon, plan),
  };
}

/** Un contact du camp et les cases qu'on peut y viser avec l'arme choisie. */
export interface ShotCandidate {
  contactId: string;
  kind: 'identified' | 'suspect';
  /** Case exacte d'un contact identifié, ou cases de la zone à portée (au moins une). */
  hexes: Hex[];
}

/**
 * Cases que `shooter` peut viser avec `weapon` parmi les contacts de son camp : contact identifié
 * du cycle courant, ou hexagones d'une zone suspecte, à portée et compatibles (AB-46). Sert à
 * surligner la carte pendant le brouillon ; un contact sans case visable n'y figure pas.
 */
export function shotCandidates(
  mission: MissionState,
  shooter: Unit,
  weapon: WeaponKind,
  config: GameConfig,
): ShotCandidate[] {
  const aimable = (contactId: string, hex?: Hex) =>
    previewShot(mission, shooter, weapon, { contactId, hex }, config).ok;
  return readContacts(mission, shooter.side).contacts.flatMap((contact): ShotCandidate[] => {
    if (contact.kind === 'identified') {
      return aimable(contact.id)
        ? [{ contactId: contact.id, kind: 'identified', hexes: [contact.position] }]
        : [];
    }
    const hexes = contact.zone.filter((hex) => aimable(contact.id, hex));
    return hexes.length > 0 ? [{ contactId: contact.id, kind: 'suspect', hexes }] : [];
  });
}
