import { defaultConfig } from '../game.config';

/** Valeurs provisoires arbitrées (docs/functional-specs/DECISIONS.md, D-03 ; SF-01 ; SF-02). */
describe('defaultConfig', () => {
  it('définit la carte par défaut en 35 × 35 hexagones', () => {
    expect(defaultConfig.map).toMatchObject({ width: 35, height: 35 });
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
      minStartDistanceRatio: 0.45,
    });
    expect(escort).toMatchObject({
      startColumnRatio: 0.06,
      goalColumnRatio: 0.94,
      interceptionZone: { fromRatio: 0.3, toRatio: 0.85 },
      minDistanceFromStartRatio: 0.45,
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

  it('génération de la carte : les parts de terrain totalisent 100 % (SF-02 §3)', () => {
    const { terrainShares, smoothingPasses, bypassRowRatios } = defaultConfig.map.generation;
    const total = Object.values(terrainShares).reduce((sum, share) => sum + share, 0);
    expect(total).toBeCloseTo(1, 10);
    expect(smoothingPasses).toBeGreaterThan(0);
    expect(bypassRowRatios.every((ratio) => ratio > 0 && ratio < 1)).toBe(true);
  });

  it("reprend les paramètres d'armes (D-05, AB-47, AB-54)", () => {
    const { weapons, suspectZoneImpactPenalty, projectileDetectionRange } = defaultConfig.combat;
    expect(weapons.missile).toEqual({
      range: 8,
      progression: 2,
      damage: { min: 30, max: 50 },
      impactProbability: 0.75,
      componentFailureProbability: 0.5,
      autonomy: null,
      acquisitionRange: 0,
    });
    expect(weapons.torpedo).toEqual({
      range: 4,
      progression: 1,
      damage: { min: 40, max: 60 },
      impactProbability: 0.7,
      componentFailureProbability: 0.5,
      autonomy: 6,
      acquisitionRange: 2,
    });
    expect(suspectZoneImpactPenalty).toBe(0.25);
    expect(projectileDetectionRange).toBe(3);
  });

  it.each(['missile', 'torpedo'] as const)(
    'garde les dégâts et les probabilités de %s cohérents (AB-47)',
    (weapon) => {
      const spec = defaultConfig.combat.weapons[weapon];
      expect(spec.damage.min).toBeLessThanOrEqual(spec.damage.max);
      expect(spec.impactProbability).toBeGreaterThan(defaultConfig.combat.suspectZoneImpactPenalty);
      expect(spec.progression).toBeGreaterThan(0);
      // La moyenne de la plage reste la valeur de D-05 (40 et 50 PV).
      expect((spec.damage.min + spec.damage.max) / 2).toBe(weapon === 'missile' ? 40 : 50);
    },
  );

  it("laisse à l'autodirecteur de la torpille une portée inférieure à sa portée de tir (AB-47)", () => {
    const { torpedo } = defaultConfig.combat.weapons;
    expect(torpedo.acquisitionRange).toBeLessThan(torpedo.range);
    expect(torpedo.autonomy).toBeGreaterThanOrEqual(torpedo.range);
  });

  /**
   * Hiérarchie des portées : veille < torpille < balayage < missile. AB-43 posait torpille ≤ veille ;
   * le propriétaire a porté la torpille à 4 (veille 3), la torpille dépasse donc désormais la veille
   * mais reste en deçà du balayage. Un missile porte plus loin que les capteurs du tireur : la cible
   * est désignée par un contact du camp (balayage d'une autre unité), comme avec un hélicoptère ou
   * une liaison de données.
   */
  it.each(['fremm', 'frigate_da', 'frigate_asm', 'submarine'] as const)(
    'ordonne les portées de %s : veille < torpille < balayage < missile (AB-43 révisé)',
    (shipClass) => {
      const detection = defaultConfig.ships[shipClass].detection!;
      const { missile, torpedo } = {
        missile: defaultConfig.combat.weapons.missile.range,
        torpedo: defaultConfig.combat.weapons.torpedo.range,
      };
      expect(detection.watchRange).toBeLessThan(torpedo);
      expect(torpedo).toBeLessThan(detection.sweepRange);
      expect(detection.sweepRange).toBeLessThan(missile);
    },
  );

  it.each(['fremm', 'frigate_da', 'frigate_asm', 'submarine'] as const)(
    'donne à %s les capteurs validés (G-08.4)',
    (shipClass) => {
      expect(defaultConfig.ships[shipClass].detection).toEqual({
        watchRange: 3,
        watchProbability: 0.5,
        sweepRange: 6,
        sweepProbability: 0.9,
      });
    },
  );

  it("n'a pas de capteurs pour le porte-avions (D-04)", () => {
    expect(defaultConfig.ships.carrier.detection).toBeNull();
  });

  it('définit un délai de récupération du balayage d’un cycle (AB-34)', () => {
    expect(defaultConfig.specialActions).toEqual({
      sweep: { cooldownCycles: 1 },
      fire_missile: { cooldownCycles: 0 },
      fire_torpedo: { cooldownCycles: 0 },
    });
  });

  it('définit la veille arbitrée (AB-20, AB-22, SF-01 §4)', () => {
    expect(defaultConfig.detection).toEqual({
      zoneSize: 7,
      zoneMaxAttempts: 200,
      coastalSubmarineWatchBonus: 0.2,
      sweepNoiseWatchBonus: 0.2,
      fireNoiseWatchBonus: 0.2,
    });
    expect(defaultConfig.constraints.sensorsFactor).toBe(0.8);
  });

  it("place la station de l'IA en lutte navale au centre de la carte (AB-37, AB-40)", () => {
    expect(defaultConfig.ai).toEqual({ navalCombatStationColumnRatio: 0.5 });
  });

  /**
   * Contrôle de cohérence (AB-16) : à toute largeur de carte, les distances minimales de départ
   * dépassent la portée d'arme maximale plus la portée de détection active. Ce test casse si la
   * taille de la carte, un ratio ou une portée change sans que les autres suivent.
   */
  it.each([35, 50])(
    'garde les distances minimales de départ au-delà des portées, sur une carte de %i',
    (width) => {
      const { combat, missions, ships } = defaultConfig;
      const sweepRanges = Object.values(ships).map((spec) => spec.detection?.sweepRange ?? 0);
      const reach =
        Math.max(combat.weapons.missile.range, combat.weapons.torpedo.range, ...sweepRanges) +
        Math.max(...sweepRanges);
      const distance = (ratio: number) => Math.round(width * ratio);
      expect(distance(missions.navalCombat.minStartDistanceRatio)).toBeGreaterThan(reach);
      expect(distance(missions.escort.minDistanceFromStartRatio)).toBeGreaterThan(reach);
    },
  );
});
