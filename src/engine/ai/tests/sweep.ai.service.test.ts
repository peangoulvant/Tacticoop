import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../../config/game.config';
import type { Contact } from '../../detection/contact.types';
import { observeHostile } from '../../detection/observation.service';
import { shouldSweep } from '../sweep.ai.service';
import { makeUnit, missionOf, openSea } from './mission-fixture.model';

const CONTACT: Contact = {
  kind: 'suspect',
  id: 'C-1',
  cycle: 1,
  zone: [{ col: 3, row: 3 }],
  source: 'friend-x',
};

function decide(patch: {
  cycle?: number;
  swept?: number;
  contacts?: Contact[];
  ship?: 'fremm' | 'carrier';
}) {
  const base = makeUnit('hostile-a', 'hostile', patch.ship ?? 'fremm', { col: 5, row: 5 });
  const unit =
    patch.swept === undefined ? base : { ...base, lastSpecialActionCycle: { sweep: patch.swept } };
  const mission = {
    ...missionOf({ map: openSea(12, 12), units: [unit], cycle: patch.cycle ?? 1 }),
    hostileContacts: patch.contacts ?? [],
  };
  const observation = observeHostile(mission);
  return shouldSweep(observation, observation.units[0]!, defaultConfig);
}

describe("politique de balayage de l'IA (AB-40, PROPOSÉ)", () => {
  it('balaie quand l’action est disponible et qu’aucun contact valide n’existe', () => {
    expect(decide({})).toBe(true);
  });

  it('ne balaie pas si un contact valide existe', () => {
    expect(decide({ contacts: [CONTACT] })).toBe(false);
  });

  it('ne balaie pas pendant la récupération (un cycle après le balayage)', () => {
    expect(decide({ cycle: 4, swept: 3 })).toBe(false);
    expect(decide({ cycle: 5, swept: 3 })).toBe(true);
  });

  it('ne balaie pas sans capteurs : les mêmes conditions que le joueur', () => {
    expect(decide({ ship: 'carrier' })).toBe(false);
  });
});
