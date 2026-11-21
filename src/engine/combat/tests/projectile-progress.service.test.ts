import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../../config/game.config';
import type { MissionState } from '../../core/game.types';
import { hexDistance, type Hex } from '../../map/hex.service';
import { progressProjectiles } from '../projectile-progress.service';
import type { Projectile } from '../projectile.types';
import {
  aProjectile,
  identified,
  makeUnit,
  mapFromDrawing,
  missionOf,
  openSea,
  rowRoute,
  sureHit,
  sureMiss,
} from './combat-fixture.model';

type Unit = ReturnType<typeof makeUnit>;

/** Mission en mer ouverte avec ces unités et ces projectiles. */
function mission(
  units: Unit[],
  projectiles: Projectile[],
  map: MissionState['map'] = openSea(16, 9),
): MissionState {
  return { ...missionOf({ map, units }), projectiles, nextLaunchNumber: 10 };
}

/** Missile ami lancé de (0, 4) vers la case (to, 4). */
function missileTo(to: number, patch: Partial<Projectile> = {}): Projectile {
  return aProjectile({
    position: { col: 0, row: 4 },
    aimedHex: { col: to, row: 4 },
    route: rowRoute(4, 0, to),
    ...patch,
  });
}

/** Torpille amie lancée de (0, 4) vers la case (to, 4), avec toute son autonomie. */
function torpedoTo(to: number, patch: Partial<Projectile> = {}): Projectile {
  return aProjectile({
    weapon: 'torpedo',
    position: { col: 0, row: 4 },
    aimedHex: { col: to, row: 4 },
    route: rowRoute(4, 0, to),
    autonomyLeft: 5,
    ...patch,
  });
}

function hostile(id: string, col: number, row = 4, cls: 'frigate_da' | 'submarine' = 'frigate_da') {
  return makeUnit(id, 'hostile', cls, { col, row });
}

function ally(id: string, col: number, row = 4) {
  return makeUnit(id, 'friend', 'frigate_da', { col, row });
}

function unitOf(state: MissionState, id: string): Unit | undefined {
  return state.units.find((u) => u.id === id);
}

/** Fait progresser `times` fois de suite. */
function progress(state: MissionState, times: number, config = defaultConfig) {
  let current = state;
  const events: ReturnType<typeof progressProjectiles>['events'] = [];
  for (let i = 0; i < times; i++) {
    const step = progressProjectiles(current, config);
    current = step.state;
    events.push(...step.events);
  }
  return { state: current, events };
}

describe('progression d’un missile (AB-47)', () => {
  it('avance de 2 hexagones par progression sur sa ligne droite', () => {
    const { state } = progressProjectiles(mission([], [missileTo(8)]), defaultConfig);
    expect(state.projectiles[0]).toMatchObject({ position: { col: 2, row: 4 } });
    expect(state.projectiles[0]!.route).toHaveLength(6);
  });

  it('est neutralisé en arrivant à la case visée, sans unité, avec une annonce (le sien)', () => {
    const { state, events } = progressProjectiles(mission([], [missileTo(2)]), defaultConfig);
    expect(state.projectiles).toEqual([]);
    expect(events).toEqual([
      { type: 'PROJECTILE_NEUTRALISED', cycle: 1, projectileId: 'P-1', weapon: 'missile' },
    ]);
  });

  it('touche la première unité compatible rencontrée, alliée comprise (AB-47)', () => {
    const start = mission([ally('ally', 1), hostile('h', 5)], [missileTo(8)]);
    const { state, events } = progressProjectiles(start, sureHit(40));
    expect(unitOf(state, 'ally')!.hp).toBe(60);
    expect(unitOf(state, 'h')!.hp).toBe(100);
    expect(state.projectiles).toEqual([]);
    expect(events).toEqual([
      {
        type: 'PROJECTILE_IMPACT',
        cycle: 1,
        projectileId: 'P-1',
        weapon: 'missile',
        result: 'hit',
        victim: { side: 'friend', unitId: 'ally', shipClass: 'frigate_da' },
      },
    ]);
  });

  it('survole un sous-marin sans le toucher (AB-46) et finit neutralisé', () => {
    const start = mission([hostile('sub', 1, 4, 'submarine')], [missileTo(4)]);
    const { state, events } = progress(start, 2, sureHit(40));
    expect(unitOf(state, 'sub')!.hp).toBe(80);
    expect(state.projectiles).toEqual([]);
    expect(events.map((e) => e.type)).toEqual(['PROJECTILE_NEUTRALISED']);
  });

  it('neutralise le missile qui rate son impact, sans annoncer le navire hostile manqué (AB-49)', () => {
    const start = mission([hostile('h', 1)], [missileTo(8)]);
    const { state, events } = progressProjectiles(start, sureMiss());
    expect(state.projectiles).toEqual([]);
    expect(unitOf(state, 'h')!.hp).toBe(100);
    expect(events.map((e) => e.type)).toEqual(['PROJECTILE_NEUTRALISED']);
  });

  it('annonce un tir hostile manqué sur une unité alliée', () => {
    const start = mission(
      [ally('ally', 1)],
      [missileTo(8, { side: 'hostile', launcherId: 'h', detected: true })],
    );
    const { events } = progressProjectiles(start, sureMiss());
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'PROJECTILE_IMPACT',
        result: 'missed',
        victim: { side: 'friend', unitId: 'ally', shipClass: 'frigate_da' },
      }),
    );
  });

  it('continue vers la case visée quand sa cible n’existe plus (G-09-C1)', () => {
    const { state } = progress(mission([], [missileTo(6)]), 2);
    expect(state.projectiles[0]).toMatchObject({ position: { col: 4, row: 4 } });
  });

  it('continue après la destruction de son lanceur (G-09-C3)', () => {
    const { state } = progressProjectiles(
      mission([], [missileTo(8, { launcherId: 'detruit' })]),
      defaultConfig,
    );
    expect(state.projectiles[0]).toMatchObject({ position: { col: 2, row: 4 } });
  });
});

