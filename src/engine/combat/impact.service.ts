import type { GameConfig, WeaponKind } from '../config/game.config';
import type { MissionState } from '../core/game.types';
import type { Rng } from '../core/rng.service';
import { randomInt } from '../core/rng.service';
import type { Unit } from '../units/unit.model';
import type { Projectile } from './projectile.types';

/*
 * Impact d'un projectile sur une unité (G-09 §3.2, AB-46, AB-47) : compatibilité, tirage de
 * l'impact, tirage des dégâts dans la plage de l'arme, puis destruction à zéro PV. Les composants
 * (pannes) viendront au lot 2.
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
  return Math.max(0, base - (projectile.onSuspectZone ? config.combat.suspectZoneImpactPenalty : 0));
}

/** Dégâts tirés uniformément dans la plage de l'arme, bornes comprises. Exemple : 30 à 50 PV. */
function drawDamage(weapon: WeaponKind, config: GameConfig, rng: Rng): number {
  const { min, max } = config.combat.weapons[weapon].damage;
  return min + randomInt(rng, max - min + 1);
}

/**
 * Tente l'impact de `projectile` sur `unit` : un tirage d'impact, puis, en cas de réussite, un
 * tirage de dégâts. Renvoie le résultat et l'unité mise à jour (`null` si détruite, G-09-C4).
 * Le tirage d'impact est toujours effectué, même à probabilité 0 ou 1 : la suite du hasard ne
 * dépend pas de la configuration.
 */
export function attemptImpact(
  projectile: Projectile,
  unit: Unit,
  config: GameConfig,
  rng: Rng,
): { result: ImpactResult; unit: Unit | null } {
  if (rng() >= impactProbability(projectile, config)) return { result: 'missed', unit };
  const hp = unit.hp - drawDamage(projectile.weapon, config, rng);
  return hp > 0 ? { result: 'hit', unit: { ...unit, hp } } : { result: 'destroyed', unit: null };
}

/** Unité en jeu sur la case donnée (une seule unité navale par hexagone, SF-02). */
export function unitAt(mission: MissionState, hex: { col: number; row: number }): Unit | undefined {
  return mission.units.find((u) => u.position.col === hex.col && u.position.row === hex.row);
}
