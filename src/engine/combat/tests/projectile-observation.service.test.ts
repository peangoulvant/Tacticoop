import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../../config/game.config';
import type { MissionState } from '../../core/game.types';
import { observeFriend, observeHostile } from '../../detection/observation.service';
import { observedProjectiles } from '../projectile-observation.service';
import type { Projectile } from '../projectile.types';
import { aProjectile, makeUnit, missionOf, openSea, rowRoute } from './combat-fixture.model';

type Unit = ReturnType<typeof makeUnit>;

function mission(
  units: Unit[],
  projectiles: Projectile[],
  constraints: string[] = [],
): MissionState {
  const base = missionOf({ map: openSea(20, 9), units });
  return {
    ...base,
    projectiles,
    setup: { ...base.setup, constraints: constraints as MissionState['setup']['constraints'] },
  };
}

const ownMissile = aProjectile({
  id: 'P-1',
  launchNumber: 1,
  side: 'friend',
  position: { col: 10, row: 4 },
  route: rowRoute(4, 10, 14),
  targetId: 'secret-target',
});

/** Missile hostile à `col`, en route vers (18, 4). */
function hostileMissile(col: number, id = 'P-2', launchNumber = 2): Projectile {
  return aProjectile({
    id,
    launchNumber,
    side: 'hostile',
    launcherId: 'secret-launcher',
    position: { col, row: 4 },
    aimedHex: { col: 18, row: 4 },
    route: rowRoute(4, col, 18),
    targetId: 'secret-target',
  });
}

describe('projectiles connus du camp ami (AB-49)', () => {
  it('connaît toujours ses propres projectiles, avec leur tracé restant', () => {
    const state = mission([makeUnit('a', 'friend', 'fremm', { col: 0, row: 0 })], [ownMissile]);
    expect(observeFriend(state).projectiles).toEqual([
      {
        id: 'P-1',
        weapon: 'missile',
        side: 'friend',
        position: { col: 10, row: 4 },
        route: rowRoute(4, 10, 14),
        status: 'targeted',
      },
    ]);
  });

  it('identifie un projectile hostile à 3 hexagones d’une unité alliée, sans son tracé', () => {
    const state = mission(
      [makeUnit('a', 'friend', 'fremm', { col: 5, row: 4 })],
      [hostileMissile(8)],
    );
    expect(observeFriend(state).projectiles).toEqual([
      {
        id: 'P-2',
        weapon: 'missile',
        side: 'hostile',
        position: { col: 8, row: 4 },
        route: [],
        status: 'unknown',
      },
    ]);
  });

  it('ne voit pas un projectile hostile à 4 hexagones', () => {
    const state = mission(
      [makeUnit('a', 'friend', 'fremm', { col: 4, row: 4 })],
      [hostileMissile(8)],
    );
    expect(observeFriend(state).projectiles).toEqual([]);
  });

  it('le porte-avions, qui ne détecte pas, identifie quand même un projectile proche', () => {
    const state = mission(
      [makeUnit('c', 'friend', 'carrier', { col: 5, row: 4 })],
      [hostileMissile(8)],
    );
    expect(observeFriend(state).projectiles).toHaveLength(1);
  });

  it('« Capteurs dégradés » ne réduit pas la portée d’identification', () => {
    const state = mission(
      [makeUnit('a', 'friend', 'fremm', { col: 5, row: 4 })],
      [hostileMissile(8)],
      ['degraded_sensors'],
    );
    expect(observeFriend(state).projectiles).toHaveLength(1);
  });

  it('la portée est un paramètre de configuration', () => {
    const state = mission(
      [makeUnit('a', 'friend', 'fremm', { col: 4, row: 4 })],
      [hostileMissile(8)],
    );
    const wider = {
      ...defaultConfig,
      combat: { ...defaultConfig.combat, projectileDetectionRange: 4 },
    };
    expect(observeFriend(state, wider).projectiles).toHaveLength(1);
  });

  it('classe les projectiles par numéro de lancement, quel que soit l’ordre de l’état', () => {
    const state = mission(
      [makeUnit('a', 'friend', 'fremm', { col: 8, row: 5 })],
      [hostileMissile(9, 'P-7', 7), ownMissile, hostileMissile(10, 'P-3', 3)],
    );
    expect(observedProjectiles(state, 'friend', defaultConfig).map((p) => p.id)).toEqual([
      'P-1',
      'P-3',
      'P-7',
    ]);
  });
});

