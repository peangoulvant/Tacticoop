import * as engine from '../../../engine';

/*
 * Que choisit un clic sur un hexagone ? Une unité alliée, puis les projectiles alliés qui s'y
 * trouvent (un projectile peut partager la case d'une unité, ou d'un autre projectile). Des
 * clics répétés sur la même case font défiler ces éléments, dans l'ordre fixe du numéro de
 * lancement. Les projectiles hostiles ne sont pas sélectionnables : leur tracé n'est pas connu.
 */

/** Élément sélectionnable d'une case. */
export type Selectable = { kind: 'unit'; id: string } | { kind: 'projectile'; id: string };

/** Éléments sélectionnables sur `hex`, dans l'ordre de défilement : l'unité, puis les projectiles alliés. */
export function selectablesAt(
  units: readonly engine.Unit[],
  projectiles: readonly engine.ObservedProjectile[],
  hex: engine.Hex,
): Selectable[] {
  const unit = units.find((u) => engine.sameHex(u.position, hex));
  const shots = projectiles.filter((p) => p.side === 'friend' && engine.sameHex(p.position, hex));
  return [
    ...(unit ? [{ kind: 'unit' as const, id: unit.id }] : []),
    ...shots.map((p) => ({ kind: 'projectile' as const, id: p.id })),
  ];
}

/** Élément actuellement sélectionné d'après les deux identifiants du store, ou `null`. */
export function currentSelectable(
  unitId: string | null,
  projectileId: string | null,
): Selectable | null {
  if (projectileId) return { kind: 'projectile', id: projectileId };
  return unitId ? { kind: 'unit', id: unitId } : null;
}

/**
 * Élément choisi par ce clic : le premier de la case, ou celui qui suit l'élément déjà
 * sélectionné s'il y est (avec retour au premier). `null` pour une case sans rien de sélectionnable.
 * Exemple : une unité et un missile sur la case ; unité sélectionnée, un clic choisit le missile,
 * un second clic revient à l'unité.
 */
export function nextSelectable(
  selectables: readonly Selectable[],
  current: Selectable | null,
): Selectable | null {
  if (selectables.length === 0) return null;
  const index = selectables.findIndex(
    (s) => current && s.kind === current.kind && s.id === current.id,
  );
  return selectables[(index + 1) % selectables.length] as Selectable;
}