describe('destruction (G-09-C4, AB-49)', () => {
  it('retire l’unité détruite, la consigne dans les pertes et efface son contact chez le tireur', () => {
    const base = mission([{ ...hostile('h', 1), hp: 30 }], [missileTo(8)]);
    const start: MissionState = {
      ...base,
      friendContacts: [identified('C-1', { col: 1, row: 4 }, 'h')],
      hostileContacts: [identified('C-1', { col: 9, row: 9 }, 'other')],
    };
    const { state, events } = progressProjectiles(start, sureHit(40));
    expect(unitOf(state, 'h')).toBeUndefined();
    expect(state.losses).toEqual([
      { unitId: 'h', side: 'hostile', shipClass: 'frigate_da', cycle: 1 },
    ]);
    expect(state.friendContacts).toEqual([]);
    expect(state.hostileContacts).toHaveLength(1);
    // Un navire hostile non identifié : ni type ni classe dans l'événement (AB-49).
    expect(events).toEqual([
      {
        type: 'PROJECTILE_IMPACT',
        cycle: 1,
        projectileId: 'P-1',
        weapon: 'missile',
        result: 'destroyed',
        victim: { side: 'hostile' },
      },
    ]);
  });

  it('le contact de l’autre camp sur une unité détruite par tir ami reste (brouillard)', () => {
    const base = mission([{ ...ally('ally', 1), hp: 10 }], [missileTo(8)]);
    const start: MissionState = {
      ...base,
      hostileContacts: [identified('C-1', { col: 1, row: 4 }, 'ally')],
    };
    const { state } = progressProjectiles(start, sureHit(40));
    expect(unitOf(state, 'ally')).toBeUndefined();
    expect(state.hostileContacts).toHaveLength(1);
  });

  it('aucune annonce quand l’IA détruit ses propres navires', () => {
    const start = mission([hostile('h', 1)], [missileTo(8, { side: 'hostile' })]);
    const { events, state } = progressProjectiles(start, sureHit(500));
    expect(unitOf(state, 'h')).toBeUndefined();
    expect(events).toEqual([]);
  });
});

describe('progression d’une torpille (AB-47)', () => {
  it('avance d’un hexagone par progression', () => {
    const { state } = progressProjectiles(mission([], [torpedoTo(3)]), defaultConfig);
    expect(state.projectiles[0]).toMatchObject({ position: { col: 1, row: 4 }, autonomyLeft: 4 });
  });

  it('poursuit après un impact raté et finit neutralisée à la fin de son autonomie', () => {
    const start = mission([hostile('h', 1)], [torpedoTo(3)]);
    const afterMiss = progress(start, 1, sureMiss());
    expect(afterMiss.state.projectiles).toHaveLength(1);
    expect(afterMiss.events).toEqual([]);
    const four = progress(start, 4, sureMiss());
    expect(four.state.projectiles).toHaveLength(1);
    const five = progress(start, 5, sureMiss());
    expect(five.state.projectiles).toEqual([]);
    expect(five.events.map((e) => e.type)).toEqual(['PROJECTILE_NEUTRALISED']);
  });

  it('garde son cap au-delà de la case visée', () => {
    const { state } = progress(mission([], [torpedoTo(2)]), 4);
    expect(state.projectiles[0]).toMatchObject({ position: { col: 4, row: 4 } });
  });

  it('est neutralisée par un obstacle infranchissable', () => {
    const wall = mapFromDrawing(['.........', '.........', '.........', '.........', '....#....']);
    const start = mission([], [torpedoTo(3)], wall);
    expect(progress(start, 3).state.projectiles).toHaveLength(1);
    const { state, events } = progress(start, 4);
    expect(state.projectiles).toEqual([]);
    expect(events.map((e) => e.type)).toEqual(['PROJECTILE_NEUTRALISED']);
  });

  it('touche une unité compatible, un sous-marin compris', () => {
    const start = mission([hostile('sub', 1, 4, 'submarine')], [torpedoTo(3)]);
    const { state } = progressProjectiles(start, sureHit(40));
    expect(unitOf(state, 'sub')!.hp).toBe(40);
    expect(state.projectiles).toEqual([]);
  });
});

