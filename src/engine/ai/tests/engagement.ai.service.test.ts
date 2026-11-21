import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../../config/game.config';
import type { MissionState } from '../../core/game.types';
import { fire, sweep } from '../../core/unit-commands.service';
import { observeHostile } from '../../detection/observation.service';
import { identified, suspectZone } from '../../combat/tests/combat-fixture.model';
import { chooseShot, isOutOfAmmo, plannedWeapon } from '../engagement.ai.service';
import { intentOf } from '../objective.ai.service';
import { reactToFriendActivation } from '../turn.ai.service';
import { chooseHostileUnit } from '../unit-selection.ai.service';
import { makeUnit, missionOf, openSea } from './mission-fixture.model';

type Contacts = ReturnType<typeof identified>[];

/** Lutte navale en mer ouverte : l'unité hostile `h` tire sur les contacts donnés de l'IA. */
function mission(
  contacts: Contacts,
  shipClass: 'fremm' | 'submarine' = 'fremm',
  extra: ReturnType<typeof makeUnit>[] = [],
): MissionState {
  const base = missionOf({
    map: openSea(20, 9),
    units: [
      makeUnit('h', 'hostile', shipClass, { col: 10, row: 4 }),
      makeUnit('f', 'friend', 'fremm', { col: 2, row: 4 }),
      ...extra,
    ],
  });
  return { ...base, hostileContacts: contacts, nextHostileContactNumber: contacts.length + 1 };
}

function shotOf(m: MissionState) {
  const observation = observeHostile(m);
  const unit = observation.units.find((u) => u.id === 'h')!;
  return chooseShot(m, observation, unit, defaultConfig);
}

describe('arme voulue contre un contact (AB-50)', () => {
  const frigate = { ...identified('C-1', { col: 4, row: 4 }, 'f'), stale: false };
  const submarine = { ...identified('C-2', { col: 4, row: 4 }, 'f', 'submarine'), stale: false };
  const fremm = makeUnit('h', 'hostile', 'fremm', { col: 10, row: 4 });

  it('missile contre un navire de surface, torpille contre un sous-marin', () => {
    expect(plannedWeapon(fremm, frigate as never)).toBe('missile');
    expect(plannedWeapon(fremm, submarine as never)).toBe('torpedo');
  });

  it('aucune arme de repli : un sous-marin sans missile ne tire pas sur une frégate', () => {
    const sub = makeUnit('h', 'hostile', 'submarine', { col: 10, row: 4 });
    expect(plannedWeapon(sub, frigate as never)).toBeNull();
    expect(isOutOfAmmo(sub)).toBe(false);
    expect(isOutOfAmmo({ ...sub, torpedoes: 0 })).toBe(true);
  });

  it('jamais sur une zone ni sur un contact ancien', () => {
    const zone = { kind: 'suspect', id: 'C-3', cycle: 1, zone: [{ col: 4, row: 4 }] };
    const stale = { ...frigate, stale: true };
    expect(plannedWeapon(fremm, zone as never)).toBeNull();
    expect(plannedWeapon(fremm, stale as never)).toBeNull();
  });
});

describe('choix du tir de l’IA (AB-50)', () => {
  it('tire sur le contact identifié du cycle courant à portée', () => {
    const m = mission([identified('C-1', { col: 5, row: 4 }, 'f')]);
    expect(shotOf(m)).toEqual({ weapon: 'missile', target: { contactId: 'C-1' } });
  });

  it('préfère le contact le plus proche', () => {
    const m = mission([
      identified('C-1', { col: 4, row: 3 }, 'f'),
      identified('C-2', { col: 6, row: 4 }, 'f'),
    ]);
    expect(shotOf(m)?.target).toEqual({ contactId: 'C-2' });
  });

  it('ne tire pas sur une zone suspecte', () => {
    const m = mission([suspectZone('C-1', [{ col: 5, row: 4 }], 'f')]);
    expect(shotOf(m)).toBeNull();
  });

  it('ne tire pas hors de portée', () => {
    const m = mission([identified('C-1', { col: 0, row: 8 }, 'f')]);
    expect(shotOf(m)).toBeNull();
  });

  it('ne tire pas sur un contact ancien', () => {
    const m = { ...mission([identified('C-1', { col: 5, row: 4 }, 'f', 'frigate', 1)]), cycle: 2 };
    expect(shotOf(m)).toBeNull();
  });

  it('applique l’avertissement du joueur : pas de torpille dont la route croise un allié de l’IA', () => {
    const ally = makeUnit('h2', 'hostile', 'frigate_da', { col: 9, row: 4 });
    const m = mission([identified('C-1', { col: 8, row: 4 }, 'f', 'submarine')], 'fremm', [ally]);
    expect(shotOf(m)).toBeNull();
  });

  it('applique l’avertissement du joueur : pas de missile sur la case d’un allié de l’IA', () => {
    const ally = makeUnit('h2', 'hostile', 'frigate_da', { col: 6, row: 4 });
    const m = mission([identified('C-1', { col: 6, row: 4 }, 'f')], 'fremm', [ally]);
    expect(shotOf(m)).toBeNull();
  });

  it('ne tire pas une seconde fois quand son action spéciale est consommée', () => {
    const m = mission([identified('C-1', { col: 5, row: 4 }, 'f')]);
    const swept = sweep(m, { unitId: 'h' }, defaultConfig, 'hostile');
    expect(swept.ok && shotOf(swept.state as MissionState)).toBeFalsy();
  });
});

