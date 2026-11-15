import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../../config/game.config';
import type { Contact } from '../../detection/contact.types';
import { observeHostile } from '../../detection/observation.service';
import type { Hex } from '../../map/hex.service';
import { chooseHostileUnit } from '../unit-selection.ai.service';
import { makeUnit, missionOf, openSea } from './mission-fixture.model';

const MAP = openSea(35, 35);
const GOAL: Hex = { col: 33, row: 17 };

/** Escorte : trois unités ennemies, la deuxième déjà à son poste près de B. */
function units() {
  return [
    makeUnit('hostile-a', 'hostile', 'fremm', { col: 10, row: 5 }),
    makeUnit('hostile-b', 'hostile', 'frigate_da', { col: 32, row: 17 }),
    makeUnit('hostile-c', 'hostile', 'submarine', { col: 10, row: 28 }),
  ];
}

function choose(all = units(), hostileContacts: Contact[] = []): string | undefined {
  const mission = {
    ...missionOf({ map: MAP, units: all, kind: 'escort', goal: GOAL }),
    hostileContacts,
  };
  return chooseHostileUnit(observeHostile(mission), defaultConfig)?.id;
}

describe("choix de l'unité ennemie (AB-38)", () => {
  it("sans contact, la première (par identifiant) qui n'est pas encore à son poste", () => {
    expect(choose()).toBe('hostile-a');
  });

  it('une unité déjà en place passe après celles qui ont encore à avancer', () => {
    const all = units().filter((u) => u.id !== 'hostile-a');
    expect(choose(all)).toBe('hostile-c');
    expect(choose([all[0]!])).toBe('hostile-b');
  });

  it('ne choisit que les unités disponibles', () => {
    const all = units().map((u) =>
      u.id === 'hostile-a' ? { ...u, activation: 'activated' as const } : u,
    );
    expect(choose(all)).toBe('hostile-c');
    expect(choose(all.map((u) => ({ ...u, activation: 'activated' as const })))).toBeUndefined();
  });

  it("avec un contact, l'unité qui l'a déjà à portée de balayage passe après celles qui doivent l'approcher", () => {
    // Le contact est à 2 hexagones de hostile-c (portée de balayage 4) : elle n'a plus rien à approcher.
    const contact: Contact = {
      kind: 'suspect',
      id: 'C-1',
      cycle: 1,
      zone: [{ col: 12, row: 28 }],
      source: 'friend-x',
    };
    const all = units().filter((u) => u.id !== 'hostile-a');
    expect(choose(all, [contact])).toBe('hostile-b');
    expect(choose(units(), [contact])).toBe('hostile-a');
  });

  it('départage par identifiant, indépendamment de l’ordre des unités', () => {
    expect(choose(units().reverse())).toBe('hostile-a');
  });
});
