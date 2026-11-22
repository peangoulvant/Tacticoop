import type { ComponentKind, GameConfig, WeaponKind } from '../config/game.config';
import type { Rng } from '../core/rng.service';
import { randomInt } from '../core/rng.service';
import { COMPONENT_KINDS } from '../config/game.config';
import { isDisabled, type Unit } from '../units/unit.model';
import type { Projectile } from './projectile.types';

/*
 * Impact d'un projectile sur une unité (G-09 §3.2, AB-46, AB-47) : compatibilité, tirage de
 * l'impact, tirage des dégâts dans la plage de l'arme, destruction à zéro PV ou, sinon, tirage d'une
 * panne de composant (lot 2, AB-54).
 */

/** Résultat d'une tentative d'impact. */
export type ImpactResult = 'missed' | 'hit' | 'destroyed';

/** Un missile touche les navires de surface ; une torpille touche tous les navires (AB-46). */
export function isCompatible(weapon: WeaponKind, unit: Unit, config: GameConfig): boolean {
  return weapon === 'torpedo' || config.ships[unit.shipClass].category !== 'submarine';
}

/** Probabilité d'impact : celle de l'arme, moins la pénalité d'un tir sur zone suspecte (AB-47). */
export function impactProbability(projectile: Projectile, config: GameConfig): number {
  const base = config.combat.weapons[projectile.weapon].impactProbability;
  return Math.max(
    0,
    base - (projectile.onSuspectZone ? config.combat.suspectZoneImpactPenalty : 0),
  );
}

/** Dégâts tirés uniformément dans la plage de l'arme, bornes comprises. Exemple : 30 à 50 PV. */
function drawDamage(weapon: WeaponKind, config: GameConfig, rng: Rng): number {
  const { min, max } = config.combat.weapons[weapon].damage;
  return min + randomInt(rng, max - min + 1);
}

/**
 * Panne éventuelle après un impact réussi qui laisse l'unité en vie (G-09 §3.2) : un tirage à la
 * probabilité de l'arme, toujours effectué ; s'il réussit, le composant est choisi au hasard parmi
 * ceux encore fonctionnels. Au plus un composant tombe en panne ; si tous le sont déjà, rien ne se
 * passe. Exemple : propulsion déjà hors service, il reste capteurs, armement et coque.
 */
function drawComponentFailure(
  weapon: WeaponKind,
  unit: Unit,
  config: GameConfig,
  rng: Rng,
): ComponentKind | null {
  const failed = rng() < config.combat.weapons[weapon].componentFailureProbability;
  const working = COMPONENT_KINDS.filter((kind) => !isDisabled(unit, kind));
  return failed && working.length > 0 ? (working[randomInt(rng, working.length)] ?? null) : null;
}

/**
 * Tente l'impact de `projectile` sur `unit` : un tirage d'impact, puis, en cas de réussite, un
 * tirage de dégâts et, si l'unité survit, un tirage de panne. Renvoie le résultat, l'unité mise à
 * jour (`null` si détruite, G-09-C4) et le composant mis hors service, s'il y en a un. Une unité
 * détruite n'a aucun traitement de composant (G-09 §3.2.6). Le tirage d'impact et le tirage de
 * panne sont toujours effectués, même à probabilité 0 ou 1 : la suite du hasard ne dépend pas de
 * la configuration.
 */
export function attemptImpact(
  projectile: Projectile,
  unit: Unit,
  config: GameConfig,
  rng: Rng,
): { result: ImpactResult; unit: Unit | null; disabled: ComponentKind | null } {
  if (rng() >= impactProbability(projectile, config)) {
    return { result: 'missed', unit, disabled: null };
  }
  const hp = unit.hp - drawDamage(projectile.weapon, config, rng);
  if (hp <= 0) return { result: 'destroyed', unit: null, disabled: null };
  const disabled = drawComponentFailure(projectile.weapon, unit, config, rng);
  const disabledComponents = disabled
    ? [...unit.disabledComponents, disabled]
    : unit.disabledComponents;
  return { result: 'hit', unit: { ...unit, hp, disabledComponents }, disabled };
}
