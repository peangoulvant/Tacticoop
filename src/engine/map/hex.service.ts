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

export function toAxial({ col, row }: Hex): Axial {
  return { q: col - (row - (row & 1)) / 2, r: row };
}
export function fromAxial({ q, r }: Axial): Hex {
  return { col: q + (r - (r & 1)) / 2, row: r };
}

export function sameHex(a: Hex, b: Hex): boolean {
  return a.col === b.col && a.row === b.row;
}

/** Distance en nombre d'hexagones. */
export function hexDistance(a: Hex, b: Hex): number {
  const p = toAxial(a);
  const q = toAxial(b);
  const dq = p.q - q.q;
  const dr = p.r - q.r;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}

const AXIAL_DIRECTIONS: Axial[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

/** Voisins existants dans une carte de `width` × `height` hexagones. */
export function hexNeighbors(hex: Hex, width: number, height: number): Hex[] {
  const a = toAxial(hex);
  return AXIAL_DIRECTIONS.map((d) => fromAxial({ q: a.q + d.q, r: a.r + d.r })).filter(
    (n) => n.col >= 0 && n.col < width && n.row >= 0 && n.row < height,
  );
}

/** Ligne droite d'hexagones entre deux cases (extrémités incluses). */
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
 * Forme connexe de `size` hexagones, en coordonnées axiales, par croissance aléatoire : on part de
 * l'origine et l'on ajoute, tour à tour, un voisin tiré uniformément parmi ceux de la forme en
 * cours. Aucune limite de carte ici : la forme est ensuite déplacée (`placeShape`).
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

/** Déplace une forme pour que sa case d'indice `anchor` tombe sur `target`. */
export function placeShape(shape: readonly Axial[], anchor: number, target: Hex): Hex[] {
  const base = shape[anchor] as Axial;
  const t = toAxial(target);
  return shape.map((a) => fromAxial({ q: a.q - base.q + t.q, r: a.r - base.r + t.r }));
}