describe('mêmes règles pour le joueur et l’IA', () => {
  it('une action spéciale par activation : après un balayage, le tir est refusé aux deux camps', () => {
    const base = mission([identified('C-1', { col: 5, row: 4 }, 'f')]);
    const m: MissionState = {
      ...base,
      friendContacts: [identified('C-1', { col: 9, row: 4 }, 'h')],
      nextContactNumber: 2,
    };
    for (const [unitId, actor] of [
      ['h', 'hostile'],
      ['f', 'friend'],
    ] as const) {
      const swept = sweep(m, { unitId }, defaultConfig, actor);
      expect(swept.ok).toBe(true);
      const shot = fire(
        swept.ok ? (swept.state as MissionState) : m,
        { unitId, weapon: 'missile', target: { contactId: 'C-1' } },
        defaultConfig,
        actor,
      );
      expect(shot).toMatchObject({ ok: false, error: { code: 'SPECIAL_ACTION_USED' } });
    }
  });
});

describe('arrêt à la portée de l’arme (révise AB-42 3)', () => {
  it('s’arrête à la portée du missile (8) devant une frégate identifiée', () => {
    const m = mission([identified('C-1', { col: 0, row: 4 }, 'f')]);
    const observation = observeHostile(m);
    const unit = observation.units.find((u) => u.id === 'h')!;
    expect(intentOf(observation, unit, defaultConfig).holdDistance).toBe(8);
  });

  it('s’arrête à la portée de la torpille (3) devant un sous-marin identifié', () => {
    const m = mission([identified('C-1', { col: 0, row: 4 }, 'f', 'submarine')]);
    const observation = observeHostile(m);
    const unit = observation.units.find((u) => u.id === 'h')!;
    expect(intentOf(observation, unit, defaultConfig).holdDistance).toBe(3);
  });

  it('garde la portée de balayage devant une zone, ou sans arme utilisable', () => {
    const sweepRange = defaultConfig.ships.fremm.detection!.sweepRange;
    const zone = observeHostile(mission([suspectZone('C-1', [{ col: 0, row: 4 }], 'f')]));
    const unit = zone.units.find((u) => u.id === 'h')!;
    expect(intentOf(zone, unit, defaultConfig).holdDistance).toBe(sweepRange);
    const dry = { ...unit, missiles: 0 };
    const frigate = observeHostile(mission([identified('C-1', { col: 0, row: 4 }, 'f')]));
    expect(intentOf(frigate, dry, defaultConfig).holdDistance).toBe(sweepRange);
  });
});

describe('une unité sans munitions détecte pour les autres (AB-50)', () => {
  it('sans contact, elle est activée avant les unités armées', () => {
    const dry = {
      ...makeUnit('h-dry', 'hostile', 'frigate_da', { col: 10, row: 8 }),
      missiles: 0,
      torpedoes: 0,
    };
    const armed = makeUnit('h-armed', 'hostile', 'frigate_da', { col: 10, row: 0 });
    const m = missionOf({
      map: openSea(20, 9),
      units: [makeUnit('f', 'friend', 'fremm', { col: 2, row: 4 }), armed, dry],
    });
    expect(chooseHostileUnit(observeHostile(m), defaultConfig)?.id).toBe('h-dry');
  });

  it('avec un contact exploitable, le rang ne change rien : l’ordre habituel s’applique', () => {
    const dry = {
      ...makeUnit('h-dry', 'hostile', 'frigate_da', { col: 10, row: 8 }),
      missiles: 0,
      torpedoes: 0,
    };
    const armed = makeUnit('h-armed', 'hostile', 'frigate_da', { col: 10, row: 0 });
    const base = missionOf({
      map: openSea(20, 9),
      units: [makeUnit('f', 'friend', 'fremm', { col: 2, row: 4 }), armed, dry],
    });
    const m = {
      ...base,
      hostileContacts: [identified('C-1', { col: 2, row: 4 }, 'f')],
      nextHostileContactNumber: 2,
    };
    expect(chooseHostileUnit(observeHostile(m), defaultConfig)?.id).toBe('h-armed');
  });
});

describe('tir pendant la réaction ennemie', () => {
  it('lance un projectile hostile, consomme le stock et ne produit aucun événement pour le joueur', () => {
    const m = mission([identified('C-1', { col: 5, row: 4 }, 'f')]);
    const after = reactToFriendActivation(m, defaultConfig);
    expect(after.projectiles).toHaveLength(1);
    expect(after.projectiles[0]).toMatchObject({ side: 'hostile', weapon: 'missile' });
    expect(after.units.find((u) => u.id === 'h')!.missiles).toBe(3);
    expect(after.units.find((u) => u.id === 'h')!.specialActionUsed).toBe(true);
  });
});
