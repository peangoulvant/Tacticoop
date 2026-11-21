import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../../config/game.config';
import { planShot } from '../shot-plan.service';
import { torpedoTrajectory } from '../trajectory.service';
import {
  identified,
  makeUnit,
  mapFromDrawing,
  missionOf,
  openSea,
  suspectZone,
} from './combat-fixture.model';

const SHOOTER_AT = { col: 2, row: 4 };

function shooter() {
  return makeUnit('f', 'friend', 'fremm', SHOOTER_AT);
}

/** Mission en mer ouverte avec le tireur, une cible hostile et les contacts donnés du camp ami. */
function mission(contacts: Parameters<typeof withContacts>[1], cycle = 1) {
  return withContacts(
    missionOf({
      map: openSea(16, 9),
      units: [shooter(), makeUnit('h', 'hostile', 'frigate_da', { col: 5, row: 4 })],
      cycle,
    }),
    contacts,
  );
}

function withContacts(
  base: ReturnType<typeof missionOf>,
  contacts: ReturnType<typeof identified>[],
) {
  return { ...base, friendContacts: contacts, nextContactNumber: contacts.length + 1 };
}

describe('plan d’un tir sur un contact identifié (AB-46)', () => {
  it('missile : ligne droite jusqu’à la position exacte, sans cible désignée', () => {
    const m = mission([identified('C-1', { col: 6, row: 4 }, 'h')]);
    const plan = planShot(m, shooter(), 'missile', { contactId: 'C-1' }, defaultConfig);
    expect(plan).toMatchObject({
      ok: true,
      aimedHex: { col: 6, row: 4 },
      targetId: null,
      onSuspectZone: false,
    });
    expect(plan.ok && plan.route).toHaveLength(4);
  });

  it('torpille : chemin maritime, avec le navire désigné (donnée interne)', () => {
    const m = mission([identified('C-1', { col: 5, row: 4 }, 'h')]);
    const plan = planShot(m, shooter(), 'torpedo', { contactId: 'C-1' }, defaultConfig);
    expect(plan).toMatchObject({ ok: true, targetId: 'h', onSuspectZone: false });
    expect(plan.ok && plan.route).toHaveLength(3);
  });

  it('refuse un contact inconnu', () => {
    expect(
      planShot(mission([]), shooter(), 'missile', { contactId: 'C-9' }, defaultConfig),
    ).toEqual({ ok: false, reason: 'UNKNOWN_CONTACT' });
  });

  it('refuse un contact identifié ancien : il faut rebalayer (AB-46)', () => {
    const m = mission([identified('C-1', { col: 5, row: 4 }, 'h', 'frigate', 1)], 2);
    expect(planShot(m, shooter(), 'missile', { contactId: 'C-1' }, defaultConfig)).toEqual({
      ok: false,
      reason: 'STALE_CONTACT',
    });
  });

  it('accepte un contact identifié du cycle courant', () => {
    const m = mission([identified('C-1', { col: 5, row: 4 }, 'h', 'frigate', 2)], 2);
    expect(planShot(m, shooter(), 'missile', { contactId: 'C-1' }, defaultConfig).ok).toBe(true);
  });

  it('refuse un missile contre un sous-marin identifié, mais pas une torpille', () => {
    const m = mission([identified('C-1', { col: 5, row: 4 }, 'h', 'submarine')]);
    expect(planShot(m, shooter(), 'missile', { contactId: 'C-1' }, defaultConfig)).toEqual({
      ok: false,
      reason: 'INCOMPATIBLE_TARGET',
    });
    expect(planShot(m, shooter(), 'torpedo', { contactId: 'C-1' }, defaultConfig).ok).toBe(true);
  });

  it('accepte un missile contre un porte-avions identifié', () => {
    const m = mission([identified('C-1', { col: 5, row: 4 }, 'h', 'carrier')]);
    expect(planShot(m, shooter(), 'missile', { contactId: 'C-1' }, defaultConfig).ok).toBe(true);
  });

  it('refuse une cible hors de portée : missile 8, torpille 3', () => {
    const far = mission([identified('C-1', { col: 11, row: 4 }, 'h')]);
    expect(planShot(far, shooter(), 'missile', { contactId: 'C-1' }, defaultConfig)).toEqual({
      ok: false,
      reason: 'OUT_OF_RANGE',
    });
    const edge = mission([identified('C-1', { col: 10, row: 4 }, 'h')]);
    expect(planShot(edge, shooter(), 'missile', { contactId: 'C-1' }, defaultConfig).ok).toBe(true);
    expect(planShot(edge, shooter(), 'torpedo', { contactId: 'C-1' }, defaultConfig)).toEqual({
      ok: false,
      reason: 'OUT_OF_RANGE',
    });
  });

  it('refuse un tir sur la case du tireur', () => {
    const m = mission([identified('C-1', SHOOTER_AT, 'h')]);
    expect(planShot(m, shooter(), 'missile', { contactId: 'C-1' }, defaultConfig)).toEqual({
      ok: false,
      reason: 'SAME_HEX',
    });
  });

  it('refuse une torpille sans chemin maritime (poche d’eau fermée)', () => {
    const pocket = mapFromDrawing(['.......', '.#####.', '.#...#.', '.#####.', '.......']);
    const base = missionOf({ map: pocket, units: [shooter()], cycle: 1 });
    const m = withContacts(base, [identified('C-1', { col: 3, row: 2 }, 'h')]);
    const unit = makeUnit('f', 'friend', 'fremm', { col: 2, row: 0 });
    expect(planShot(m, unit, 'torpedo', { contactId: 'C-1' }, defaultConfig)).toEqual({
      ok: false,
      reason: 'NO_MARITIME_PATH',
    });
    // Le missile, lui, survole la terre.
    expect(planShot(m, unit, 'missile', { contactId: 'C-1' }, defaultConfig).ok).toBe(true);
  });

  it('refuse une torpille dont le chemin dépasse son autonomie', () => {
    const wall = mapFromDrawing(['.........', '.####....', '.#..#....', '.#.......']);
    const base = missionOf({ map: wall, units: [] });
    const m = withContacts(base, [identified('C-1', { col: 3, row: 2 }, 'h')]);
    const unit = makeUnit('f', 'friend', 'fremm', { col: 3, row: 0 });
    // Le chemin existe mais fait le tour du mur : plus long que l'autonomie de 5 hexagones.
    expect(torpedoTrajectory(wall, unit.position, { col: 3, row: 2 })!.length).toBeGreaterThan(5);
    expect(planShot(m, unit, 'torpedo', { contactId: 'C-1' }, defaultConfig)).toEqual({
      ok: false,
      reason: 'NO_MARITIME_PATH',
    });
  });
});