describe('autodirecteur de la torpille (G-09 §2.2, AB-47)', () => {
  /** Une case d'eau à `distance` hexagones de la torpille, hors de sa ligne. */
  function offLine(distance: number): Hex {
    const origin = { col: 0, row: 4 };
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 16; col++) {
        if (row !== 4 && hexDistance(origin, { col, row }) === distance) return { col, row };
      }
    }
    throw new Error('aucune case');
  }

  it('acquiert sa cible désignée à 2 hexagones et l’atteint', () => {
    const where = offLine(2);
    const target = hostile('h', where.col, where.row);
    const start = mission([target], [torpedoTo(3, { targetId: 'h' })]);
    const { state } = progress(start, 2, sureHit(40));
    expect(unitOf(state, 'h')!.hp).toBe(60);
    expect(state.projectiles).toEqual([]);
  });

  it('n’acquiert rien au-delà de sa portée d’acquisition', () => {
    const where = offLine(3);
    const start = mission([hostile('h', where.col, where.row)], [torpedoTo(3, { targetId: 'h' })]);
    const { state } = progress(start, 3, sureHit(40));
    expect(unitOf(state, 'h')!.hp).toBe(100);
  });

  it('sans cible désignée (tir sur zone), elle ne se détourne pas', () => {
    const where = offLine(2);
    const start = mission([hostile('h', where.col, where.row)], [torpedoTo(3, { targetId: null })]);
    const { state } = progress(start, 3, sureHit(40));
    expect(unitOf(state, 'h')!.hp).toBe(100);
  });

  it('perd le suivi quand la cible s’éloigne et garde son dernier cap', () => {
    const start = mission(
      [hostile('h', 14, 8)],
      [
        torpedoTo(8, {
          position: { col: 3, row: 4 },
          route: [{ col: 4, row: 4 }],
          heading: { q: 1, r: 0 },
          tracking: true,
          targetId: 'h',
        }),
      ],
    );
    const { state } = progressProjectiles(start, defaultConfig);
    expect(state.projectiles[0]).toMatchObject({
      position: { col: 4, row: 4 },
      tracking: false,
      route: [],
    });
  });
});

describe('ordre fixe des projectiles (G-09.10.1, AB-48)', () => {
  it('résout par numéro de lancement, quel que soit l’ordre de la liste et le camp', () => {
    const first = missileTo(8, { id: 'P-1', launchNumber: 1, side: 'hostile' });
    const second = missileTo(8, { id: 'P-2', launchNumber: 2, side: 'friend' });
    const target = { ...ally('ally', 1), hp: 50 };
    const { events, state } = progressProjectiles(mission([target], [second, first]), sureHit(30));
    const impacts = events.flatMap((e) =>
      e.type === 'PROJECTILE_IMPACT' ? [[e.projectileId, e.result]] : [],
    );
    expect(impacts).toEqual([
      ['P-1', 'hit'],
      ['P-2', 'destroyed'],
    ]);
    expect(unitOf(state, 'ally')).toBeUndefined();
  });

  it('un projectile ne touche pas l’unité qu’un projectile précédent vient de détruire', () => {
    const first = missileTo(8, { id: 'P-1', launchNumber: 1 });
    const second = missileTo(8, { id: 'P-2', launchNumber: 2 });
    const { state, events } = progressProjectiles(
      mission([{ ...hostile('h', 1), hp: 20 }, hostile('h2', 2)], [first, second]),
      sureHit(40),
    );
    expect(unitOf(state, 'h')).toBeUndefined();
    expect(unitOf(state, 'h2')!.hp).toBe(60);
    expect(events).toHaveLength(2);
  });
});

