import { createRng } from '../../core/rng.service';
import { growShape, hexDistance, hexLine, hexNeighbors, placeShape, toAxial } from '../hex.service';

describe('hex', () => {
  it('mesure la distance en hexagones, au-delà de la ligne ou de la colonne', () => {
    expect(hexDistance({ col: 0, row: 0 }, { col: 0, row: 0 })).toBe(0);
    expect(hexDistance({ col: 0, row: 0 }, { col: 3, row: 0 })).toBe(3);
    expect(hexDistance({ col: 0, row: 0 }, { col: 0, row: 2 })).toBe(2);
    expect(hexDistance({ col: 2, row: 1 }, { col: 4, row: 4 })).toBe(3);
  });

  it('donne 6 voisins à distance 1 au centre et moins sur un bord', () => {
    const center = hexNeighbors({ col: 5, row: 5 }, 10, 10);
    expect(center).toHaveLength(6);
    center.forEach((n) => expect(hexDistance(n, { col: 5, row: 5 })).toBe(1));
    expect(hexNeighbors({ col: 0, row: 0 }, 10, 10).length).toBeLessThan(6);
  });

  it('trace une ligne continue entre deux cases', () => {
    const line = hexLine({ col: 0, row: 0 }, { col: 7, row: 6 });
    expect(line[0]).toEqual({ col: 0, row: 0 });
    expect(line.at(-1)).toEqual({ col: 7, row: 6 });
    for (let i = 1; i < line.length; i++) {
      expect(hexDistance(line[i - 1]!, line[i]!)).toBe(1);
    }
  });
});

describe('forme déplaçable (zones de contact)', () => {
  it('fait croître une forme connexe de la taille demandée, sans doublon', () => {
    const rng = createRng(6);
    for (let i = 0; i < 100; i++) {
      const shape = growShape(7, rng);
      expect(shape).toHaveLength(7);
      expect(new Set(shape.map((a) => `${a.q},${a.r}`)).size).toBe(7);
      const connected = shape.every(
        (a, k) =>
          k === 0 ||
          shape.some(
            (b, j) =>
              j < k &&
              Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q + a.r - b.q - b.r) === 2,
          ),
      );
      expect(connected).toBe(true);
    }
  });

  it('est reproductible pour une même graine', () => {
    expect(growShape(7, createRng(2))).toEqual(growShape(7, createRng(2)));
  });

  it('place la case choisie sur la cible, quelle que soit la parité de la ligne', () => {
    const shape = growShape(7, createRng(4));
    for (const target of [
      { col: 5, row: 4 },
      { col: 5, row: 5 },
    ]) {
      for (let anchor = 0; anchor < shape.length; anchor++) {
        const placed = placeShape(shape, anchor, target);
        expect(placed[anchor]).toEqual(target);
        const a = toAxial(placed[0]!);
        const b = toAxial(placed[1]!);
        const originalA = shape[0]!;
        const originalB = shape[1]!;
        expect([b.q - a.q, b.r - a.r]).toEqual([
          originalB.q - originalA.q,
          originalB.r - originalA.r,
        ]);
      }
    }
  });
});
