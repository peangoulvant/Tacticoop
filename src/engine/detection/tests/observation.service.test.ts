import { defaultConfig, type ShipClass } from '../../config/game.config';
import type { MissionState } from '../../core/game.types';
import type { Hex } from '../../map/hex.service';
import { initialSetup } from '../../missions/setup.service';
import { createUnit, type Side, type Unit } from '../../units/unit.model';
import type { Contact } from '../contact.types';
import { observeFriend, observeHostile } from '../observation.service';

function make(id: string, side: Side, shipClass: ShipClass, position: Hex): Unit {
  return createUnit(id, side, shipClass, position, defaultConfig, {
    ammoFactor: 1,
    movementCap: null,
  });
}

/** Mission avec deux unités alliées et deux unités hostiles : aucune n'est détectée. */
function missionWithHostiles(): MissionState {
  return {
    status: 'in_progress',
    setup: initialSetup(),
    map: { width: 9, height: 9, terrain: Array(81).fill('sea') },
    start: { col: 0, row: 4 },
    goal: { col: 8, row: 4 },
    cycle: 2,
    carrierNavigation: { mode: 'continue', waypoint: null, orderUsed: false },
    outcome: null,
    friendContacts: [],
    nextContactNumber: 1,
    rngState: 1,
    units: [
      make('carrier', 'friend', 'carrier', { col: 0, row: 4 }),
      make('a', 'friend', 'fremm', { col: 2, row: 2 }),
      make('hostile-1', 'hostile', 'frigate_da', { col: 5, row: 4 }),
      make('hostile-2', 'hostile', 'submarine', { col: 6, row: 6 }),
    ],
  };
}

describe('projection du camp ami : contacts', () => {
  const zone = [{ col: 5, row: 4 }];
  const contact: Contact = { kind: 'suspect', id: 'C-1', cycle: 1, zone, source: 'hostile-1' };

  it('transmet les contacts du camp ami, sans unité hostile', () => {
    const observation = observeFriend({ ...missionWithHostiles(), friendContacts: [contact] });
    expect(observation.contacts).toEqual([{ kind: 'suspect', id: 'C-1', cycle: 1, zone }]);
    expect(observation.units.every((u) => u.side === 'friend')).toBe(true);
  });

  it('retire la cible interne de chaque contact et marque « ancien » un identifié antérieur au cycle', () => {
    const identified = (id: string, cycle: number): Contact => ({
      kind: 'identified',
      id,
      cycle,
      targetType: 'submarine',
      position: { col: 6, row: 6 },
      source: 'hostile-2',
    });
    const observation = observeFriend({
      ...missionWithHostiles(),
      cycle: 3,
      friendContacts: [contact, identified('C-2', 2), identified('C-3', 3)],
    });
    expect(JSON.stringify(observation)).not.toContain('source');
    expect(JSON.stringify(observation)).not.toContain('hostile-');
    expect(observation.contacts).toMatchObject([
      { id: 'C-1' },
      { id: 'C-2', stale: true },
      { id: 'C-3', stale: false },
    ]);
    // Une zone passive n'est jamais « ancienne » (AB-27).
    expect(observation.contacts[0]).not.toHaveProperty('stale');
  });

  it("n'expose aucun contact quand il n'y en a pas", () => {
    expect(observeFriend(missionWithHostiles()).contacts).toEqual([]);
  });
});

describe('projection du camp ami', () => {
  it("ne contient que les unités amies : aucune unité hostile n'est détectée", () => {
    const observation = observeFriend(missionWithHostiles());
    expect(observation.units.map((u) => u.id)).toEqual(['carrier', 'a']);
  });

  it("ne révèle ni l'identifiant ni la position d'une unité hostile, où que ce soit", () => {
    const text = JSON.stringify(observeFriend(missionWithHostiles()));
    expect(text).not.toContain('hostile-1');
    expect(text).not.toContain('hostile-2');
    expect(text).not.toContain('"side":"hostile"');
  });

  it('garde ce que le joueur connaît : carte, points A et B, cycle, navigation', () => {
    const mission = missionWithHostiles();
    const observation = observeFriend(mission);
    expect(observation).toMatchObject({
      map: mission.map,
      start: mission.start,
      goal: mission.goal,
      cycle: 2,
      outcome: null,
      carrierNavigation: mission.carrierNavigation,
    });
  });

  it("ne modifie pas l'état réel", () => {
    const mission = missionWithHostiles();
    const before = structuredClone(mission);
    observeFriend(mission);
    expect(mission).toEqual(before);
  });
});

describe('projection du camp hostile', () => {
  it('ne contient que les unités hostiles : jamais les positions réelles des alliés', () => {
    const observation = observeHostile(missionWithHostiles());
    expect(observation.units.map((u) => u.id)).toEqual(['hostile-1', 'hostile-2']);
    const text = JSON.stringify(observation);
    expect(text).not.toContain('"id":"a"');
    expect(text).not.toContain('"id":"carrier"');
  });
});
