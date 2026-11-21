import type { GameConfig } from '../config/game.config';
import type { MissionState } from '../core/game.types';
import { hexDistance, type Hex } from '../map/hex.service';
import type { Side } from '../units/unit.model';
import type { ObservedProjectile, Projectile } from './projectile.types';
import { torpedoTrajectory } from './trajectory.service';

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

/**
 * Tracé restant d'un projectile du camp, jusqu'à la case visée (AB-49 4). Une torpille qui suit sa
 * cible (`tracking`) a pour route interne le chemin vers la position **réelle** de la cible : le
 * montrer révélerait un navire non identifié. Le tracé reste alors celui qui mène à la case visée,
 * la dernière position connue ; il est vide si la torpille l'a dépassée ou ne la rejoint pas.
 */
function knownRoute(mission: MissionState, projectile: Projectile): Hex[] {
  if (!projectile.tracking) return projectile.route;
  return torpedoTrajectory(mission.map, projectile.position, projectile.aimedHex) ?? [];
}

/** Projectile tel que `side` le connaît : le tracé restant seulement pour ses propres projectiles. */
function toObserved(mission: MissionState, projectile: Projectile, side: Side): ObservedProjectile {
  return {
    id: projectile.id,
    weapon: projectile.weapon,
    side: projectile.side,
    position: projectile.position,
    route: projectile.side === side ? knownRoute(mission, projectile) : [],
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
    .map((p) => toObserved(mission, p, side));
}