describe('projectiles connus de l’IA : même règle (AB-35)', () => {
  it('connaît les siens et identifie ceux du joueur près d’une de ses unités', () => {
    const units = [makeUnit('h', 'hostile', 'frigate_da', { col: 12, row: 4 })];
    const state = mission(units, [ownMissile, hostileMissile(16)]);
    const seen = observeHostile(state).projectiles;
    expect(seen.map((p) => p.id)).toEqual(['P-1', 'P-2']);
    expect(seen.find((p) => p.id === 'P-1')!.route).toEqual([]);
    expect(seen.find((p) => p.id === 'P-2')!.route).not.toEqual([]);
  });
});

describe('aucune information cachée dans les projections (AB-49)', () => {
  it('ni la cible désignée, ni le lanceur, ni le drapeau interne ne sortent', () => {
    const state = mission(
      [makeUnit('a', 'friend', 'fremm', { col: 5, row: 4 })],
      [ownMissile, hostileMissile(8)],
    );
    for (const text of [
      JSON.stringify(observeFriend(state).projectiles),
      JSON.stringify(observeHostile(state).projectiles),
    ]) {
      expect(text).not.toContain('secret-target');
      expect(text).not.toContain('secret-launcher');
      expect(text).not.toContain('targetId');
      expect(text).not.toContain('detected');
    }
  });
});

describe('tracé d’une torpille qui suit sa cible (AB-49 4)', () => {
  it('ne mène jamais à la position réelle de la cible : il reste celui de la case visée', () => {
    const hiddenTarget = { col: 6, row: 5 };
    const torpedo = aProjectile({
      weapon: 'torpedo',
      position: { col: 4, row: 4 },
      aimedHex: { col: 7, row: 4 },
      tracking: true,
      route: [{ col: 5, row: 5 }, hiddenTarget],
      autonomyLeft: 3,
    });
    const mission = {
      ...missionOf({
        map: openSea(12, 9),
        units: [makeUnit('f', 'friend', 'fremm', { col: 2, row: 4 })],
      }),
      projectiles: [torpedo],
    };
    const [observed] = observedProjectiles(mission, 'friend', defaultConfig);
    expect(observed?.route.at(-1)).toEqual({ col: 7, row: 4 });
    expect(observed?.route).not.toContainEqual(hiddenTarget);
  });
});

describe('statut d’un projectile (AB-51)', () => {
  const friend = makeUnit('f', 'friend', 'fremm', { col: 2, row: 4 });
  const statusIn = (projectile: Projectile, side: 'friend' | 'hostile' = 'friend') =>
    observedProjectiles(
      { ...missionOf({ map: openSea(20, 9), units: [friend] }), projectiles: [projectile] },
      side,
      defaultConfig,
    )[0]?.status;

  it('un missile du camp va vers sa case visée', () => {
    expect(statusIn(aProjectile({ weapon: 'missile' }))).toBe('targeted');
  });

  it('une torpille est « targeted » quand elle suit sa cible, « searching » sinon', () => {
    const torpedo = aProjectile({ weapon: 'torpedo', autonomyLeft: 4 });
    expect(statusIn({ ...torpedo, tracking: true })).toBe('targeted');
    expect(statusIn({ ...torpedo, tracking: false })).toBe('searching');
  });

  it('un tir sur zone n’acquiert aucune cible : jamais « targeted »', () => {
    const onZone = aProjectile({ weapon: 'torpedo', onSuspectZone: true, autonomyLeft: 4 });
    expect(statusIn(onZone)).toBe('searching');
  });

  it('un projectile adverse est toujours « unknown », qu’il suive ou non sa cible', () => {
    const near = aProjectile({
      side: 'hostile',
      weapon: 'torpedo',
      position: { col: 3, row: 4 },
      tracking: true,
      autonomyLeft: 4,
    });
    expect(statusIn(near)).toBe('unknown');
  });
});
