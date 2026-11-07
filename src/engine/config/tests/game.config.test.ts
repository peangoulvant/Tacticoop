import { defaultConfig } from '../game.config';

/** Valeurs provisoires arbitrées (docs/functional-specs/DECISIONS.md, D-03 ; SF-01 ; SF-02). */
describe('defaultConfig', () => {
  it('définit la carte par défaut en 35 × 35 hexagones', () => {
    expect(defaultConfig.map).toEqual({ width: 35, height: 35 });
  });

  it('définit les budgets et les paramètres de contraintes', () => {
    expect(defaultConfig.budget).toEqual({ normal: 100, limitedMeans: 70 });
    expect(defaultConfig.constraints).toEqual({
      maxCount: 2,
      ammoFactor: 0.7,
      badWeatherMaxMovement: 2,
    });
  });

  it.each([
    ['fremm', { cost: 35, maxHp: 110, movement: 3, missiles: 4, torpedoes: 4, helicopters: 1 }],
    [
      'frigate_da',
      { cost: 25, maxHp: 100, movement: 3, missiles: 6, torpedoes: 2, helicopters: 1 },
    ],
    [
      'frigate_asm',
      { cost: 25, maxHp: 100, movement: 3, missiles: 2, torpedoes: 6, helicopters: 2 },
    ],
    ['submarine', { cost: 50, maxHp: 80, movement: 2, missiles: 0, torpedoes: 4, helicopters: 0 }],
    ['carrier', { cost: 0, maxHp: 200, movement: 2, missiles: 0, torpedoes: 0, helicopters: 0 }],
  ] as const)('reprend la fiche provisoire de %s', (shipClass, expected) => {
    expect(defaultConfig.ships[shipClass]).toMatchObject(expected);
  });
});
