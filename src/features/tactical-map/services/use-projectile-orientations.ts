import { useState } from 'react';
import * as engine from '../../../engine';
import { nextOrientations, type OrientationMemory } from './projectile-orientation.service';

/**
 * Sens de marche observé des projectiles (icônes orientées, voir `nextOrientations`). Il se dérive
 * pendant le rendu, d'après la liste de projectiles du rendu précédent : une nouvelle liste donne
 * de nouveaux sens, sans effet de bord ni rendu supplémentaire visible.
 */
export function useProjectileOrientations(
  projectiles: readonly engine.ObservedProjectile[],
): ReadonlyMap<string, OrientationMemory> {
  const [seen, setSeen] = useState<{
    source: readonly engine.ObservedProjectile[] | null;
    orientations: ReadonlyMap<string, OrientationMemory>;
  }>({ source: null, orientations: new Map() });
  if (seen.source === projectiles) return seen.orientations;
  const orientations = nextOrientations(seen.orientations, projectiles);
  setSeen({ source: projectiles, orientations });
  return orientations;
}
