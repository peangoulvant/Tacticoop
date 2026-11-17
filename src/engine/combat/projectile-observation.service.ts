import type { GameConfig } from '../config/game.config';
import type { MissionState } from '../core/game.types';
import { hexDistance } from '../map/hex.service';
import type { Side } from '../units/unit.model';
import type { ObservedProjectile, Projectile } from './projectile.types';

/*
 * Ce qu'un camp sait des projectiles (AB-49). Les siens sont toujours connus, avec leur tracé
 * restant. Un projectile adverse est identifié d'office, sans tirage ni capteurs, dès qu'il passe à
 * `projectileDetectionRange` hexagones d'une unité du camp, porte-avions compris : seulement son
 * arme et sa position exacte. Jamais sa cible désignée (donnée interne), ni son lanceur, ni la
 * suite de sa trajectoire.
 */

/** Une unité du camp est assez proche du projectile pour l'identifier. */
function isIdentifiedBy(
  mission: MissionState,
  projectile: Projectile,
  side: Side,
  config: GameConfig,
): boolean {
  return mission.units.some(
    (unit) =>
      unit.side === side &&
      hexDistance(unit.position, projectile.position) <= config.combat.projectileDetectionRange,
  );
}

/** Projectile tel que `side` le connaît : le tracé restant seulement pour ses propres projectiles. */
function toObserved(projectile: Projectile, side: Side): ObservedProjectile {
  return {
    id: projectile.id,
    weapon: projectile.weapon,
    side: projectile.side,
    position: projectile.position,
    route: projectile.side === side ? projectile.route : [],
  };
}

/** Projectiles que `side` connaît, dans l'ordre fixe du numéro de lancement (G-09.10.1). */
export function observedProjectiles(
  mission: MissionState,
  side: Side,
  config: GameConfig,
): ObservedProjectile[] {
  return [...mission.projectiles]
    .sort((a, b) => a.launchNumber - b.launchNumber)
    .filter((p) => p.side === side || isIdentifiedBy(mission, p, side, config))
    .map((p) => toObserved(p, side));
}
