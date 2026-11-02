/**
 * Géométrie hexagonale. Convention interne (GD-06 non arbitré, donc réversible) :
 * hexagones « pointy-top », coordonnées « offset » (col, row) avec décalage des lignes impaires,
 * (0,0) en haut à gauche. Les calculs de distance passent par les coordonnées axiales.
 */
export interface Hex {
  col: number;
  row: number;
}

interface Axial {
  q: number;
  r: number;
}

const toAxial = ({ col, row }: Hex): Axial => ({ q: col - (row - (row & 1)) / 2, r: row });
const fromAxial = ({ q, r }: Axial): Hex => ({ col: q + (r - (r & 1)) / 2, row: r });

export const sameHex = (a: Hex, b: Hex): boolean => a.col === b.col && a.row === b.row;

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
