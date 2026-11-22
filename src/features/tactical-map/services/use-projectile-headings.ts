import { useState } from 'react';
import * as engine from '../../../engine';
import { nextHeadings, type HeadingMemory } from './projectile-heading.service';

/**
 * Sens de marche observé des projectiles (icônes orientées, voir `nextHeadings`). Il se dérive
 * pendant le rendu, d'après la liste de projectiles du rendu précédent : une nouvelle liste donne
 * de nouveaux sens, sans effet de bord ni rendu supplémentaire visible.
 */
export function useProjectileHeadings(
  projectiles: readonly engine.ObservedProjectile[],
): ReadonlyMap<string, HeadingMemory> {
  const [seen, setSeen] = useState<{
    source: readonly engine.ObservedProjectile[] | null;
    headings: ReadonlyMap<string, HeadingMemory>;
  }>({ source: null, headings: new Map() });
  if (seen.source === projectiles) return seen.headings;
  const headings = nextHeadings(seen.headings, projectiles);
  setSeen({ source: projectiles, headings });
  return headings;
}
