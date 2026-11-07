import { hexDistance, hexLine, hexNeighbors } from '../hex.service';

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