describe('plan d’un tir sur une zone suspecte (AB-46, AB-47)', () => {
  const zone = [
    { col: 5, row: 4 },
    { col: 6, row: 4 },
    { col: 5, row: 3 },
  ];
  const m = () => mission([suspectZone('C-1', zone, 'h')]);

  it('demande un hexagone de la zone', () => {
    expect(planShot(m(), shooter(), 'missile', { contactId: 'C-1' }, defaultConfig)).toEqual({
      ok: false,
      reason: 'ZONE_HEX_REQUIRED',
    });
    expect(
      planShot(
        m(),
        shooter(),
        'missile',
        { contactId: 'C-1', hex: { col: 9, row: 9 } },
        defaultConfig,
      ),
    ).toEqual({ ok: false, reason: 'HEX_NOT_IN_ZONE' });
  });

  it('missile : accepté, avec pénalité de zone', () => {
    const plan = planShot(
      m(),
      shooter(),
      'missile',
      { contactId: 'C-1', hex: { col: 6, row: 4 } },
      defaultConfig,
    );
    expect(plan).toMatchObject({ ok: true, aimedHex: { col: 6, row: 4 }, onSuspectZone: true });
  });

  it('torpille : aucune cible désignée, sinon elle révélerait la cible réelle (AB-47)', () => {
    const plan = planShot(
      m(),
      shooter(),
      'torpedo',
      { contactId: 'C-1', hex: { col: 5, row: 4 } },
      defaultConfig,
    );
    expect(plan).toMatchObject({ ok: true, targetId: null, onSuspectZone: true });
  });

  it('refuse l’hexagone du tireur même s’il est dans la zone', () => {
    const inZone = mission([suspectZone('C-1', [SHOOTER_AT, { col: 3, row: 4 }], 'h')]);
    expect(
      planShot(inZone, shooter(), 'missile', { contactId: 'C-1', hex: SHOOTER_AT }, defaultConfig),
    ).toEqual({ ok: false, reason: 'SAME_HEX' });
  });

  it('autorise un missile sur une zone : le type est inconnu', () => {
    const plan = planShot(
      m(),
      shooter(),
      'missile',
      { contactId: 'C-1', hex: { col: 5, row: 3 } },
      defaultConfig,
    );
    expect(plan.ok).toBe(true);
  });
});

describe('camp du tireur', () => {
  it('un tireur hostile ne lit que les contacts du camp hostile', () => {
    const base = missionOf({
      map: openSea(16, 9),
      units: [makeUnit('f', 'friend', 'fremm', { col: 5, row: 4 })],
    });
    const m = {
      ...base,
      friendContacts: [identified('C-1', { col: 5, row: 4 }, 'f')],
      hostileContacts: [identified('C-1', { col: 5, row: 4 }, 'f')],
      units: [...base.units, makeUnit('h', 'hostile', 'frigate_da', { col: 2, row: 4 })],
    };
    const hostile = m.units[1]!;
    expect(planShot(m, hostile, 'missile', { contactId: 'C-1' }, defaultConfig).ok).toBe(true);
    expect(
      planShot(
        { ...m, hostileContacts: [] },
        hostile,
        'missile',
        { contactId: 'C-1' },
        defaultConfig,
      ),
    ).toEqual({ ok: false, reason: 'UNKNOWN_CONTACT' });
  });
});
