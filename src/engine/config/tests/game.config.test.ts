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

  it('définit les scénarios arbitrés (AB-11 à AB-14)', () => {
    const { navalCombat, escort } = defaultConfig.scenarios;
    expect(navalCombat).toMatchObject({
      alliedStartColumnRatio: 0.06,
      enemyZoneWidthRatio: 0.25,
      minStartDistanceRatio: 0.4,
    });
    expect(escort).toMatchObject({
      startColumnRatio: 0.06,
      goalColumnRatio: 0.94,
      interceptionZone: { fromRatio: 0.3, toRatio: 0.85 },
      minDistanceFromStartRatio: 0.4,
      minDistanceFromGoalRatio: 0.25,
    });
  });

  it.each([
    ['lutte navale', defaultConfig.scenarios.navalCombat.enemy],
    ['escorte', defaultConfig.scenarios.escort.enemy],
  ])('aligne 3 ennemis dans quatre configurations équiprobables en %s', (_name, enemy) => {
    expect(enemy.compositions.map((c) => [c.frigates, c.submarines])).toEqual([
      [3, 0],
      [2, 1],
      [1, 2],
      [0, 3],
    ]);
    expect(enemy.compositions.every((c) => c.frigates + c.submarines === 3)).toBe(true);
    expect(new Set(enemy.compositions.map((c) => c.weight))).toEqual(new Set([1]));
    expect(Object.values(enemy.frigateClassWeights)).toEqual([1, 1, 1]);
  });

  it('reprend les portées validées (D-05, G-08.4)', () => {
    expect(defaultConfig.ranges).toEqual({
      missile: 8,
      torpedo: 5,
      passiveDetection: 2,
      activeDetection: 4,
    });
  });

  /**
   * Contrôle de cohérence (AB-16) : à toute largeur de carte, les distances minimales de départ
   * dépassent la portée d'arme maximale plus la portée de détection active. Ce test casse si la
   * taille de la carte, un ratio ou une portée change sans que les autres suivent.
   */
  it.each([35, 50])(
    'garde les distances minimales de départ au-delà des portées, sur une carte de %i',
    (width) => {
      const { ranges, scenarios } = defaultConfig;
      const reach = Math.max(ranges.missile, ranges.torpedo) + ranges.activeDetection;
      const distance = (ratio: number) => Math.round(width * ratio);
      expect(distance(scenarios.navalCombat.minStartDistanceRatio)).toBeGreaterThan(reach);
      expect(distance(scenarios.escort.minDistanceFromStartRatio)).toBeGreaterThan(reach);
    },
  );
});
