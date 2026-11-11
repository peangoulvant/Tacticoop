import type { Rng } from '../core/rng.service';

/**
 * Géométrie hexagonale. Convention interne (GD-06 non arbitré, donc réversible) :
 * hexagones « pointy-top », coordonnées « offset » (col, row) avec décalage des lignes impaires,
 * (0,0) en haut à gauche. Les calculs de distance passent par les coordonnées axiales.
 */
export interface Hex {
  col: number;
  row: number;
}

/** Coordonnées axiales : sert aux formes déplaçables, sans le décalage des lignes impaires. */
export interface Axial {
  q: number;
  r: number;
}

/**
 * Passe des coordonnées « offset » (col, row) aux coordonnées axiales (q, r). Sur une ligne
 * impaire, les hexagones sont décalés d'une demi-case vers la droite ; l'axial retire ce décalage
 * pour que les calculs de distance soient simples.
 *
 * Exemples : (col 3, ligne 0) donne q 3, r 0 ; (col 3, ligne 1) donne q 3, r 1 ;
 * (col 3, ligne 2) donne q 2, r 2.
 */
export function toAxial({ col, row }: Hex): Axial {
  return { q: col - (row - (row & 1)) / 2, r: row };
}
/** Opération inverse de `toAxial` : fromAxial(toAxial(hex)) redonne toujours `hex`. */
export function fromAxial({ q, r }: Axial): Hex {
  return { col: q + (r - (r & 1)) / 2, row: r };
}

/** Deux hexagones sont les mêmes quand ils ont la même colonne et la même ligne. */
export function sameHex(a: Hex, b: Hex): boolean {
  return a.col === b.col && a.row === b.row;
}

/**
 * Distance en nombre d'hexagones : le nombre minimal de pas entre deux cases voisines.
 *
 * Exemples : une case et sa voisine sont à 1 ; (0, 0) et (3, 0) sont à 3 ; une portée de 2
 * couvre donc la case, ses 6 voisines et leurs 12 voisines (19 cases au total).
 */
export function hexDistance(a: Hex, b: Hex): number {
  const p = toAxial(a);
  const q = toAxial(b);
  const dq = p.q - q.q;
  const dr = p.r - q.r;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}

/** Les six directions vers un voisin, en coordonnées axiales (est, nord-est, nord-ouest, ouest, sud-ouest, sud-est). */
const AXIAL_DIRECTIONS: Axial[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

/**
 * Voisins existants dans une carte de `width` × `height` hexagones : jusqu'à 6, moins sur un bord.
 * Exemple : l'hexagone (0, 0) n'a que 2 ou 3 voisins dans la carte, un hexagone central en a 6.
 */
export function hexNeighbors(hex: Hex, width: number, height: number): Hex[] {
  const a = toAxial(hex);
  return AXIAL_DIRECTIONS.map((d) => fromAxial({ q: a.q + d.q, r: a.r + d.r })).filter(
    (n) => n.col >= 0 && n.col < width && n.row >= 0 && n.row < height,
  );
}

/**
 * Ligne droite d'hexagones entre deux cases (extrémités incluses). La ligne compte
 * `hexDistance(from, to) + 1` cases. Sert à creuser un couloir de mer entre A et B.
 */
export function hexLine(from: Hex, to: Hex): Hex[] {
  const a = toAxial(from);
  const b = toAxial(to);
  const n = hexDistance(from, to);
  const result: Hex[] = [];
  for (let i = 0; i <= n; i++) {
    const t = n === 0 ? 0 : i / n;
    // Léger décalage pour éviter les égalités d'arrondi : résultat déterministe.
    const q = a.q + (b.q - a.q) * t + 1e-6;
    const r = a.r + (b.r - a.r) * t + 1e-6;
    result.push(fromAxial(roundAxial(q, r)));
  }
  return result;
}

/**
 * Arrondit des coordonnées axiales décimales à l'hexagone le plus proche. Arrondir q et r
 * séparément peut donner une case qui n'existe pas : on arrondit les trois axes (q, r et
 * s = -q - r) puis on corrige celui qui a le plus souffert de l'arrondi.
 */
function roundAxial(q: number, r: number): Axial {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(s);
  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  return { q: rq, r: rr };
}

/**
 * Premier temps de la fabrication de la zone d'un contact suspect (G-08.5, AB-20) : tire la forme
 * de la zone, sans encore la poser sur la carte. Forme connexe de `size` hexagones, en coordonnées
 * axiales, obtenue par croissance aléatoire : on part de l'origine et l'on ajoute, tour à tour, un
 * voisin tiré uniformément parmi ceux de la forme en cours. Aucune limite de carte ici : la forme
 * est ensuite déplacée sur la cible détectée par `placeShape`.
 */
export function growShape(size: number, rng: Rng): Axial[] {
  const shape: Axial[] = [{ q: 0, r: 0 }];
  const taken = new Set(['0,0']);
  while (shape.length < size) {
    const frontier = shape
      .flatMap((a) => AXIAL_DIRECTIONS.map((d) => ({ q: a.q + d.q, r: a.r + d.r })))
      .filter((n) => !taken.has(`${n.q},${n.r}`));
    const next = frontier[Math.floor(rng() * frontier.length)] as Axial;
    shape.push(next);
    taken.add(`${next.q},${next.r}`);
  }
  return shape;
}

/**
 * Second temps de la fabrication de la zone d'un contact suspect (G-08.5, AB-20) : déplace la forme
 * tirée par `growShape` pour que sa case d'indice `anchor` tombe sur `target`, la cible détectée.
 * L'appelant tire `anchor` uniformément : la cible n'est ainsi pas plus centrale qu'une autre case.
 */
export function placeShape(shape: readonly Axial[], anchor: number, target: Hex): Hex[] {
  const base = shape[anchor] as Axial;
  const t = toAxial(target);
  return shape.map((a) => fromAxial({ q: a.q - base.q + t.q, r: a.r - base.r + t.r }));
}
