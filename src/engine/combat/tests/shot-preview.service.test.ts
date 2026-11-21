import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../../config/game.config';
import { previewShot, shotCandidates } from '../shot-preview.service';
import { identified, makeUnit, missionOf, openSea, suspectZone } from './combat-fixture.model';

const SHOOTER_AT = { col: 2, row: 4 };

function shooter() {
  return makeUnit('f', 'friend', 'fremm', SHOOTER_AT);
}

/** Mer ouverte, le tireur, des unités en plus et les contacts donnés du camp ami. */
function mission(
  contacts: ReturnType<typeof identified>[],
  extra: ReturnType<typeof makeUnit>[] = [],
) {
  const base = missionOf({
    map: openSea(16, 9),
    units: [shooter(), makeUnit('h', 'hostile', 'frigate_da', { col: 5, row: 4 }), ...extra],
  });
  return { ...base, friendContacts: contacts, nextContactNumber: contacts.length + 1 };
}

describe('avertissements de ligne de tir (AB-45)', () => {
  it('missile : avertit si une unité alliée occupe la case visée', () => {
    const ally = makeUnit('ally', 'friend', 'frigate_asm', { col: 6, row: 4 });
    const m = mission([identified('C-1', { col: 6, row: 4 }, 'h')], [ally]);
    const preview = previewShot(m, shooter(), 'missile', { contactId: 'C-1' }, defaultConfig);
    expect(preview).toMatchObject({ ok: true, warnings: ['FRIENDLY_ON_AIMED_HEX'] });
  });

  it('missile : une unité alliée seulement survolée n’avertit pas', () => {
    const ally = makeUnit('ally', 'friend', 'frigate_asm', { col: 4, row: 4 });
    const m = mission([identified('C-1', { col: 6, row: 4 }, 'h')], [ally]);
    const preview = previewShot(m, shooter(), 'missile', { contactId: 'C-1' }, defaultConfig);
    expect(preview).toMatchObject({ ok: true, warnings: [] });
  });

  it('torpille : avertit si la route croise une unité alliée', () => {
    const ally = makeUnit('ally', 'friend', 'frigate_asm', { col: 3, row: 4 });
    const m = mission([identified('C-1', { col: 5, row: 4 }, 'h')], [ally]);
    const preview = previewShot(m, shooter(), 'torpedo', { contactId: 'C-1' }, defaultConfig);
    expect(preview).toMatchObject({ ok: true, warnings: ['FRIENDLY_ON_ROUTE'] });
  });

  it('un navire hostile non identifié sur la route ne déclenche aucun avertissement', () => {
    const hidden = makeUnit('hidden', 'hostile', 'frigate_da', { col: 3, row: 4 });
    const m = mission([identified('C-1', { col: 5, row: 4 }, 'h')], [hidden]);
    const preview = previewShot(m, shooter(), 'torpedo', { contactId: 'C-1' }, defaultConfig);
    expect(preview).toMatchObject({ ok: true, warnings: [] });
  });

  it('ne renvoie jamais le navire désigné et relaie le motif de refus', () => {
    const m = mission([identified('C-1', { col: 5, row: 4 }, 'h', 'submarine')]);
    const accepted = previewShot(m, shooter(), 'torpedo', { contactId: 'C-1' }, defaultConfig);
    expect(JSON.stringify(accepted)).not.toContain('"h"');
    expect(previewShot(m, shooter(), 'missile', { contactId: 'C-1' }, defaultConfig)).toEqual({
      ok: false,
      reason: 'INCOMPATIBLE_TARGET',
    });
  });
});

describe('cibles que le tireur peut viser (AB-46)', () => {
  it('retient un contact identifié du cycle courant à portée, pas un ancien ni un trop lointain', () => {
    const m = {
      ...mission([
        identified('C-1', { col: 6, row: 4 }, 'h'),
        identified('C-2', { col: 7, row: 4 }, 'h', 'frigate', 0),
        identified('C-3', { col: 14, row: 4 }, 'h'),
      ]),
      cycle: 1,
    };
    const candidates = shotCandidates(m, shooter(), 'missile', defaultConfig);
    expect(candidates).toEqual([
      { contactId: 'C-1', kind: 'identified', hexes: [{ col: 6, row: 4 }] },
    ]);
  });

  it('ne propose pas un missile contre un sous-marin identifié, mais une torpille oui', () => {
    const m = mission([identified('C-1', { col: 4, row: 4 }, 'h', 'submarine')]);
    expect(shotCandidates(m, shooter(), 'missile', defaultConfig)).toEqual([]);
    expect(shotCandidates(m, shooter(), 'torpedo', defaultConfig)).toHaveLength(1);
  });

  it('pour une zone, ne garde que les hexagones à portée', () => {
    const zone = [
      { col: 4, row: 4 },
      { col: 5, row: 4 },
      { col: 12, row: 4 },
    ];
    const m = mission([suspectZone('C-1', zone, 'h')]);
    const [candidate] = shotCandidates(m, shooter(), 'torpedo', defaultConfig);
    expect(candidate).toMatchObject({ kind: 'suspect' });
    expect(candidate?.hexes).toEqual([
      { col: 4, row: 4 },
      { col: 5, row: 4 },
    ]);
  });
});
