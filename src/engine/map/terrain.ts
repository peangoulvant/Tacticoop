/** Terrains et navigabilité (SF-02 §1-2). */
export const TERRAINS = ['deep_sea', 'sea', 'coastal_sea', 'beach', 'plain', 'mountain'] as const;
export type Terrain = (typeof TERRAINS)[number];

/** Catégories de navigation ; les hélicoptères ne sont pas des unités navales. */
export type NavalCategory = 'frigate' | 'submarine' | 'carrier';

const NAVIGABLE: Record<Terrain, readonly NavalCategory[]> = {
  deep_sea: ['frigate', 'submarine', 'carrier'],
  sea: ['frigate', 'submarine', 'carrier'],
  coastal_sea: ['frigate', 'carrier'],
  beach: [],
  plain: [],
  mountain: [],
};

export const isNavigable = (terrain: Terrain, category: NavalCategory): boolean =>
  NAVIGABLE[terrain].includes(category);
