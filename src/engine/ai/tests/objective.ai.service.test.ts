import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../../config/game.config';
import type { Contact } from '../../detection/contact.types';
import { observeHostile } from '../../detection/observation.service';
import { intentOf, exploitableContacts } from '../objective.ai.service';
import { makeUnit, missionOf, openSea } from './mission-fixture.model';

const WIDTH = 35;
const HEIGHT = 35;

function hostiles() {
  return [
    makeUnit('hostile-a', 'hostile', 'fremm', { col: 30, row: 5 }),
    makeUnit('hostile-b', 'hostile', 'frigate_da', { col: 30, row: 17 }),
    makeUnit('hostile-c', 'hostile', 'submarine', { col: 30, row: 28 }),
  ];
}

function suspect(id: string, col: number): Contact {
  return { kind: 'suspect', id, cycle: 1, zone: [{ col, row: 17 }], source: 'friend-x' };
}

function identified(id: string, cycle: number): Contact {
  return {
    kind: 'identified',
    id,
    cycle,
    targetType: 'carrier',
    position: { col: 10, row: 17 },
    source: 'friend-carrier',
  };
}

describe("objectif de l'IA (AB-37, AB-40)", () => {
  it('lutte navale : station au centre de la carte, unités étalées en hauteur', () => {
    const units = hostiles();
    const observation = observeHostile(
      missionOf({ map: openSea(WIDTH, HEIGHT), units, kind: 'naval_combat' }),
    );
    const anchors = units.map((u) => intentOf(observation, u, defaultConfig).anchor);
    expect(anchors.map((a) => a.col)).toEqual([17, 17, 17]);
    expect(anchors.map((a) => a.row)).toEqual([8, 17, 26]);
    expect(intentOf(observation, units[0]!, defaultConfig)).toMatchObject({
      source: 'objective',
      holdDistance: defaultConfig.ships.fremm.detection!.watchRange,
    });
  });

  it('lutte navale : aucune ancre ne dépend du point de départ allié, ignoré de l’IA (AB-37)', () => {
    const units = hostiles();
    const at = (start: { col: number; row: number }) =>
      observeHostile({
        ...missionOf({ map: openSea(WIDTH, HEIGHT), units, kind: 'naval_combat' }),
        start,
      });
    const anchorsFor = (start: { col: number; row: number }) =>
      units.map((u) => intentOf(at(start), u, defaultConfig).anchor);
    expect(anchorsFor({ col: 2, row: 17 })).toEqual(anchorsFor({ col: 30, row: 2 }));
  });

  it('escorte : le point B, connu de l’IA', () => {
    const units = hostiles();
    const goal = { col: 33, row: 17 };
    const observation = observeHostile(
      missionOf({ map: openSea(WIDTH, HEIGHT), units, kind: 'escort', goal }),
    );
    expect(intentOf(observation, units[0]!, defaultConfig).anchor).toEqual(goal);
  });

  it('un contact exploitable passe avant l’objectif, jusqu’à la portée de balayage', () => {
    const units = hostiles();
    const mission = {
      ...missionOf({ map: openSea(WIDTH, HEIGHT), units }),
      hostileContacts: [suspect('C-1', 12)],
    };
    const intent = intentOf(observeHostile(mission), units[0]!, defaultConfig);
    expect(intent).toEqual({
      source: 'contact',
      anchor: { col: 12, row: 17 },
      holdDistance: defaultConfig.ships.fremm.detection!.sweepRange,
    });
  });

  it('un contact identifié ancien n’est pas exploité (SF-06 §6)', () => {
    const units = hostiles();
    const mission = {
      ...missionOf({ map: openSea(WIDTH, HEIGHT), units, cycle: 3 }),
      hostileContacts: [identified('C-1', 2)],
    };
    const observation = observeHostile(mission);
    expect(exploitableContacts(observation)).toEqual([]);
    expect(intentOf(observation, units[0]!, defaultConfig).source).toBe('objective');
  });

  it('un contact identifié de ce cycle est exploité', () => {
    const units = hostiles();
    const mission = {
      ...missionOf({ map: openSea(WIDTH, HEIGHT), units, cycle: 3 }),
      hostileContacts: [identified('C-1', 3)],
    };
    expect(exploitableContacts(observeHostile(mission))).toHaveLength(1);
  });
});
