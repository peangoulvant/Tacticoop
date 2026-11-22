import * as engine from '../../../engine';
import { hexCenter } from './hex-geometry.service';

/*
 * Orientation des icônes de projectile : le sens de marche **observé**. Une icône pointe là où le
 * projectile est allé depuis la dernière fois que le joueur l'a vu (sa position précédente), ce
 * qui ne révèle rien de plus que sa position. Le tracé annoncé par le moteur n'est qu'un repli
 * pour un projectile qu'on voit pour la première fois : une torpille qui suit sa cible ne va pas
 * toujours là où son tracé (jusqu'à la dernière position connue) l'indique.
 */

/** Ce que l'on retient d'un projectile entre deux affichages : où il était, et son sens de marche. */
export interface HeadingMemory {
  position: engine.Hex;
  /** Degrés, 0 = vers la droite de l'écran ; `null` tant qu'aucun sens n'est connu. */
  degrees: number | null;
}

/** Angle (degrés, 0 = vers la droite) du segment entre les centres de deux cases. */
function angleBetween(from: engine.Hex, to: engine.Hex): number {
  const a = hexCenter(from);
  const b = hexCenter(to);
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
}

/**
 * Sens de marche de chaque projectile connu, après l'affichage précédent : déplacé depuis, le
 * sens du déplacement ; immobile, le sens retenu ; vu pour la première fois, le sens de son tracé
 * (projectile allié) ou aucun (projectile hostile identifié d'office). Les projectiles disparus
 * sont oubliés.
 *
 * Exemple : un missile hostile vu en (5, 3) puis en (3, 3) : il va vers la gauche (180°).
 */
export function nextHeadings(
  previous: ReadonlyMap<string, HeadingMemory>,
  projectiles: readonly engine.ObservedProjectile[],
): Map<string, HeadingMemory> {
  const next = new Map<string, HeadingMemory>();
  for (const projectile of projectiles) {
    const before = previous.get(projectile.id);
    const nextStep = projectile.route[0];
    let degrees: number | null = before?.degrees ?? null;
    if (before && !engine.sameHex(before.position, projectile.position)) {
      degrees = angleBetween(before.position, projectile.position);
    } else if (!before && nextStep) {
      degrees = angleBetween(projectile.position, nextStep);
    }
    next.set(projectile.id, { position: projectile.position, degrees });
  }
  return next;
}
