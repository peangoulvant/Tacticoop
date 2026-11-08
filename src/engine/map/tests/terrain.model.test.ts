import { isNavigable, isWater, TERRAINS } from '../terrain.model';

describe('navigabilité par catégorie (SF-02 §2, AB-15)', () => {
  it('autorise le sous-marin en mer côtière, comme la frégate et le porte-avions', () => {
    expect(isNavigable('coastal_sea', 'frigate')).toBe(true);
    expect(isNavigable('coastal_sea', 'submarine')).toBe(true);
    expect(isNavigable('coastal_sea', 'carrier')).toBe(true);
  });

  it.each(['beach', 'plain', 'mountain'] as const)('interdit %s à toute catégorie', (terrain) => {
    for (const category of ['frigate', 'submarine', 'carrier'] as const) {
      expect(isNavigable(terrain, category)).toBe(false);
    }
  });

  it('autorise les trois catégories en mer profonde et en mer classique', () => {
    for (const terrain of ['deep_sea', 'sea'] as const) {
      for (const category of ['frigate', 'submarine', 'carrier'] as const) {
        expect(isNavigable(terrain, category)).toBe(true);
      }
    }
  });
});

describe('terrains d’eau', () => {
  it('compte trois terrains d’eau et trois terrains de terre', () => {
    expect(TERRAINS.filter(isWater)).toEqual(['deep_sea', 'sea', 'coastal_sea']);
  });
});