describe('identification d’office des projectiles hostiles (AB-49)', () => {
  it('annonce un projectile hostile une seule fois, à 3 hexagones d’une unité alliée', () => {
    const start = mission([ally('ally', 5)], [missileTo(14, { side: 'hostile', launcherId: 'h' })]);
    const first = progressProjectiles(start, defaultConfig);
    expect(first.events).toEqual([
      {
        type: 'PROJECTILE_DETECTED',
        cycle: 1,
        projectileId: 'P-1',
        weapon: 'missile',
        position: { col: 2, row: 4 },
      },
    ]);
    expect(first.state.projectiles[0]!.detected).toBe(true);
    expect(progressProjectiles(first.state, defaultConfig).events).toEqual([]);
  });

  it('annonce de nouveau un projectile qui sort de la portée puis y revient', () => {
    // Un missile hostile qui longe l'unité alliée : proche, loin, puis de nouveau proche.
    const near = mission(
      [ally('ally', 6)],
      [missileTo(14, { side: 'hostile', launcherId: 'h', detected: true })],
    );
    const left = progressProjectiles(near, defaultConfig);
    expect(left.state.projectiles[0]!.position).toEqual({ col: 2, row: 4 });
    expect(left.state.projectiles[0]!.detected).toBe(false);
    expect(left.events).toEqual([]);
    const returned = mission(
      [ally('ally', 6)],
      [{ ...left.state.projectiles[0]!, position: { col: 2, row: 4 }, route: rowRoute(4, 2, 14) }],
    );
    const back = progressProjectiles(returned, defaultConfig);
    expect(back.state.projectiles[0]!.detected).toBe(true);
    expect(back.events.map((e) => e.type)).toEqual(['PROJECTILE_DETECTED']);
  });

  it('le drapeau suit la proximité : il tombe hors de portée et ne produit aucun événement', () => {
    const far = mission(
      [ally('ally', 12)],
      [missileTo(14, { side: 'hostile', launcherId: 'h', detected: true })],
    );
    const { state, events } = progressProjectiles(far, defaultConfig);
    expect(state.projectiles[0]!.detected).toBe(false);
    expect(events).toEqual([]);
  });

  it('n’annonce rien tant que le projectile est plus loin que la portée', () => {
    const start = mission(
      [ally('ally', 12)],
      [missileTo(14, { side: 'hostile', launcherId: 'h' })],
    );
    expect(progressProjectiles(start, defaultConfig).events).toEqual([]);
  });

  it('n’annonce pas ses propres projectiles, même près d’un hostile', () => {
    const start = mission([hostile('h', 5)], [missileTo(14)]);
    expect(progressProjectiles(start, defaultConfig).events).toEqual([]);
  });

  it('le porte-avions identifie un projectile adverse (AB-49)', () => {
    const carrier = makeUnit('carrier', 'friend', 'carrier', { col: 5, row: 4 });
    const start = mission([carrier], [missileTo(14, { side: 'hostile', launcherId: 'h' })]);
    expect(progressProjectiles(start, defaultConfig).events.map((e) => e.type)).toEqual([
      'PROJECTILE_DETECTED',
    ]);
  });
});

describe('hasard et reproductibilité (AB-24)', () => {
  it('rend la mission telle quelle sans projectile', () => {
    const start = mission([ally('a', 1)], []);
    expect(progressProjectiles(start, defaultConfig).state).toBe(start);
  });

  it('ne consomme aucun tirage sans tentative d’impact', () => {
    const start = mission([], [missileTo(8)]);
    expect(progressProjectiles(start, defaultConfig).state.rngState).toBe(start.rngState);
  });

  it('consomme des tirages à chaque tentative et se rejoue à l’identique', () => {
    const start = mission([hostile('h', 1)], [missileTo(8)]);
    const first = progressProjectiles(start, defaultConfig);
    expect(first.state.rngState).not.toBe(start.rngState);
    expect(progressProjectiles(start, defaultConfig)).toEqual(first);
  });

  it('tire les dégâts dans la plage de l’arme (30 à 50 PV pour un missile)', () => {
    const damages = new Set<number>();
    for (let seed = 1; seed <= 400; seed++) {
      const start = { ...mission([hostile('h', 1)], [missileTo(8)]), rngState: seed };
      const config = { ...defaultConfig, combat: { ...defaultConfig.combat } };
      config.combat.weapons = {
        ...config.combat.weapons,
        missile: { ...config.combat.weapons.missile, impactProbability: 1 },
      };
      const hp = unitOf(progressProjectiles(start, config).state, 'h')!.hp;
      damages.add(100 - hp);
    }
    expect(Math.min(...damages)).toBe(30);
    expect(Math.max(...damages)).toBe(50);
  });
});
