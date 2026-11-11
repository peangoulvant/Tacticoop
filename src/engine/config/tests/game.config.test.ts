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
      sensorsFactor: 0.8,
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
    const { navalCombat, escort } = defaultConfig.missions;
    expect(navalCombat).toMatchObject({
      alliedStartColumnRatio: 0.06,
      hostileZoneWidthRatio: 0.25,
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
    ['lutte navale', defaultConfig.missions.navalCombat.hostile],
    ['escorte', defaultConfig.missions.escort.hostile],
  ])('aligne 3 ennemis dans quatre configurations équiprobables en %s', (_name, hostile) => {
    expect(hostile.compositions.map((c) => [c.frigates, c.submarines])).toEqual([
      [3, 0],
      [2, 1],
      [1, 2],
      [0, 3],
    ]);
    expect(hostile.compositions.every((c) => c.frigates + c.submarines === 3)).toBe(true);
    expect(new Set(hostile.compositions.map((c) => c.weight))).toEqual(new Set([1]));
    expect(Object.values(hostile.frigateClassWeights)).toEqual([1, 1, 1]);
  });

  it("reprend les portées d'armes (D-05)", () => {
    expect(defaultConfig.weaponRanges).toEqual({ missile: 8, torpedo: 5 });
  });

  it.each(['fremm', 'frigate_da', 'frigate_asm', 'submarine'] as const)(
    'donne à %s les capteurs validés (G-08.4)',
    (shipClass) => {
      expect(defaultConfig.ships[shipClass].detection).toEqual({
        watchRange: 2,
        watchProbability: 0.5,
        sweepRange: 4,
        sweepProbability: 0.9,
      });
    },
  );

  it("n'a pas de capteurs pour le porte-avions (D-04)", () => {
    expect(defaultConfig.ships.carrier.detection).toBeNull();
  });

  it('définit un délai de récupération du balayage d’un cycle (AB-34)', () => {
    expect(defaultConfig.specialActions).toEqual({ sweep: { cooldownCycles: 1 } });
  });

  it('définit la veille arbitrée (AB-20, AB-22, SF-01 §4)', () => {
    expect(defaultConfig.detection).toEqual({
      zoneSize: 7,
      zoneMaxAttempts: 200,
      coastalSubmarineWatchBonus: 0.2,
      sweepNoiseWatchBonus: 0.2,
    });
    expect(defaultConfig.constraints.sensorsFactor).toBe(0.8);
  });

  /**
   * Contrôle de cohérence (AB-16) : à toute largeur de carte, les distances minimales de départ
   * dépassent la portée d'arme maximale plus la portée de détection active. Ce test casse si la
   * taille de la carte, un ratio ou une portée change sans que les autres suivent.
   */
  it.each([35, 50])(
    'garde les distances minimales de départ au-delà des portées, sur une carte de %i',
    (width) => {
      const { weaponRanges, missions, ships } = defaultConfig;
      const sweepRanges = Object.values(ships).map((spec) => spec.detection?.sweepRange ?? 0);
      const reach =
        Math.max(weaponRanges.missile, weaponRanges.torpedo, ...sweepRanges) +
        Math.max(...sweepRanges);
      const distance = (ratio: number) => Math.round(width * ratio);
      expect(distance(missions.navalCombat.minStartDistanceRatio)).toBeGreaterThan(reach);
      expect(distance(missions.escort.minDistanceFromStartRatio)).toBeGreaterThan(reach);
    },
  );
});
